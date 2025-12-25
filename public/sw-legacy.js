/**
 * Legacy (manual) Service Worker for TaxiCab PWA
 *
 * NOTE: This file is intentionally **not** registered by the app anymore.
 * We use the Workbox-generated `/sw.js` from `vite-plugin-pwa` (see `vite.config.mjs`)
 * so Firebase Messaging can be injected via `importScripts('/firebase-messaging-sw-integration.js')`.
 *
 * This legacy worker is kept only for reference / fallback.
 */

// Custom service worker - no Workbox dependency
// All caching and routing logic is handled manually

const CACHE_VERSION = '2.0.0';
const CACHE_NAME = `taxicab-app-v${CACHE_VERSION}`;
const INDEX_HTML = '/index.html';

// Install event
self.addEventListener('install', (event) => {
  console.log(`Service Worker v${CACHE_VERSION}: Installing...`);
  // Cache index.html for offline fallback
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.add(INDEX_HTML).catch((err) => {
        console.warn('Failed to cache index.html:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log(`Service Worker v${CACHE_VERSION}: Activating...`);
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control immediately
      self.clients.claim(),
    ])
  );
  console.log(`Service Worker v${CACHE_VERSION}: Activated`);
});

// Check if request is a navigation request
const isNavigationRequest = (request) => {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  );
};

// Check if request should be excluded from fallback
const shouldExcludeFromFallback = (url) => {
  const excludePatterns = [
    /^https?:\/\/.*\/api\//,
    /^https?:\/\/.*\/auth\//,
    /^https?:\/\/.*\/supabase\//,
    /\.(js|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i,
  ];
  return excludePatterns.some((pattern) => pattern.test(url));
};

// Fetch event with proper navigation fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip excluded paths (API, auth, static assets)
  if (shouldExcludeFromFallback(request.url)) {
    // For excluded paths, use network-only
    event.respondWith(
      fetch(request).catch((error) => {
        console.error('Fetch failed for excluded path:', request.url, error);
        return new Response('Resource unavailable', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
    );
    return;
  }

  // Handle navigation requests (SPA routes)
  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          // Try to fetch from network with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          // If response is OK, return it
          if (response && response.status === 200) {
            return response;
          }
          // If 404 or other error, fall back to index.html
          throw new Error('Navigation request failed, falling back to index.html');
        } catch (_error) {
          console.log('Navigation request failed, serving index.html:', request.url);
          // Fall back to cached index.html
          const cachedResponse = await caches.match(INDEX_HTML);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not cached, try to fetch it
          try {
            return await fetch(INDEX_HTML);
          } catch (_fetchError) {
            // Last resort: return a basic HTML response
            return new Response(
              `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Loading...</title></head><body><script>window.location.href="${INDEX_HTML}";</script></body></html>`,
              {
                headers: { 'Content-Type': 'text/html' },
              }
            );
          }
        }
      })()
    );
    return;
  }

  // For non-navigation requests, use network-first strategy
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        // Cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache).catch(() => {
              // Ignore cache errors
            });
          });
        }
        return response;
      } catch (error) {
        // Try cache as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If not in cache and network failed, return error
        console.error('Fetch failed and not in cache:', request.url, error);
        throw error;
      }
    })()
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


