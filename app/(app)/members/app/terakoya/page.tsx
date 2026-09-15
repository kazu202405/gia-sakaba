// HIROGARUキャンパス 参加（アプリ内 決済導線）。
// ログイン後、LP（marketing）に戻らずその場で ¥11,000 の決済に進めるための確認ページ。
// サイドバー「キャンパスに参加」・マイページの参加CTA からここに来る。
// プロフィール未入力でも参加可（プロフィールは参加後に編集できる運用）。
//
// 認証: 未ログインは /login?next=/members/app/terakoya へ（戻ってこられるように next を付与）。
// 決済: <form action={startTerakoyaCheckout}> で Server Action を叩く。実体は checkout-core に集約
//       （ログイン済みなので、そのまま metadata.user_id 付きの Stripe Checkout に進む）。

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  Users,
  MessageCircle,
  ArrowRight,
  Crown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { startTerakoyaCheckout } from "@/components/salon/actions";
import { isActiveMember } from "@/lib/membership/plans";

export const dynamic = "force-dynamic";

export default async function TerakoyaJoinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/members/app/terakoya")}`);
  }

  // すでに会員なら決済に進ませず、参加済み表示にする（サイドバーでは非表示だが直URL対策）。
  const { data } = await supabase
    .from("applicants")
    .select("plan, tier")
    .eq("id", user.id)
    .single();
  // 判定は lib/membership/plans.ts に集約（新しい段の会員も既会員として扱う）
  const alreadyMember = isActiveMember(data);

  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      <div className="max-w-lg mx-auto px-5 sm:px-8 pt-10 sm:pt-12 pb-16">
        <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.34em] text-[var(--gia-teal)] uppercase mb-2.5">
          Members ─── Join
        </p>

        {alreadyMember ? (
          <div className="bg-white rounded-2xl border border-[var(--gia-gold)]/30 shadow-sm p-7 sm:p-9">
            <div className="flex items-center gap-2.5 mb-3">
              <Crown className="w-5 h-5 text-[var(--gia-gold)]" />
              <h1
                className="text-[var(--gia-navy)] tracking-[0.02em]"
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontSize: "clamp(19px, 2.4vw, 23px)",
                  fontWeight: 500,
                }}
              >
                すでに参加済みです
              </h1>
            </div>
            <p className="text-[13.5px] text-gray-600 leading-[1.95] mb-6">
              HIROGARUキャンパスの会員です。勉強会や交流の予定はセミナー一覧から確認できます。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/members/app/seminars"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-[var(--gia-navy)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                セミナーを見る
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/members/app/mypage"
                className="inline-flex items-center px-4 py-2.5 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                マイページ
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04),0_8px_24px_-12px_rgba(15,31,51,0.06)] overflow-hidden">
            <div className="h-px bg-gradient-to-r from-[var(--gia-gold)]/0 via-[var(--gia-gold)]/50 to-[var(--gia-gold)]/0" />
            <div className="p-7 sm:p-9">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[var(--gia-gold)]" />
                <span className="text-[11px] tracking-[0.25em] text-[var(--gia-gold)] font-semibold uppercase">
                  HIROGARUキャンパス
                </span>
              </div>

              <h1
                className="text-[var(--gia-navy)] tracking-[0.02em] mb-5"
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontSize: "clamp(20px, 2.6vw, 25px)",
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                キャンパスに参加する
              </h1>

              {/* 価格 */}
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-[13px] text-gray-500">月額</span>
                <span
                  className="text-[var(--gia-navy)] tracking-tight"
                  style={{
                    fontFamily: "'Noto Serif JP', serif",
                    fontSize: "34px",
                    fontWeight: 600,
                  }}
                >
                  11,000
                </span>
                <span className="text-[15px] text-[var(--gia-navy)] font-semibold">
                  円
                </span>
                <span className="text-[12px] text-gray-400 ml-1">税込</span>
              </div>
              <p className="text-[12px] text-gray-400 mb-6">
                ※ 飲食代は都度別途
              </p>

              {/* 内容 */}
              <ul className="space-y-3 mb-7">
                <Benefit
                  Icon={BookOpen}
                  title="月1回の勉強会・事例研究"
                  desc="うまくいっている企業の中身を学ぶ"
                />
                <Benefit
                  Icon={Users}
                  title="参加者同士の交流・紹介・協業"
                  desc="経営者・挑戦者とつながり、仕事を動かす"
                />
                <Benefit
                  Icon={MessageCircle}
                  title="壁打ち相談会・リアル懇親会"
                  desc="事業の悩みを持ち寄って一緒に考える"
                />
              </ul>

              {/* 決済ボタン（Server Action → Stripe Checkout） */}
              <form action={startTerakoyaCheckout}>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md bg-[var(--gia-navy)] text-white text-[15px] font-bold hover:opacity-90 transition-opacity"
                >
                  11,000円で参加する
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <p className="text-[11.5px] text-gray-400 leading-[1.9] mt-4 text-center">
                決済は Stripe の安全な画面で行われます。
                <br />
                プロフィールは参加後でも編集できます。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Benefit({
  Icon,
  title,
  desc,
}: {
  Icon: typeof BookOpen;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--gia-teal)]/[0.1] flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-[var(--gia-teal)]" />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-[var(--gia-navy)]">
          {title}
        </span>
        <span className="block text-[12.5px] text-gray-500 leading-[1.8]">
          {desc}
        </span>
      </span>
    </li>
  );
}
