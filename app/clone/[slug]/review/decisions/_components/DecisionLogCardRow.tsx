"use client";

// 判断履歴 1 件のカード行。カード全体クリックで DecisionLogEditDialog を開く。
// 内部の編集トリガーは非表示にして、削除ボタン（stopPropagation あり）だけ
// ホバー時に表示する。

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { EditorialCard } from "@/app/admin/_components/EditorialChrome";
import { formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { DecisionLogEditDialog } from "./DecisionLogEditDialog";
import { DecisionLogDeleteButton } from "./DecisionLogDeleteButton";
import type { DecisionLogInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  decisionId: string;
  occurredAt: string | null;
  theme: string | null;
  conclusion: string | null;
  reasoning: string | null;
  valuesEmphasized: string[] | null;
  reusableRule: string | null;
  promoteToCoreOs: boolean | null;
}

export function DecisionLogCardRow({
  slug, tenantId, decisionId,
  occurredAt, theme, conclusion, reasoning,
  valuesEmphasized, reusableRule, promoteToCoreOs,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);

  const initial: DecisionLogInput = {
    occurred_at: occurredAt
      ? new Date(occurredAt).toISOString().slice(0, 16)
      : "",
    theme: theme ?? "",
    conclusion: conclusion ?? "",
    reasoning: reasoning ?? "",
    values_emphasized: valuesEmphasized ? valuesEmphasized.join(", ") : "",
    reusable_rule: reusableRule ?? "",
    promote_to_core_os: promoteToCoreOs ?? false,
  };
  const label =
    theme || conclusion?.slice(0, 30) || formatDateTime(occurredAt);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setEditOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEditOpen(true);
          }
        }}
        className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c3550]/40 rounded-md"
      >
        <EditorialCard
          variant="row"
          className="px-5 py-4 group hover:border-[#1c3550]/30 hover:bg-gray-50/40 transition-colors"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-gray-700 tabular-nums mb-1">
                {formatDateTime(occurredAt)}
              </div>
              {theme && (
                <h3 className="text-sm font-bold text-[#1c3550]">{theme}</h3>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {promoteToCoreOs && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fbf3e3] text-[#8a5a1c] border border-[#e6d3a3]">
                  <Sparkles className="w-2.5 h-2.5" />
                  Core OS 昇格候補
                </span>
              )}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <DecisionLogDeleteButton
                  slug={slug}
                  tenantId={tenantId}
                  decisionId={decisionId}
                  label={label}
                />
              </div>
            </div>
          </div>

          {conclusion && (
            <div className="mt-3">
              <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                結論
              </span>
              <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap mt-1">
                {conclusion}
              </p>
            </div>
          )}

          {reasoning && (
            <div className="mt-3">
              <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                理由
              </span>
              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap mt-1">
                {reasoning}
              </p>
            </div>
          )}

          {reusableRule && (
            <div className="mt-3 p-3 rounded-md bg-[#fbf3e3]/40 border border-[#e6d3a3]/60">
              <span className="text-[10px] tracking-[0.2em] text-[#8a5a1c] uppercase">
                次回使えるルール
              </span>
              <p className="text-[13px] text-[#5a3d12] leading-relaxed whitespace-pre-wrap mt-1">
                {reusableRule}
              </p>
            </div>
          )}

          {valuesEmphasized && valuesEmphasized.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
              {valuesEmphasized.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-gray-500 bg-gray-50 border border-gray-200"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </EditorialCard>
      </div>

      {/* カード外で controlled 編集ダイアログを描画。トリガーボタンは非表示。 */}
      <DecisionLogEditDialog
        slug={slug}
        tenantId={tenantId}
        decisionId={decisionId}
        initial={initial}
        open={editOpen}
        onOpenChange={setEditOpen}
        hideTrigger
      />
    </>
  );
}
