"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { SNS_BASE, SNS_PWA_ICON, SNS_PWA_NAME } from "@/lib/guild/look/sns-mock";

function subscribe(refresh: () => void) {
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}

function getAppMode() {
  if (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true) return "standalone";
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  return "browser";
}

function getPermission() {
  if (!window.isSecureContext || !("serviceWorker" in navigator) || !("Notification" in window) ||
      typeof ServiceWorkerRegistration === "undefined" ||
      typeof ServiceWorkerRegistration.prototype.showNotification !== "function") return "unavailable";
  return Notification.permission;
}

export function SnsNotificationSettings() {
  const mode = useSyncExternalStore(subscribe, getAppMode, () => null);
  const permission = useSyncExternalStore(subscribe, getPermission, () => null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function showTest() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      // iPhone は許可の確認をボタン操作から直接呼ぶ必要がある。
      const allowed = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (allowed !== "granted") return;

      const registration = await navigator.serviceWorker.register(SNS_BASE + "/notification-sw.js");
      const active = registration.active ? registration : await navigator.serviceWorker.ready;
      if (active.scope !== registration.scope) throw new Error("Unexpected notification scope");
      await active.showNotification(SNS_PWA_NAME, {
        body: "紹介依頼が届きました。タップすると「やり取り」が開きます。",
        icon: SNS_PWA_ICON + "-192.png",
        tag: "sns-mock-introduction",
      });
      setNotice("テスト通知を表示しました。端末の通知をタップしてください。");
    } catch {
      setError("テスト通知を表示できませんでした。ページを開き直してお試しください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sn-sec space-y-4" aria-labelledby="sn-notification-title">
      <div className="sn-sec-h">
        <h2 id="sn-notification-title">ホーム画面と通知</h2>
      </div>
      {mode === "ios" && (
        <p className="sn-meta">
          Safariの共有メニューで「ホーム画面に追加」を選びます。「ウェブアプリとして開く」が表示されたらオンにして追加し、アイコンから酒場を開いてください。
        </p>
      )}
      {mode === "browser" && (
        <p className="sn-meta">
          ブラウザーのメニューから「アプリをインストール」または「ホーム画面に追加」を選ぶと、アイコンから酒場を開けます。
        </p>
      )}
      {mode === "standalone" && <p className="sn-meta">ホーム画面アプリとして開いています。</p>}
      <p className="sn-meta">このモックでは、ボタンを押した端末で「紹介依頼が届きました」の通知を試せます。</p>
      {mode !== null && mode !== "ios" && (
        <>
          {permission === "unavailable" && <p className="sn-meta">このブラウザーの環境では通知を表示できません。</p>}
          {permission === "denied" && <p className="sn-meta">通知がブロックされています。端末やブラウザーの通知設定で許可してください。</p>}
          {(permission === "default" || permission === "granted") && (
            <button type="button" className="sn-btn sn-btn--main" disabled={busy} onClick={() => void showTest()}>
              <Bell aria-hidden />
              {busy ? "準備中…" : permission === "granted" ? "テスト通知を表示" : "通知を許可して試す"}
            </button>
          )}
        </>
      )}
      {notice && <p className="sn-meta" role="status">{notice}</p>}
      {error && <p className="sn-meta" role="alert">{error}</p>}
    </section>
  );
}
