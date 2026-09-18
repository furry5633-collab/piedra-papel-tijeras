/* Service Worker — Piedra, Papel o Tijeras
   - Páginas: network-first (siempre la última versión; caché de respaldo sin conexión)
   - Assets: cache-first
   - Las peticiones a otros orígenes (telemetría) pasan de largo. */
'use strict';
const CACHE = 'ppt-v1';
const CORE = [
  './',
  './index.html',
  './stats.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()).catch(()=>{})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // deja pasar telemetría y demás

  const isPage = url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage){
    e.respondWith(
      fetch(req).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
        return r;
      }).catch(() => caches.match(req, { ignoreSearch:true }).then(hit => hit || caches.match('./index.html')))
    );
  } else {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
        return r;
      }).catch(() => caches.match('./index.html')))
    );
  }
});
