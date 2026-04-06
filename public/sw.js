const CACHE = 'ms2026-v1';
const STATIC = ['/style.css', '/app.js',
  'https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/css/flag-icons.min.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return; // API vždy ze sítě
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
