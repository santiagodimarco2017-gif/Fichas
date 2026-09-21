// sw.js — service worker offline-first para la app shell.
// Los datos clínicos viven en IndexedDB (no en el cache del SW); acá solo se
// cachea el código y los recursos estáticos para que la app abra sin red.
const CACHE_NAME = 'ficha-clinica-fcv-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/utils.js',
  './js/db.js',
  './js/ficha-fcv.js',
  './js/render.js',
  './js/whatsapp.js',
  './js/pdf-export.js',
  './js/cloud-sync.js',
  './js/calendar-sync.js',
  './js/app.js',
  '../icon-192.png.png',
  '../icon-512.png.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // los POST a webhooks/OAuth nunca pasan por el cache

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && req.url.startsWith(self.location.origin)) {
            const copia = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
