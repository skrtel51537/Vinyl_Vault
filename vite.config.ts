import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Strict policy for production builds: everything is bundled and self-hosted
// (scripts, styles, fonts), so no inline code, eval or third-party origins are needed.
const CSP_PRODUCTION = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data: https://*.mzstatic.com",
  "connect-src 'self' https://itunes.apple.com",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// The dev server needs inline scripts (React Fast Refresh preamble), injected
// <style> tags (Vite CSS HMR) and a WebSocket to the local HMR server.
const CSP_DEVELOPMENT = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https://*.mzstatic.com",
  "connect-src 'self' https://itunes.apple.com ws://localhost:*",
  "worker-src 'none'",
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

export default defineConfig({
  server: {
    port: 3000,
    host: 'localhost',
  },
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
});
