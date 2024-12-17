/* sw.js */

const CACHE_NAME = 'quadra-calc-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles/styles.css',
    '/scripts/app.js',
    '/manifest.json',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png',
    // Add any other assets you want to cache
];

// Install Event - Cache Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log('Caching Assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
        .catch((error) => {
            console.error('Error caching assets:', error);
        })
    );
});

// Activate Event - Clean Old Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
        .then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((cacheName) => {
                    return cacheName !== CACHE_NAME;
                }).map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

// Fetch Event - Serve Cached Assets
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
        .then((response) => {
            // Return cached asset if found
            if (response) {
                return response;
            }
            // Fetch from network if not cached
            return fetch(event.request)
                .then((fetchResponse) => {
                    // Cache the new asset
                    return caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, fetchResponse.clone());
                            return fetchResponse;
                        });
                })
                .catch(() => {
                    // Fallback behavior if both cache and network fail
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
        })
    );
});
