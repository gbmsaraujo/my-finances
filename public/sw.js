const CACHE_NAME = 'my-finances-v2';
const ASSETS_TO_CACHE = [
    '/manifest.json',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key)),
                ),
            ),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    // Never cache Next.js runtime/chunks to avoid ChunkLoadError after deploy/restart.
    if (url.pathname.startsWith('/_next/')) {
        return;
    }

    // Avoid stale app shell/styles by not caching document navigations.
    if (event.request.mode === 'navigate') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                return cached;
            }

            if (!ASSETS_TO_CACHE.includes(url.pathname)) {
                return fetch(event.request);
            }

            return fetch(event.request).then((response) => {
                const cloned = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, cloned);
                });
                return response;
            });
        }),
    );
});
