/* Only registered with scope /guild. Do not cache authenticated pages. */
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Show the generic notification. */ }
  const title = "GIAの酒場";
  const body = typeof payload.body === "string" ? payload.body : "新しいおしらせがあります";
  const href = typeof payload.href === "string" && payload.href.startsWith("/guild/")
    ? payload.href : "/guild/notifications";
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/gia-logo.png",
    badge: "/gia-logo.png",
    tag: typeof payload.tag === "string" ? payload.tag : undefined,
    data: { href },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/guild/notifications";
  event.waitUntil((async () => {
    const url = new URL(href, self.location.origin);
    if (url.origin !== self.location.origin || !url.pathname.startsWith("/guild/")) return;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const matching = windows.find((client) => new URL(client.url).origin === url.origin);
    if (matching) { await matching.navigate(url.href); await matching.focus(); }
    else await self.clients.openWindow(url.href);
  })());
});
