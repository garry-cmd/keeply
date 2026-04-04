// Keeply Service Worker
// Minimal implementation — caches shell for offline, passes all API/data requests through

const CACHE_NAME = 'keeply-v1';
const STATIC_ASSETS = [
  '/',
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function() {
        // Silently fail if assets aren't available yet
      });
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      // Clean up old caches
      caches.keys().then(function(keys) {
        return Promise.all(
          keys.filter(function(key) { return key !== CACHE_NAME; })
              .map(function(key) { return caches.delete(key); })
        );
      })
    ])
  );
});

self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  // Never cache: API routes, Supabase, Anthropic
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('anthropic.com') ||
    event.request.method !== 'GET'
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for everything else (ensures fresh data)
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});
