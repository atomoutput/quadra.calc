/* sw.js */

// Define a cache name with versioning
const CACHE_NAME = 'quadra-calc-cache-v1';

// Assets to cache during the installation
const ASSETS_TO_CACHE = [
    './index.html',
    './styles/styles.css',
    './scripts/app.js',
    './manifest.json',
    './assets/icons/icon-192x192.png',
    './assets/icons/icon-512x512.png',
    // Add any additional assets here
];

/* Install Event - Cache Assets */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Caching app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

/* Activate Event - Clean Up Old Caches */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
        .then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

/* Fetch Event - Serve Cached Content When Offline */
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            if (response) {
                return response; // Return cached asset
            }
            return fetch(event.request)
                .then(fetchResponse => {
                    return caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, fetchResponse.clone());
                            return fetchResponse;
                        });
                })
                .catch(() => {
                    // Fallback content if both cache and network fail
                    if (event.request.destination === 'document') {
                        return caches.match('./index.html');
                    }
                });
        })
    );
});
