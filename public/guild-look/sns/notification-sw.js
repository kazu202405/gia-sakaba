// モックのテスト通知から、モックの「やり取り」を開く。
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const scope = new URL(self.registration.scope);
  const target = new URL("network", scope);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const mockWindow = windows.find((client) => {
      const url = new URL(client.url);
      return url.origin === scope.origin &&
        (url.pathname === scope.pathname.slice(0, -1) || url.pathname.startsWith(scope.pathname));
    });
    if (mockWindow) {
      const client = mockWindow.url === target.href ? mockWindow : await mockWindow.navigate(target.href);
      if (client) {
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(target.href);
  })());
});
