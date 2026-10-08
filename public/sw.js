// ── Service Worker para Web Push Notifications ─────────────────────────────
// Este archivo DEBE estar en /public para ser accesible desde la raíz del dominio.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Paves Medellín", body: event.data.text() };
  }

  const title = data.title || "Paves Medellín";
  const options = {
    body: data.body || "Tienes una actualización de tu pedido.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: data.tag || "paves-notif",
    requireInteraction: false,
    data: data.url ? { url: data.url } : {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Al hacer clic en la notificación, abre la app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
