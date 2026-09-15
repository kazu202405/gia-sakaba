"use client";

// /admin 配下のタブ共通の Editorial 装飾。
// AI Clone admin（app/admin/ai-clone/page.tsx）のトーンに合わせる：
//   - Navy #1c3550 / Gold #c08a3e / Noto Serif JP
//   - 上部の細いゴールドバー、letter-spacing で格式
// muted Editorial パレットでステータス色を扱う（操作識別性は残す）。

import { ReactNode } from "react";

export const NAVY = "#1c3550";
export const GOLD = "#c08a3e";
export const GOLD_SOFT = "#e8c98a";

interface EditorialHeaderProps {
  eyebrow?: string; // 例: "GIA / ADMISSIONS"（空 / 未指定なら非表示）
  title: string;
  description?: string;
  right?: ReactNode; // ヘッダー右側のメタ情報
  /**
   * モバイルでも right をタイトルと同じ行の右端に置く（小さな単一ボタン向け）。
   * 既定 false＝モバイルは縦積み（chip 群が複数あるページ向け）。
   */
  rightOnTitleRow?: boolean;
}

export function EditorialHeader({
  eyebrow,
  title,
  description,
  right,
  rightOnTitleRow = false,
}: EditorialHeaderProps) {
  const eyebrowEl = eyebrow ? (
    <div className="flex items-baseline gap-3 mb-2">
      <span className="text-[11px] tracking-[0.3em] text-[#c08a3e] font-semibold">
        {eyebrow}
      </span>
    </div>
  ) : null;
  const titleEl = (
    <h1 className="font-serif text-2xl sm:text-[28px] font-bold tracking-[0.04em] text-[#1c3550] leading-snug">
      {title}
    </h1>
  );
  const descriptionEl = description ? (
    <p className="text-[13px] sm:text-sm text-gray-600 mt-3 leading-relaxed max-w-2xl">
      {description}
    </p>
  ) : null;

  return (
    <header className="bg-white border border-gray-200 rounded-md px-6 py-7 sm:px-8 sm:py-8 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute top-0 left-0 h-1 w-24 bg-[#c08a3e]"
      />
      {rightOnTitleRow ? (
        // タイトルと right を常に同じ行（タイトル左・right 右端）、説明は下に全幅。
        // 単一の小さなボタンを右上に置きたいページ向け。
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {eyebrowEl}
              {titleEl}
            </div>
            {right && <div className="flex-shrink-0">{right}</div>}
          </div>
          {descriptionEl}
        </>
      ) : (
        // 既定：モバイルは縦積み、sm 以上は左右2カラム。
        // 右側 chip 群が flex-shrink-0 のため、横並びだとモバイルで
        // 本文カラムが極小になる（タイトル1文字幅まで縮む）問題を回避。
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            {eyebrowEl}
            {titleEl}
            {descriptionEl}
          </div>
          {right && <div className="sm:flex-shrink-0">{right}</div>}
        </div>
      )}
    </header>
  );
}

// ステータス色のマッピング（muted Editorial 寄せ）。
// pending=amber-soft / approved=sage / rejected=clay / cancelled=neutral
export type AdmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export const statusStyle: Record<
  AdmissionStatus,
  { label: string; bg: string; border: string; text: string; dotBg: string }
> = {
  pending: {
    label: "審査中",
    bg: "bg-[#fbf3e3]",
    border: "border-[#e6d3a3]",
    text: "text-[#8a5a1c]",
    dotBg: "bg-[#c08a3e]",
  },
  approved: {
    label: "承認済み",
    bg: "bg-[#e9efe9]",
    border: "border-[#c5d3c8]",
    text: "text-[#3d6651]",
    dotBg: "bg-[#3d6651]",
  },
  rejected: {
    label: "却下",
    bg: "bg-[#f3e9e6]",
    border: "border-[#d8c4be]",
    text: "text-[#8a4538]",
    dotBg: "bg-[#8a4538]",
  },
  cancelled: {
    label: "キャンセル",
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-500",
    dotBg: "bg-gray-400",
  },
};

interface StatusBadgeProps {
  status: AdmissionStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = statusStyle[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dotBg}`} />
      {s.label}
    </span>
  );
}

// 会員ティア（applicants.tier）。
// 2026-05-11 ラベル整理:
//   tentative=仮会員 / registered=無料会員 / paid=有料会員
// 昇格ルール:
//   tentative → registered: プロフィール必須項目が全て埋まったら自動
//   registered → paid: Stripe サブスク active
//   paid → tentative: サブスク解約で revert（registered には戻さない）
export type Tier = "tentative" | "registered" | "paid";

export const tierStyle: Record<
  Tier,
  { label: string; bg: string; border: string; text: string; dotBg: string }
> = {
  tentative: {
    label: "仮会員",
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-600",
    dotBg: "bg-gray-400",
  },
  registered: {
    label: "無料会員",
    bg: "bg-[#f1f4f7]",
    border: "border-[#d6dde5]",
    text: "text-[#1c3550]",
    dotBg: "bg-[#1c3550]",
  },
  paid: {
    label: "有料会員",
    bg: "bg-[#fbf3e3]",
    border: "border-[#e6d3a3]",
    text: "text-[#8a5a1c]",
    dotBg: "bg-[#c08a3e]",
  },
};

export function TierBadge({ tier }: { tier: Tier }) {
  const t = tierStyle[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${t.bg} ${t.border} ${t.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${t.dotBg}`} />
      {t.label}
    </span>
  );
}

// ヘッダー横に出すメトリクスのチップ。
interface MetricChipProps {
  count: number;
  label: string;
  tone?: "navy" | "gold";
}

export function MetricChip({ count, label, tone = "navy" }: MetricChipProps) {
  const isGold = tone === "gold";
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
        isGold
          ? "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c]"
          : "bg-[#f1f4f7] border-[#d6dde5] text-[#1c3550]"
      }`}
    >
      <span className="text-sm">{count}</span>
      <span>{label}</span>
    </span>
  );
}

// 共通の Editorial カード。
// variant:
//   - "panel" (default): スタット・ヘッダー・グラフ等。rounded-md（柔らかめ）
//   - "row":  リスト1行（申請・会員・招待・ログ）。rounded-sm（シャープ）
// 影は付けない。"上は呼吸、下は規律" の階層感（2026-05-10 確定）。
export function EditorialCard({
  className = "",
  variant = "panel",
  children,
}: {
  className?: string;
  variant?: "panel" | "row";
  children: ReactNode;
}) {
  const radius = variant === "row" ? "rounded-sm" : "rounded-md";
  return (
    <div
      className={`bg-white border border-gray-200 ${radius} ${className}`}
    >
      {children}
    </div>
  );
}

// クリックでフィルタを切り替えるスタットカード。
// 選択中は navy 内側ボーダーで強調（rounded-md / panel スタイル）。
interface FilterStatCardProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  // ステータス・tier に対応するドット色（オプション）。
  dotColorClass?: string;
}

export function FilterStatCard({
  label,
  count,
  active,
  onClick,
  dotColorClass,
}: FilterStatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-white border rounded-md p-4 transition-all ${
        active
          ? "border-[#1c3550] bg-[#fafbfc] shadow-[inset_0_0_0_1px_#1c3550]"
          : "border-gray-200 hover:border-gray-300"
      }`}
      aria-pressed={active}
    >
      <div className="flex items-baseline gap-2 mb-1">
        {dotColorClass && (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
        )}
        <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase">
          {label}
        </span>
      </div>
      <p className="font-serif text-3xl font-bold text-[#1c3550] tracking-tight">
        {count}
      </p>
    </button>
  );
}

// 日付表示ユーティリティは "use client" バウンダリ越しに使えるよう
// ./EditorialFormat.ts に切り出してある（Server Component から呼ぶ場合は
// 直接 EditorialFormat から import する）。
