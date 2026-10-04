/* Only registered with scope /guild. Do not cache authenticated pages. */
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Show the generic notification. */ }
  const title = "GIAの酒場";
  const body = typeof payload.body === "string" ? payload.body : "新しいおしらせがあります";
  const href = typeof payload.href === "string" && payload.href.startsWith("/guild/")
    ? payload.href : "/guild/notifications";
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body,
      icon: "/images/sakaba/guild-icon-20260929-192.png",
      badge: "/images/sakaba/guild-icon-20260929-192.png",
      tag: typeof payload.tag === "string" ? payload.tag : undefined,
      data: { href },
    }),
    updateAppBadge(),
  ]));
});

// ホーム画面のアイコンの数字を、サーバーが数えた未読の数に合わせる（アプリを閉じているときも通知で更新する）。
// 数え方は /api/guild/unread-count の1か所。読めなかったときは今の数字のまま（数字は飾りなので通知は止めない）
async function updateAppBadge() {
  try {
    if (typeof navigator.setAppBadge !== "function") return;
    const response = await fetch("/api/guild/unread-count", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return;
    const { total } = await response.json();
    if (typeof total !== "number") return;
    if (total > 0) await navigator.setAppBadge(total);
    else if (typeof navigator.clearAppBadge === "function") await navigator.clearAppBadge();
  } catch { /* 数字なしのまま */ }
}

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
