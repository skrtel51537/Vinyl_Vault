/*
 * Vinyl Vault service worker (GitHub Pages build only). vite.config.ts fills in the
 * file list and the version at build time; see pwa/build.ts.
 *
 * - Install: stores every file of this version, so the app opens without a connection.
 * - Update: a new version waits until the app asks for it (the "Update" banner), then
 *   replaces the old files. Collection data lives in IndexedDB and is never touched here.
 * - Apple covers (*.mzstatic.com) are kept as they are seen, so they show offline too.
 *   Cover searches (itunes.apple.com) always go to the network.
 */
const PRECACHE = __PRECACHE__;
const CACHE_VERSION = __CACHE_VERSION__;

const APP_CACHE_PREFIX = 'vinyl-vault-app-';
const APP_CACHE = APP_CACHE_PREFIX + CACHE_VERSION;
const COVER_CACHE = 'vinyl-vault-covers';
// Each cover is stored at the sizes the app shows (~5-80 KB each): roughly 50 MB at most.
const MAX_COVERS = 1500;

const scoped = (file) => new URL(file, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) =>
      // Bypass the HTTP cache: a stale index.html would point at files of another version.
      cache.addAll(PRECACHE.map((file) => new Request(scoped(file), { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(APP_CACHE_PREFIX) && name !== APP_CACHE)
      .map((name) => caches.delete(name)));
    // Take over the open app on the very first install, so it works offline right away.
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const fromAppCache = async (request) => {
  const cache = await caches.open(APP_CACHE);
  return (await cache.match(request)) || fetch(request);
};

const serveApp = async () => {
  const cache = await caches.open(APP_CACHE);
  return (await cache.match(scoped('index.html'))) || fetch(scoped('index.html'));
};

const trimCovers = async (cache) => {
  const keys = await cache.keys();
  // Keys come back in insertion order: drop the oldest.
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_COVERS)).map((key) => cache.delete(key)));
};

const serveCover = async (request) => {
  const cache = await caches.open(COVER_CACHE);
  const cached = await cache.match(request.url);
  if (cached) return cached;
  let response;
  try {
    // A CORS response can be stored at its real size and still serves plain <img> tags.
    response = await fetch(request.url, { mode: 'cors', credentials: 'omit' });
  } catch {
    return fetch(request);
  }
  if (response.ok) {
    await cache.put(request.url, response.clone());
    await trimCovers(cache);
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.href.startsWith(self.registration.scope)) {
    // The app has a single page: every navigation inside it gets index.html.
    event.respondWith(request.mode === 'navigate' ? serveApp() : fromAppCache(request));
  } else if (url.protocol === 'https:' && url.hostname.endsWith('.mzstatic.com')) {
    event.respondWith(serveCover(request));
  }
});
