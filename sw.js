/* Enhanced Service Worker for quadra.calc PWA v3.2 */

const CACHE_NAME = 'quadra-calc-v3.2';
const STATIC_CACHE = 'quadra-calc-static-v3.2';
const DYNAMIC_CACHE = 'quadra-calc-dynamic-v3.2';

// Assets to cache immediately (critical resources)
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles/styles.css',
    './scripts/app.js',
    './manifest.json',
    './assets/icons/icon-192x192.png',
    './assets/icons/icon-512x512.png',
    // Google Fonts (fallback)
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Assets to cache on demand
const RUNTIME_CACHE_URLS = [
    'https://fonts.gstatic.com/',
    'https://fonts.googleapis.com/'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('📦 Caching static assets...');
                return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {
                    cache: 'no-cache'
                })));
            })
            .then(() => {
                console.log('✅ Static assets cached successfully');
                return self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                console.error('❌ Failed to cache assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old caches
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker activated and ready');
                return self.clients.claim(); // Take control immediately
            })
    );
});

// Fetch event - serve cached content with fallbacks
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Handle different types of requests
    if (url.origin === location.origin) {
        // Same-origin requests (app files)
        event.respondWith(handleAppRequest(event.request));
    } else if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
        // Google Fonts
        event.respondWith(handleFontRequest(event.request));
    } else {
        // External requests
        event.respondWith(handleExternalRequest(event.request));
    }
});

// Handle app file requests (cache-first strategy)
async function handleAppRequest(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('📋 Serving from cache:', request.url);
            return cachedResponse;
        }
        
        // If not in cache, fetch from network
        console.log('🌐 Fetching from network:', request.url);
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('❌ Request failed:', request.url, error);
        
        // Return offline fallback for HTML pages
        if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html') ||
                   new Response('App is offline', {
                       status: 503,
                       headers: { 'Content-Type': 'text/plain' }
                   });
        }
        
        throw error;
    }
}

// Handle Google Fonts (cache-first with long TTL)
async function handleFontRequest(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.warn('⚠️ Font request failed:', request.url);
        // Return empty response for failed font requests
        return new Response('', { status: 200 });
    }
}

// Handle external requests (network-first)
async function handleExternalRequest(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
        
    } catch (error) {
        console.warn('⚠️ External request failed:', request.url);
        
        // Try to serve from cache as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Background sync for analytics (if needed in future)
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // Placeholder for future background sync functionality
    console.log('📊 Performing background sync...');
}

// Push notifications (if needed in future)
self.addEventListener('push', (event) => {
    console.log('📨 Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New update available!',
        icon: './assets/icons/icon-192x192.png',
        badge: './assets/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '2'
        },
        actions: [
            {
                action: 'explore',
                title: 'Open App',
                icon: './assets/icons/icon-192x192.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: './assets/icons/icon-192x192.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('quadra.calc', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

// Cache size management
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_CLEANUP') {
        event.waitUntil(cleanupCaches());
    }
});

async function cleanupCaches() {
    console.log('🧹 Cleaning up caches...');
    
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    
    // Keep only the most recent 50 cached items
    if (requests.length > 50) {
        const requestsToDelete = requests.slice(0, requests.length - 50);
        await Promise.all(
            requestsToDelete.map(request => cache.delete(request))
        );
        console.log(`🗑️ Deleted ${requestsToDelete.length} old cache entries`);
    }
}

// Error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection in SW:', event.reason);
});

console.log('🎵 quadra.calc Service Worker v3.2 loaded successfully!');