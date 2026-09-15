"use client";

// /upgrade ページの「決済へ進む」ボタン（クライアント）。
// /api/stripe/checkout を叩いて Checkout Session URL を取得し、window.location.href で遷移。

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

export function UpgradeCta() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      // 空ボディでも throw しないよう catch で null に倒す
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string; unavailable?: boolean }
        | null;
      if (data?.url) {
        // Stripe Checkout の URL に遷移（戻ってきた時に loading 残らないよう、ここで loading は維持）
        window.location.href = data.url;
        return;
      }
      if (data?.unavailable) {
        setError(
          "ただいま決済の準備中です。お手数ですが主催者LINEへお問い合わせください。",
        );
      } else {
        setError(
          data?.error || "ただいま決済を開始できませんでした。時間をおいてお試しください。",
        );
      }
      setLoading(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "通信エラーが発生しました",
      );
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-4 px-6 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200 disabled:opacity-60 disabled:cursor-wait"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Checkout に移動中...
          </>
        ) : (
          <>
            決済へ進む
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      {error && (
        <p className="mt-3 text-xs text-rose-600 leading-relaxed">{error}</p>
      )}
    </div>
  );
}
