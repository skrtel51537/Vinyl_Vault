/**
 * Build-time helpers for the GitHub Pages build (`vite build --mode pages`), the only
 * build that is an installable PWA: the web app manifest and the service worker, which
 * gets the exact list of files to keep for offline use. Plain functions, so they can be
 * tested without running a build.
 */
import { createHash } from 'crypto';

/** Path the app is served from on GitHub Pages (https://<user>.github.io/<repo>/). */
export const PAGES_BASE = '/Vinyl_Vault/';

export const MANIFEST_FILE = 'manifest.webmanifest';
export const SERVICE_WORKER_FILE = 'sw.js';

/** Top bar colour ("dark wood shelf"): window title bar of the installed app. */
export const THEME_COLOR = '#451a03';
/** Light theme page colour (--color-page): splash screen while the app loads. */
export const BACKGROUND_COLOR = '#d6d3d1';

export interface WebManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: 'any' | 'maskable';
}

/**
 * The web app manifest. URLs are relative to the manifest itself, so they follow
 * whatever path the app is served from.
 */
export const webManifest = () => ({
  name: 'Vinyl Vault',
  short_name: 'Vinyl Vault',
  description: 'Your vinyl record collection, stored in your browser.',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: BACKGROUND_COLOR,
  theme_color: THEME_COLOR,
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ] satisfies WebManifestIcon[],
});

/**
 * Files the service worker stores when it installs: every built file (paths relative to
 * the app root, sorted, no duplicates) except the worker itself, source maps and
 * hidden files.
 */
export const precacheList = (files: string[]): string[] =>
  [...new Set(files.map(file => file.replace(/\\/g, '/')))]
    .filter(file => file !== SERVICE_WORKER_FILE
      && !file.endsWith('.map')
      && !file.split('/').some(part => part.startsWith('.')))
    .sort();

/**
 * Short fingerprint of the build. Identical builds give the same value, so the app
 * only offers an update when something actually changed.
 */
export const buildHash = (files: { name: string; content: string | Uint8Array }[]): string => {
  const hash = createHash('sha256');
  for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    hash.update(file.name).update('\0').update(file.content).update('\0');
  }
  return hash.digest('hex').slice(0, 12);
};

const PRECACHE_PLACEHOLDER = '__PRECACHE__';
const VERSION_PLACEHOLDER = '__CACHE_VERSION__';

/** Fill the service worker template with the file list and the cache version. */
export const renderServiceWorker = (template: string, files: string[], version: string): string => {
  for (const placeholder of [PRECACHE_PLACEHOLDER, VERSION_PLACEHOLDER]) {
    if (template.split(placeholder).length !== 2) {
      throw new Error(`Service worker template must contain ${placeholder} exactly once`);
    }
  }
  return template
    .replace(PRECACHE_PLACEHOLDER, () => JSON.stringify(files))
    .replace(VERSION_PLACEHOLDER, () => JSON.stringify(version));
};
