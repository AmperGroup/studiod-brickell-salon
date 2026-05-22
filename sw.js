const CACHE_NAME = 'studiod-cache-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/nfc-stack.webp',
  './assets/nfc-stand.webp',
  './assets/nfc-starter.webp'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static shell');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (e) => {
  // Bypass non-GET requests (e.g. POST chat requests)
  if (e.request.method !== 'GET') return;

  // Bypass external API calls that shouldn't be cached (like Gemini)
  if (e.request.url.includes('generativelanguage.googleapis.com') || e.request.url.includes('/api/chat')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request).then((networkResponse) => {
        // Cache new static/image resources on the fly
        if (
          networkResponse && 
          networkResponse.status === 200 && 
          (e.request.url.includes('/assets/') || e.request.url.includes('/wp-content/') || e.request.url.includes('.png') || e.request.url.includes('.jpg') || e.request.url.includes('.webp') || e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('fonts.gstatic.com'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for offline mode if resources are missing
        const acceptHeader = e.request.headers.get('accept');
        if (acceptHeader && acceptHeader.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
