// 段の変更が完了したときの画面。
//
// 決済の完了画面（/upgrade/success）とは分ける。あちらは Stripe の
// checkout session を検証するが、段の変更は Checkout を通らない
// （既存のサブスクリプションの price を差し替えるだけ）ため、
// 検証すべき session_id が存在しない。

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { NOTE_URL } from "@/lib/company-note";

export const metadata = {
  title: "プランを変更しました | GIA",
  robots: { index: false, follow: false },
};

export default function PlanChangedPage() {
  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--gia-deck-gold)]/10 border border-[var(--gia-deck-gold)]/30 mb-6">
          <CheckCircle2 className="w-8 h-8 text-[var(--gia-deck-gold)]" aria-hidden />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[var(--gia-deck-navy)] tracking-[0.04em]">
          プランを変更しました
        </h1>
        <p className="mt-4 text-sm text-[var(--gia-deck-sub)] leading-[1.9]">
          リアル会員に切り替わりました。<br />
          数十秒以内に会員ステータスへ反映されます。<br />
          差額は日割りで計算され、次回のご請求に反映されます。
        </p>

        <div className="mt-10 space-y-3">
          <Link
            href="/members/app/mypage"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-3.5 px-6 hover:bg-[var(--gia-deck-navy-deep)] transition-colors"
          >
            マイページへ
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href={NOTE_URL}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-[var(--gia-deck-line)] text-[var(--gia-deck-navy)] text-sm font-semibold tracking-[0.08em] py-3.5 px-6 hover:bg-[var(--gia-deck-paper)] transition-colors"
          >
            Company Note を開く
          </a>
        </div>
      </div>
    </div>
  );
}
