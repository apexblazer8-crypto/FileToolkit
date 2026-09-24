/* FileToolkit app-shell cache. Uploaded documents and conversion API requests are never cached. */
const CACHE_VERSION = 'filetoolkit-pwa-v1';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/icon-maskable-512.png',
  '/pwa/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  // Do not force an update over an active conversion session.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('filetoolkit-pwa-') && key !== CACHE_VERSION)
        .map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML navigation: fetch the latest release online; show the cached app shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put('/', copy)));
        }
        return response;
      }).catch(async () => (await caches.match('/')) || Response.error())
    );
    return;
  }

  // Only immutable Vite assets and app-owned icons/manifest are cached.
  // In particular: no PDFs, office documents, generated downloads or API responses.
  const isAppAsset = url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/pwa/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.svg';
  if (!isAppAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)));
      }
      return response;
    }))
  );
});
