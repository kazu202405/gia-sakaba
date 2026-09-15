"use client";

// Stripe Customer Portal を開くボタン。
// POST /api/stripe/portal で billingPortal.sessions.create された URL を受け取り、
// window.location.href で Stripe ホスト型ポータルに遷移する。
//
// 表示バリアント:
//   primary  = 課金アクティブ時の主導線（navy 塗りボタン）
//   text     = サブ用（解約済みでも customer_id があれば履歴閲覧したいケース）

import { useState } from "react";
import { AlertCircle, CreditCard, Loader2 } from "lucide-react";

interface ManageSalonButtonProps {
  variant?: "primary" | "text";
}

export function ManageSalonButton({
  variant = "primary",
}: ManageSalonButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "ポータルを開けませんでした");
      }
      window.location.href = data.url;
      // 遷移するので loading は解除しない（戻り時は別ページ）
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
      setLoading(false);
    }
  };

  const isPrimary = variant === "primary";

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          isPrimary
            ? "inline-flex items-center gap-2 rounded-xl bg-[var(--gia-navy)] hover:bg-[var(--gia-navy)]/90 text-white text-sm font-semibold py-2.5 px-5 transition-colors tracking-[0.02em] disabled:opacity-50 disabled:cursor-not-allowed"
            : "inline-flex items-center gap-1.5 text-xs text-[var(--gia-navy)] underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
        }
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            ポータルへ移動中...
          </>
        ) : (
          <>
            <CreditCard className={isPrimary ? "w-4 h-4" : "w-3.5 h-3.5"} />
            {/* ⚠️ 探す人の言葉で書く。「サブスクリプション管理」だけだと、
                解約したい人がこのボタンに辿り着けない（2026-09-06、
                「どこからも退会できない」と言われて分かった）。 */}
            {isPrimary
              ? "お支払い・ご解約の管理"
              : "Stripe ポータルで履歴を見る"}
          </>
        )}
      </button>
      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
