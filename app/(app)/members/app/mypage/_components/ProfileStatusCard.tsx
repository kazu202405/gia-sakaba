// マイページ最上段のステータスカード。
//
// 「合格ライン（プロフィール全項目埋め → registered 自動昇格）」は廃止した。
// 登録の壁は無くし、代わりに「書いた分だけ、相手のことも見える」（相互開示）を動機装置とする。
// tier は課金区分の表示にのみ使う：
//   terakoya  : キャンパス会員バッジ（課金済みなので参加訴求は出さない）
//   paid      : 旧サロン/本会員バッジ（レガシー）
//   それ以外  : 無料メンバー共通カード（give&see の説明 + プロフィール編集 + キャンパス参加の誘い）
//               ※ tier が tentative でも registered でも同じ扱い（会員に半人前は無い）

import Link from "next/link";
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Pencil,
  Crown,
  Users,
  MessageCircle,
  BookOpen,
  Eye,
} from "lucide-react";

interface Props {
  tier: string;
  plan?: string | null; // 'salon' | 'pro' | 'terakoya' | null
  memberNo?: number | null; // 有料会員の通し番号（無料は null）
  completeness: number; // 0-100（プログレスバーの視覚表示にのみ使う）
  missingFieldLabels: string[]; // まだ書いていない項目ラベル
}

export function ProfileStatusCard({
  tier,
  plan,
  memberNo,
  completeness,
  missingFieldLabels,
}: Props) {
  // ── キャンパス会員（plan='terakoya'）: 会員バッジ。課金済みなので参加訴求は出さない ──
  if (plan === "terakoya") {
    return (
      <div className="rounded-2xl border border-[var(--gia-gold)]/30 bg-gradient-to-br from-[var(--gia-gold)]/[0.06] to-white px-5 sm:px-7 py-5 flex items-center gap-3">
        <Crown className="w-5 h-5 text-[var(--gia-gold)] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] tracking-[0.28em] text-[var(--gia-gold)] font-semibold uppercase">
            Member
          </p>
          <p className="font-[family-name:var(--font-mincho)] text-[15px] text-[var(--gia-navy)] mt-0.5">
            HIROGARUキャンパス会員
          </p>
          {memberNo != null && (
            <p className="text-[11px] text-gray-500 mt-0.5 tracking-[0.04em]">
              会員番号 No.{memberNo}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── paid: 会員バッジ（plan で 本会員/サロン会員 を出し分け） ──────────
  if (tier === "paid") {
    const isPro = plan === "pro";
    return (
      <div className="rounded-2xl border border-[var(--gia-gold)]/30 bg-gradient-to-br from-[var(--gia-gold)]/[0.06] to-white px-5 sm:px-7 py-5 flex items-center gap-3">
        <Crown className="w-5 h-5 text-[var(--gia-gold)] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] tracking-[0.28em] text-[var(--gia-gold)] font-semibold uppercase">
            {isPro ? "Full Member" : "Member"}
          </p>
          <p className="font-[family-name:var(--font-mincho)] text-[15px] text-[var(--gia-navy)] mt-0.5">
            {isPro ? "本会員（右腕AI込み）" : "一般会員（有料）"}
          </p>
          {memberNo != null && (
            <p className="text-[11px] text-gray-500 mt-0.5 tracking-[0.04em]">
              会員番号 No.{memberNo}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── 無料メンバー共通カード（tentative / registered 兼用） ──────────
  //   上段: give&see の説明 + プロフィール編集への誘導（プレッシャー文言は出さない）
  //   下段: キャンパス（有料）への参加の誘い
  const hasStarted = completeness > 0;
  return (
    <div className="rounded-2xl border border-[#e6d3a3] bg-gradient-to-br from-[#fbf3e3]/60 via-white to-white overflow-hidden">
      {/* 上段：give & see */}
      <div className="px-5 sm:px-7 py-5 sm:py-6">
        <div className="flex items-start gap-3 mb-4">
          <Eye className="w-5 h-5 text-[var(--gia-gold)] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] tracking-[0.28em] text-[var(--gia-gold)] font-semibold uppercase">
              Your Profile
            </p>
            <h3 className="font-[family-name:var(--font-mincho)] text-[17px] sm:text-[19px] text-[var(--gia-navy)] mt-1 tracking-[0.02em]">
              書いた分だけ、あなたのことが伝わります
            </h3>
            <p className="text-[12.5px] text-gray-600 mt-1.5 leading-[1.85]">
              プロフィールを書くほど、
              <span className="font-semibold text-[var(--gia-navy)]">
                あなたのこと
              </span>
              が場のみんなに伝わり、出会いやすくなります。
            </p>
          </div>
        </div>

        {/* プログレスバー（書き進み具合を視覚的にだけ示す。数値・残数は出さない） */}
        {hasStarted && (
          <div className="mb-4">
            <div className="h-2 rounded-full bg-[#fbf3e3] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--gia-gold)] to-[#d8a85a] transition-[width] duration-700 ease-out"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        )}

        {/* まだ書いていない項目（任意で開く。埋める義務ではなく"伸びしろ"として） */}
        {missingFieldLabels.length > 0 && (
          <details className="mb-4 text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-[var(--gia-navy)] select-none">
              まだ書いていない項目を見る
            </summary>
            <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-gray-700">
              {missingFieldLabels.map((label) => (
                <li key={label} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[var(--gia-gold)]" />
                  {label}
                </li>
              ))}
            </ul>
          </details>
        )}

        <Link
          href="/members/app/mypage/edit"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-[var(--gia-navy)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Pencil className="w-4 h-4" />
          {hasStarted ? "プロフィールを書き足す" : "プロフィールを書く"}
        </Link>
      </div>

      {/* 下段：キャンパス（有料）への参加の誘い ───────────────
          トグル（details）で畳む。畳んだ状態でも見出し＋月額＋一言は見えるので
          有料メニューの存在と価値は伝わり、詳細（特典3点＋参加ボタン）は開いた人だけに。
          サイドバー「キャンパスに参加」・スマホ下タブ「参加」でも常設導線があるため、
          マイページでは常時フル展開せず控えめにする。 */}
      <details className="group border-t border-[#e6d3a3]/60 bg-white/40">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden px-5 sm:px-7 py-4 flex items-center justify-between gap-3 select-none hover:bg-white/40 transition-colors">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.18em] text-[var(--gia-gold)] font-semibold uppercase">
              HIROGARUキャンパス
            </p>
            <p className="text-[13px] text-[var(--gia-navy)] font-semibold mt-0.5 whitespace-nowrap">
              月額11,000円（税込）
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              月1の勉強会・交流・懇親会。詳しく見る
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 sm:px-7 pb-5">
          <ul className="space-y-2.5 mb-5">
            <UnlockRow
              Icon={BookOpen}
              title="月1回の勉強会・事例研究"
              desc="うまくいっている企業の中身を学ぶ"
            />
            <UnlockRow
              Icon={Users}
              title="参加者同士の交流・紹介・協業"
              desc="経営者・挑戦者とつながり、仕事を動かす"
            />
            <UnlockRow
              Icon={MessageCircle}
              title="壁打ち相談会・リアル懇親会"
              desc="事業の悩みを持ち寄って一緒に考える"
            />
          </ul>
          <Link
            href="/members/app/terakoya"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md border border-[var(--gia-navy)]/20 bg-white text-[var(--gia-navy)] text-sm font-semibold hover:bg-white/70 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[var(--gia-gold)]" />
            HIROGARUキャンパスに参加する
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </details>
    </div>
  );
}

// ─── サブ：キャンパス特典の1行 ──────────────────────────────────
function UnlockRow({
  Icon,
  title,
  desc,
}: {
  Icon: typeof Users;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-[var(--gia-gold)] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--gia-navy)] leading-tight">
          {title}
        </p>
        <p className="text-[11.5px] text-gray-500 mt-0.5 leading-snug">
          {desc}
        </p>
      </div>
    </li>
  );
}
