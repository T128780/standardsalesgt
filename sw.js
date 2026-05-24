// Standard Repuestos GT — Service Worker
// v5: corrige envíos POST hacia Google Apps Script convirtiendo FormData a URLSearchParams.

const CACHE = 'srgt-v5';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyh_HwnZ_vEbboRVvcsJfMoq78K6LUMscsChJPwfQ7YsMzZ8V2Pj_Ia_b250ShbUfcI/exec';

const ASSETS = [
  '/',
  '/index.html',
  '/styles.css?v=12',
  '/app.js?v=14',
  '/catalogos.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Google Apps Script suele leer mejor application/x-www-form-urlencoded que multipart/form-data.
  // app.js envía FormData; aquí lo convertimos antes de que salga hacia Apps Script.
  if (event.request.method === 'POST' && event.request.url.startsWith(GOOGLE_SCRIPT_URL)) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.clone().formData();
        const params = new URLSearchParams();

        for (const [key, value] of formData.entries()) {
          params.append(key, typeof value === 'string' ? value : '');
        }

        return fetch(event.request.url, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: params
        });
      } catch (error) {
        return fetch(event.request);
      }
    })());
    return;
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || network;
    })
  );
});
