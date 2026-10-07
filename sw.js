const CACHE_NAME = 'dispensa-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Solo GET same-origin: non toccare Firestore, Auth, OpenFoodFacts o i CDN
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navigazioni (HTML): rete prima, così gli aggiornamenti arrivano subito, cache come fallback offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
        return response;
      }).catch(() => {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Asset statici: cache prima, rete come aggiornamento in background
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(() => {
        return cached;
      });

      return cached || fetched;
    })
  );
});
