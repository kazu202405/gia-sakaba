"use client";

// 会話ログ一覧の 1 行。
// クリック / タップで「本文をその場で展開（読み取り）」。編集は展開内の「編集」ボタンから。
// （以前は行クリック＝編集ダイアログだったが、読むのに編集に入るのが不便だったため変更）
// 削除ボタンは stopPropagation 済みなので展開トグルを誤発火しない。

import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { ConversationEditDialog } from "./ConversationEditDialog";
import { ConversationDeleteButton } from "./ConversationDeleteButton";
import type { PersonCandidate } from "./PersonMultiPicker";
import type { ConversationInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  conversationId: string;
  initial: ConversationInput;
  peopleCandidates: PersonCandidate[];
  /** 削除モーダルで「○○ を削除します」と表示する 1 行ラベル */
  deleteLabel: string;
  /** グリッドのテンプレ（page.tsx のヘッダーと揃える） */
  gridCols: string;
  /** JST 整形済みの日時ラベル（スマホ2行目・展開パネルで表示） */
  occurredLabel: string;
  /** 表示する 5 セル（日時 / チャンネル / 要約 / 重要度 / 次のアクション） */
  children: React.ReactNode;
}

export function ConversationRow({
  slug, tenantId, conversationId, initial, peopleCandidates,
  deleteLabel, gridCols, occurredLabel, children,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // 関連人物の名前（person_ids → label）
  const personNames = (initial.person_ids ?? [])
    .map((id) => peopleCandidates.find((p) => p.id === id)?.label)
    .filter((n): n is string => !!n);
  const tags = (initial.usage_tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 md:grid md:gap-4 ${gridCols} px-5 py-3.5 hover:bg-gray-50/60 active:bg-gray-100/70 transition-colors cursor-pointer focus:outline-none focus-visible:bg-gray-50/60 focus-visible:ring-1 focus-visible:ring-[#1c3550]/30`}
      >
        {children}
        <div className="flex items-center justify-end gap-1 shrink-0 md:mt-0">
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden
          />
          <ConversationDeleteButton
            slug={slug}
            tenantId={tenantId}
            conversationId={conversationId}
            label={deleteLabel}
          />
        </div>

        {/* スマホ専用2行目：日付 ＋ 関連人物（w-full で折り返して2行目に） */}
        <div className="w-full md:hidden flex items-center gap-1.5 text-[11px] text-gray-400 min-w-0">
          <span className="tabular-nums shrink-0">{occurredLabel}</span>
          {personNames.length > 0 && (
            <span className="truncate">・{personNames.join("、")}</span>
          )}
        </div>
      </div>

      {/* 展開：本文・次アクション・関連人物・タグを読み取り表示 */}
      {expanded && (
        <div className="px-5 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100">
          {occurredLabel && (
            <p className="mb-1.5 text-[11px] text-gray-400 tabular-nums">
              {occurredLabel}
            </p>
          )}
          {initial.summary && (
            <p className="text-[13px] font-bold text-[#1c3550] mb-1.5">
              {initial.summary}
            </p>
          )}
          <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
            {initial.content?.trim() || (
              <span className="text-gray-400">（本文の記録なし）</span>
            )}
          </div>

          {initial.next_action && (
            <p className="mt-3 text-[12px] text-gray-700">
              <span className="text-gray-400">次のアクション：</span>
              {initial.next_action}
            </p>
          )}

          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-gray-500 bg-white border border-gray-200"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              編集
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <ConversationEditDialog
        slug={slug}
        tenantId={tenantId}
        conversationId={conversationId}
        initial={initial}
        peopleCandidates={peopleCandidates}
        controlledOpen={editOpen}
        onControlledClose={() => setEditOpen(false)}
      />
    </>
  );
}
