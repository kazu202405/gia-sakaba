// 既に会員の人に出す「段の変更」画面。
//
// いまは オンライン → リアル の1方向だけ。下げる方向（リアル→オンライン）は
// 解約と同じ扱いになり得るので、運営が個別に対応する。
// 招待・プレミアムは非公開なので、ここには出さない。

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { upgradeToReal } from "../_actions-change";
import { SubmitButton } from "@/components/submit-button";

export function PlanChangePage({ currentPlan }: { currentPlan: "online" }) {
  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
            <span>MEMBERSHIP</span>
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
          </div>
          <h1 className="font-serif text-[26px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4] mt-5">
            プランの変更
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            現在は <strong>オンライン会員</strong>（月 ¥4,980）でご利用中です。
          </p>
        </header>

        <div className="rounded-2xl border border-[var(--gia-deck-line)] bg-white p-6 sm:p-7">
          <p className="text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.3em]">
            REAL MEMBER
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-serif text-[30px] font-bold text-[var(--gia-deck-navy)]">
              ¥7,980
            </span>
            <span className="text-xs text-[var(--gia-deck-sub)]">/ 月（税別）</span>
          </div>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-2 leading-relaxed">
            オフラインの場に参加する
          </p>

          <div className="mt-5 pt-5 border-t border-[var(--gia-deck-line)]">
            <p className="text-[12px] text-[var(--gia-deck-sub)] mb-2.5">
              オンライン会員のすべて＋
            </p>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--gia-deck-gold)]" aria-hidden />
              <span className="text-sm text-[var(--gia-deck-ink)] leading-relaxed">
                オフライン会・研究会への参加
              </span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[var(--gia-deck-line)]">
            {/* 解約させずに price を差し替えるので、契約は途切れない。
                差額の扱いを先に書いておく（後から知ると不信になる）。 */}
            <p className="text-[12px] text-[var(--gia-deck-sub)] leading-relaxed mb-4">
              いまのご契約はそのまま、プランだけ切り替わります。解約やお申し込みの
              し直しは不要です。差額は日割りで計算され、次回のご請求に反映されます。
            </p>
            <form action={upgradeToReal}>
              <SubmitButton
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-4 px-6 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors disabled:opacity-60"
                pendingText="変更しています..."
              >
                リアル会員に変更する
                <ArrowRight className="w-4 h-4" />
              </SubmitButton>
            </form>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/members/app/mypage"
            className="text-sm text-[var(--gia-deck-sub)] hover:text-[var(--gia-deck-navy)] no-underline border-b border-[var(--gia-deck-line)] pb-0.5"
          >
            マイページに戻る
          </Link>
        </div>

        <p className="text-center text-[11px] text-[var(--gia-deck-sub)] mt-6 leading-[1.8]">
          プランを下げたい場合・解約したい場合は、お手数ですが主催者までご連絡ください。
        </p>
      </div>
    </div>
  );
}
