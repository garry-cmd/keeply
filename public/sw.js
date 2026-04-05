// Keeply Service Worker — handles push notifications

self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });

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
