// ZoneVault Service Worker
const CACHE_NAME = 'zonevault-v1.0.0';
const STATIC_CACHE = 'zonevault-static-v1.0.0';
const DATA_CACHE = 'zonevault-data-v1.0.0';

const STATIC_FILES = [
    '/',
    '/zonevault.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    '/zones-data.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
    console.log('🔧 Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => {
            console.log('📦 Caching static files...');
            return cache.addAll(STATIC_FILES);
        }).then(() => {
            console.log('✅ Service Worker installed successfully');
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker activated');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    
    if (request.method === 'GET') {
        // Cache map tiles for offline use
        if (request.url.includes('tile.openstreetmap.org') || 
            request.url.includes('basemaps.cartocdn.com') ||
            request.url.includes('server.arcgisonline.com') ||
            request.url.includes('stamen-tiles.a.ssl.fastly.net')) {
            event.respondWith(
                caches.open(DATA_CACHE).then(cache =>
                    cache.match(request).then(response => {
                        if (response) {
                            return response;
                        }
                        return fetch(request).then(response => {
                            if (response && response.ok) {
                                cache.put(request, response.clone());
                            }
                            return response;
                        }).catch(() => {
                            // Return a placeholder tile if offline
                            return new Response('', { status: 204 });
                        });
                    })
                )
            );
            return;
        }
        if (isStaticFile(request.url)) {
            event.respondWith(
                caches.match(request).then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(request).then(response => {
                        if (response.ok) {
                            const responseClone = response.clone();
                            caches.open(STATIC_CACHE).then(cache => {
                                cache.put(request, responseClone);
                            });
                        }
                        return response;
                    });
                })
            );
        }
        else if (isDataFile(request.url)) {
            event.respondWith(
                fetch(request).then(response => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(DATA_CACHE).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                }).catch(() => {
                    return caches.match(request).then(response => {
                        if (response) {
                            return response;
                        }
                        return new Response(
                            JSON.stringify({ error: 'Offline' }),
                            { status: 503, headers: { 'Content-Type': 'application/json' } }
                        );
                    });
                })
            );
        }
    }
});

function isStaticFile(url) {
    return url.includes('zonevault.html') || 
           url.includes('styles.css') || 
           url.includes('script.js') ||
           url.includes('manifest.json') ||
           url === self.location.origin + '/' ||
           url === self.location.origin + '/index.html';
}

function isDataFile(url) {
    return url.includes('zones-data.json');
}

console.log('🔧 ZoneVault Service Worker loaded');
