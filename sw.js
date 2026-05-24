// Standard Repuestos GT — Service Worker
// v6: no cache. Every request goes directly to the network.

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Do not intercept. Let the browser request the latest files from the network.
});
