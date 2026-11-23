const CACHE_NAME = 'angaza-hub-v160';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.json'];
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((c) => Promise.allSettled(SHELL.map((u) => fetch(u, { cache: 'no-store' }).then((r) => r.ok && c.put(u, r))))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (e.request.mode === 'navigate') {
    const net = fetch(e.request).then((r) => {
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE_NAME).then((c) => { c.put('/', cp.clone()); c.put('/index.html', cp); }); }
      return r;
    });
    const timer = new Promise((_, rej) => setTimeout(rej, 3000));
    e.respondWith(Promise.race([net, timer]).catch(() => caches.match('/', { ignoreSearch: true }).then((r) => r || caches.match('/index.html', { ignoreSearch: true }))));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const fresh = fetch(e.request).then((r) => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE_NAME).then((c) => c.put(e.request, cp)); } return r; }).catch(() => cached);
      return cached || fresh;
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then((c) => c || fetch(e.request).then((r) => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE_NAME).then((ca) => ca.put(e.request, cp)); } return r; }).catch(() => new Response('', { status: 200 }))));
});
