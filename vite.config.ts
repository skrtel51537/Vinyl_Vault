import path from 'path';
import { readdirSync, readFileSync, statSync } from 'fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {
  buildHash, MANIFEST_FILE, PAGES_BASE, precacheList, renderServiceWorker, SERVICE_WORKER_FILE, THEME_COLOR, webManifest,
} from './pwa/build';

// Strict policy for production builds: everything is bundled and self-hosted
// (scripts, styles, fonts), so no inline code, eval or third-party origins are needed.
// The GitHub Pages build adds a service worker and a manifest, both from the app itself.
const CSP_PRODUCTION = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data: https://*.mzstatic.com",
  "connect-src 'self' https://itunes.apple.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// The dev server needs inline scripts (React Fast Refresh preamble), injected
// <style> tags (Vite CSS HMR), a WebSocket to the local HMR server, and a blob:
// SharedWorker that Vite's client uses to detect when a stopped server is back.
const CSP_DEVELOPMENT = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https://*.mzstatic.com",
  "connect-src 'self' https://itunes.apple.com ws://localhost:*",
  "worker-src blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const contentSecurityPolicy = (): Plugin => ({
  name: 'vinyl-vault-csp',
  transformIndexHtml(_html, ctx) {
    return [
      {
        tag: 'meta',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content: ctx.server ? CSP_DEVELOPMENT : CSP_PRODUCTION,
        },
        injectTo: 'head-prepend',
      },
    ];
  },
});

// package.json is the single source of truth for the version shown in the app.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/** Every file under `dir`, as paths relative to it. */
const listFiles = (dir: string): string[] =>
  (readdirSync(dir, { recursive: true }) as string[]).filter(file => statSync(path.join(dir, file)).isFile());

// Installable, offline-capable app for GitHub Pages: adds the manifest and a service
// worker that stores every built file. Only active in `vite build --mode pages`, so
// `npm run dev` and local builds never install a service worker on localhost.
const progressiveWebApp = (): Plugin => {
  let base = '/';
  let publicDir = '';
  return {
    name: 'vinyl-vault-pwa',
    apply: (_config, env) => env.command === 'build' && env.mode === 'pages',
    // After Vite's own plugins, so index.html is already in the bundle.
    enforce: 'post',
    configResolved(config) {
      base = config.base;
      publicDir = config.publicDir;
    },
    transformIndexHtml: () => [
      { tag: 'link', attrs: { rel: 'manifest', href: `${base}${MANIFEST_FILE}` }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'theme-color', content: THEME_COLOR }, injectTo: 'head' },
    ],
    generateBundle(_options, bundle) {
      const manifest = JSON.stringify(webManifest(), null, 2);
      this.emitFile({ type: 'asset', fileName: MANIFEST_FILE, source: manifest });

      const files = [
        ...Object.values(bundle).map(item => ({
          name: item.fileName,
          content: item.type === 'chunk' ? item.code : item.source,
        })),
        ...(publicDir ? listFiles(publicDir) : []).map(file => ({
          name: file.replace(/\\/g, '/'),
          content: readFileSync(path.join(publicDir, file)),
        })),
        { name: MANIFEST_FILE, content: manifest },
      ];
      const template = readFileSync(new URL('./pwa/sw.template.js', import.meta.url), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: SERVICE_WORKER_FILE,
        source: renderServiceWorker(template, precacheList(files.map(f => f.name)), `${version}-${buildHash(files)}`),
      });
    },
  };
};

export default defineConfig(({ command, mode }) => {
  const pages = mode === 'pages';
  return {
    base: pages ? PAGES_BASE : '/',
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __SERVICE_WORKER_URL__: JSON.stringify(pages && command === 'build' ? `${PAGES_BASE}${SERVICE_WORKER_FILE}` : ''),
    },
    server: {
      port: 3000,
      host: 'localhost',
      // Never move to another port: the collection is stored per address (localhost:3000).
      strictPort: true,
    },
    plugins: [react(), tailwindcss(), contentSecurityPolicy(), progressiveWebApp()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
  };
});
