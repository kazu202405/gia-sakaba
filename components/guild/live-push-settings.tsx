"use client";

import { useEffect, useState } from "react";
import { Window } from "./cards";
import { uiToast } from "@/lib/ui-dialog";

type Settings = {
  vapidPublicKey: string;
  endpoints: string[];
  preferences: { actions_enabled: boolean; deadlines_enabled: boolean };
};

function decodePublicKey(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const bytes = atob(base64);
  const array = new Uint8Array(new ArrayBuffer(bytes.length));
  for (let index = 0; index < bytes.length; index++) array[index] = bytes.charCodeAt(index);
  return array;
}

async function request(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method, headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "通信に失敗しました。");
  return result;
}

export function LivePushSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [supported, setSupported] = useState(true);
  const [needsHomeScreen, setNeedsHomeScreen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const compatible = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let active = true;
    void (async () => {
      try {
        const next = await request("/api/guild/push/subscriptions", "GET") as Settings;
        if (!active) return;
        setSettings(next);
        if (compatible) {
          const registration = await navigator.serviceWorker.getRegistration("/guild");
          const subscription = await registration?.pushManager.getSubscription();
          if (active) setEnabled(Boolean(subscription && next.endpoints.includes(subscription.endpoint)));
        }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "設定を読み込めませんでした。"); }
      finally {
        if (active) { setSupported(compatible); setNeedsHomeScreen(ios && !standalone); }
      }
    })();
    return () => { active = false; };
  }, []);

  async function enable() {
    if (!settings?.vapidPublicKey || busy) return;
    setBusy(true); setError("");
    try {
      // iOS requires the permission prompt to follow the user's tap directly.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("通知が許可されていません。端末の通知設定を確認してください。");
      await navigator.serviceWorker.register("/guild-sw.js", { scope: "/guild" });
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: decodePublicKey(settings.vapidPublicKey),
      });
      try {
        await request("/api/guild/push/subscriptions", "POST", { subscription: subscription.toJSON() });
      } catch (cause) {
        await subscription.unsubscribe();
        throw cause;
      }
      setEnabled(true);
      uiToast("この端末の通知をオンにしました");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "通知をオンにできませんでした。"); }
    finally { setBusy(false); }
  }

  async function disable() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/guild");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await request("/api/guild/push/subscriptions", "DELETE", { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setEnabled(false);
      uiToast("この端末の通知をオフにしました");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "通知をオフにできませんでした。"); }
    finally { setBusy(false); }
  }

  async function testOnThisDevice() {
    if (busy || !enabled) return;
    setBusy(true); setError("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/guild");
      if (!registration) throw new Error("通知の準備ができていません。ページを再読み込みしてください。");
      await registration.showNotification("GIAの酒場", {
        body: "この端末で通知を表示できました。",
        icon: "/gia-logo.png",
        data: { href: "/guild/notifications" },
      });
      uiToast("端末にテスト通知を表示しました");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "テスト通知を表示できませんでした。"); }
    finally { setBusy(false); }
  }

  async function changePreference(key: "actions_enabled" | "deadlines_enabled", value: boolean) {
    if (!settings || busy) return;
    setBusy(true); setError("");
    const preferences = { ...settings.preferences, [key]: value };
    try {
      await request("/api/guild/push/subscriptions", "PATCH", preferences);
      setSettings({ ...settings, preferences });
      uiToast("通知設定を保存しました");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "設定を保存できませんでした。"); }
    finally { setBusy(false); }
  }

  return <Window title="プッシュ通知">
    <p className="text-sm leading-relaxed">酒場を開いていないときも、関係するおしらせをこの端末へ届けます。通知はいつでもオフにできます。</p>
    {needsHomeScreen ? <div className="c-dashed-top mt-4 space-y-2 pt-4 text-sm leading-relaxed">
      <p>いまはSafariで開いているため、通知をオンにできません。</p>
      <p className="c-muted">画面下の共有ボタン（□↑）から「ホーム画面に追加」を選び、追加したアイコンから酒場を開いてください。そこで通知をオンにできます。</p>
    </div> :
      !supported ? <p className="c-muted mt-3 text-sm">このブラウザーはプッシュ通知に対応していません。</p> :
      <div className="mt-4 space-y-4">
        <button type="button" disabled={busy || !settings?.vapidPublicKey} onClick={() => void (enabled ? disable() : enable())}
          className="c-button-sub h-11 px-4 text-sm disabled:opacity-50">
          {busy ? "変更中…" : enabled ? "この端末の通知をオフにする" : "この端末の通知をオンにする"}
        </button>
        {enabled && <button type="button" disabled={busy} onClick={() => void testOnThisDevice()}
          className="c-button-sub ml-2 h-11 px-4 text-sm disabled:opacity-50">この端末で表示テスト</button>}
        {settings && <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={settings.preferences.actions_enabled} disabled={busy} onChange={(event) => void changePreference("actions_enabled", event.target.checked)} className="accent-[#1b2a41]" />申込・承認・紹介などのおしらせ</label>
          <label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={settings.preferences.deadlines_enabled} disabled={busy} onChange={(event) => void changePreference("deadlines_enabled", event.target.checked)} className="accent-[#1b2a41]" />担当タスク・参加中のプロジェクト・クエストの締切前日</label>
        </div>}
        <p className="c-muted text-xs">期限のおしらせは前日の午前9時以降に1回。クエストの期限は申込締切です。表示テストは端末だけの確認で、サーバーからの配信テストではありません。</p>
      </div>}
    {error && <p role="alert" className="mt-3 text-sm text-[#c62828]">{error}</p>}
  </Window>;
}
