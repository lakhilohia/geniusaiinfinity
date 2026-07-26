/*
 * CoserveU powered by studymadease — Service Worker
 * Enables true offline use. The whole app shell is cached on install so the
 * app opens and runs with NO network connection. Only the (optional) Google
 * Sheets audit sync ever needs the internet, and that is handled by the page,
 * not here.
 */
const CACHE = 'coserveu-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never cache the audit POST

  const url = new URL(req.url);
  // Never try to cache the Google Apps Script sync endpoint.
  if (url.hostname.includes('script.google.com')) return;

  // Cache-first for our own origin (app shell) so it works fully offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});
