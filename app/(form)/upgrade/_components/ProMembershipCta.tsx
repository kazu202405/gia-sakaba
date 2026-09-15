"use client";

// 本会員（¥4,980/月）の申込CTA。
// 有料・継続課金なので、決済に進む前に「自動更新・金額の明示」＋
// 特定商取引法に基づく表記/利用規約/プライバシーへのリンク＋同意チェックを置く。
// 同意するまで決済ボタンを無効化する。決済自体は server action に委譲する
// （呼び出し側が「どこから来たか」を bind 済み）。

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function ProMembershipCta({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="space-y-3">
      {/* 継続課金・金額の明示（定期購入トラブル防止） */}
      <p className="text-[12px] text-[var(--gia-deck-sub)] leading-relaxed">
        月額 ¥4,980（税別）／毎月自動更新。いつでも解約できます。お申し込み前に
        <a
          href="/tokushoho"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--gia-deck-navy)] underline underline-offset-2 mx-0.5 hover:opacity-80"
        >
          特定商取引法に基づく表記
        </a>
        ・
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--gia-deck-navy)] underline underline-offset-2 mx-0.5 hover:opacity-80"
        >
          利用規約
        </a>
        {/* プライバシーポリシーは一旦非表示（復活させる時はこのコメントを外す）
        ・
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--gia-deck-navy)] underline underline-offset-2 mx-0.5 hover:opacity-80"
        >
          プライバシーポリシー
        </a>
        */}
        をご確認ください。
      </p>

      {/* 同意チェック（必須） */}
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[var(--gia-deck-navy)]"
        />
        <span className="text-[13px] text-[var(--gia-deck-ink)] leading-relaxed">
          上記に同意して、月額課金を申し込みます
        </span>
      </label>

      {/* 決済ボタン（同意するまで無効） */}
      <form action={action}>
        <button
          type="submit"
          disabled={!agreed}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-4 px-6 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          オンライン会員になる
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
