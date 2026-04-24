// Keeply Service Worker — offline caching + push notifications
// v2 — April 2026 (cache bump to force shell refresh on existing installs)

var CACHE_NAME = 'keeply-shell-v2';

// App shell — pages and assets to cache on install
var SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ── Install: cache the app shell ─────────────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: network-first for API/auth, cache-first for shell assets ──────────
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Never cache: Supabase, Anthropic API, any POST/non-GET
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('anthropic.com')) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests (HTML): network first, fall back to cached '/'
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
          return response;
        })
        .catch(function() {
          return caches.match('/') || caches.match(e.request);
        })
    );
    return;
  }

  // Static assets (_next/static, icons, images): cache first, network fallback
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico'
  ) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(response) {
          if (response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network only (don't cache dynamic content)
});

self.addEventListener('push', function(e) {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch(err) { payload = { title: 'Keeply', body: e.data.text() }; }

  const options = {
    body:    payload.body    || '',
    icon:    payload.icon    || '/apple-icon.png',
    badge:   '/apple-icon.png',
    tag:     payload.tag     || 'keeply',
    data:    payload.data    || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };
  e.waitUntil(self.registration.showNotification(payload.title || 'Keeply', options));
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || 'https://keeply.boats/';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      // If app is already open — navigate it to the panel URL rather than just focusing
      for (const c of clients) {
        if (c.url.includes(self.location.origin)) {
          return c.focus().then(function() {
            // Navigate the existing window to the deep-link URL
            if ('navigate' in c) return c.navigate(url);
          });
        }
      }
      // App not open — open fresh at the panel URL
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
