// Service Worker para notificaciones Push de la PWA
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const baseUrl = self.location.origin;

  const title = data.title || 'Mobiliarium Permisos';
  const options = {
    body: data.body || 'Tienes una nueva notificación de permiso.',
    icon: data.icon || `${baseUrl}/LogoNegro.png`,
    badge: data.badge || `${baseUrl}/LogoNegro.png`,
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Registrar clic en la notificación para abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});