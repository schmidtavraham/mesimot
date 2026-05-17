// Service Worker — handles Web Push for Mesimot.
// Activated immediately, skips waiting, takes control on first install.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Receive a push message from the server.
self.addEventListener('push', (event) => {
  let payload = { title: 'משימות', body: 'התראה חדשה', taskId: null };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {
    if (event.data) payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: './icon.svg',
    badge: './icon.svg',
    tag: payload.taskId || undefined,
    data: { taskId: payload.taskId, url: payload.url ?? './' },
    dir: 'rtl',
    lang: 'he',
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Open the app when the user clicks the notification.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? './', self.registration.scope).href;

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.registration.scope)) {
        await c.focus();
        c.postMessage({ type: 'AUTOMATION_TASK_OPEN', taskId: event.notification.data?.taskId });
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
