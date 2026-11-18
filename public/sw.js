// PicShare Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Клик по системному уведомлению на Android и ПК
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если вкладка сайта уже открыта — фокусируемся на ней
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (event.notification.data) {
            client.postMessage({
              type: 'PICSHARE_NOTIFICATION_CLICK',
              data: event.notification.data
            });
          }
          return client.focus();
        }
      }
      // Если закрыта — открываем сайт
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Фоновые Push-уведомления (когда браузер полностью закрыт)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'Новое сообщение в PicShare';
    const options = {
      body: data.body || '',
      icon: data.icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'picshare_push',
      renotify: true,
      data: data.data || {}
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Ошибка в Service Worker push:', err);
  }
});
