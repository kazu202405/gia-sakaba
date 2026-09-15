"use client";

// 判断事例 1件分のカード行。クリックで CaseEditDialog（controlled）を開く。
// 右端の Delete ボタンは stopPropagation 済みなので行クリックと競合しない。
// ロング版項目（intent/boundary/reflection/reusable_when）が入っていれば
// 折りたたみで表示できる（読み専用）。

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { CaseEditDialog } from "./CaseEditDialog";
import { CaseDeleteButton } from "./CaseDeleteButton";
import { CaseConfirmButton } from "./CaseConfirmButton";
import type { DecisionCaseInput } from "../_actions";

export interface CaseRowData {
  id: string;
  event: string;
  insight: string | null;
  action: string | null;
  outcome: string | null;
  takeaway: string | null;
  intent: string | null;
  boundary: string | null;
  reflection: string | null;
  reusable_when: string | null;
  emotion: string | null;
  capture_mode: string | null;
  ai_drafted: boolean | null;
  confirmed: boolean | null;
  occurred_at: string;
}

interface Props {
  slug: string;
  tenantId: string;
  caseData: CaseRowData;
}

function formatOccurredAt(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

function toEditInitial(c: CaseRowData): DecisionCaseInput {
  // datetime-local の value 形式 "YYYY-MM-DDTHH:MM" に変換
  const d = new Date(c.occurred_at);
  const occurredLocal = Number.isNaN(d.getTime())
    ? ""
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return {
    event: c.event,
    insight: c.insight ?? "",
    action: c.action ?? "",
    outcome: c.outcome ?? "",
    takeaway: c.takeaway ?? "",
    intent: c.intent ?? "",
    boundary: c.boundary ?? "",
    reflection: c.reflection ?? "",
    reusable_when: c.reusable_when ?? "",
    emotion: c.emotion ?? "",
    capture_mode: (c.capture_mode as "short" | "long") ?? "short",
    occurred_at: occurredLocal,
  };
}

export function CaseRow({ slug, tenantId, caseData: c }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasLong = Boolean(
    c.intent || c.boundary || c.reflection || c.reusable_when || c.emotion,
  );
  const deleteLabel = c.takeaway || c.event.slice(0, 30);

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
        className="block w-full text-left bg-white border border-gray-200 rounded-md px-5 py-4 hover:border-gray-300 hover:bg-gray-50/40 active:bg-gray-100/60 transition-colors cursor-pointer focus:outline-none focus-visible:border-[#1c3550] focus-visible:ring-1 focus-visible:ring-[#1c3550]/30"
      >
        {/* 上段：日時 + バッジ + 削除 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-500 tabular-nums font-mono">
              {formatOccurredAt(c.occurred_at)}
            </span>
            {c.capture_mode === "long" && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-[#d6dde5] bg-[#f1f4f7] text-[10px] tracking-[0.15em] text-[#1c3550]">
                LONG
              </span>
            )}
            {c.ai_drafted && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-[#e6d3a3] bg-[#fbf3e3] text-[10px] tracking-[0.15em] text-[#8a5a1c]">
                <Sparkles className="w-2.5 h-2.5" aria-hidden />
                AI抽出
              </span>
            )}
            {c.confirmed === false && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-[#d8c4be] bg-[#f3e9e6] text-[10px] tracking-[0.15em] text-[#8a4538]">
                未確認
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* AI 抽出済みかつ未確認の事例だけに「確認する」ボタンを出す */}
            {c.confirmed === false && (
              <CaseConfirmButton
                slug={slug}
                tenantId={tenantId}
                caseId={c.id}
              />
            )}
            <CaseDeleteButton
              slug={slug}
              tenantId={tenantId}
              caseId={c.id}
              label={deleteLabel}
            />
          </div>
        </div>

        {/* 出来事（必須） */}
        <p className="text-[14px] text-[#1c3550] leading-relaxed whitespace-pre-wrap font-medium mb-2">
          {c.event}
        </p>

        {/* 学び（あれば目立たせる） */}
        {c.takeaway && (
          <div className="mt-2 px-3 py-2 rounded-md bg-[#fbf3e3]/40 border border-[#e6d3a3]/60">
            <span className="text-[10px] tracking-[0.2em] text-[#8a5a1c] font-bold mr-2">
              LEARNING
            </span>
            <span className="text-[13px] text-[#8a5a1c]">{c.takeaway}</span>
          </div>
        )}

        {/* ショート4項目（簡易） */}
        <div className="space-y-1 mt-3 text-[12px]">
          {c.insight && (
            <div>
              <span className="text-gray-400 tracking-wider">見立て：</span>
              <span className="text-gray-700 whitespace-pre-wrap">{c.insight}</span>
            </div>
          )}
          {c.action && (
            <div>
              <span className="text-gray-400 tracking-wider">対応：</span>
              <span className="text-gray-700 whitespace-pre-wrap">{c.action}</span>
            </div>
          )}
          {c.outcome && (
            <div>
              <span className="text-gray-400 tracking-wider">結果：</span>
              <span className="text-gray-700 whitespace-pre-wrap">{c.outcome}</span>
            </div>
          )}
        </div>

        {/* ロング項目があれば折りたたみ */}
        {hasLong && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
              ロング項目を{expanded ? "閉じる" : "見る"}
            </button>

            {expanded && (
              <div className="mt-2 space-y-1 text-[12px]">
                {c.intent && (
                  <div>
                    <span className="text-gray-400 tracking-wider">意図：</span>
                    <span className="text-gray-700 whitespace-pre-wrap">{c.intent}</span>
                  </div>
                )}
                {c.boundary && (
                  <div>
                    <span className="text-gray-400 tracking-wider">境界線：</span>
                    <span className="text-gray-700 whitespace-pre-wrap">{c.boundary}</span>
                  </div>
                )}
                {c.reflection && (
                  <div>
                    <span className="text-gray-400 tracking-wider">反省：</span>
                    <span className="text-gray-700 whitespace-pre-wrap">{c.reflection}</span>
                  </div>
                )}
                {c.reusable_when && (
                  <div>
                    <span className="text-gray-400 tracking-wider">再利用条件：</span>
                    <span className="text-gray-700 whitespace-pre-wrap">{c.reusable_when}</span>
                  </div>
                )}
                {c.emotion && (
                  <div>
                    <span className="text-gray-400 tracking-wider">感情：</span>
                    <span className="text-gray-500 italic whitespace-pre-wrap">{c.emotion}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <CaseEditDialog
        slug={slug}
        tenantId={tenantId}
        caseId={c.id}
        initial={toEditInitial(c)}
        controlledOpen={editOpen}
        onControlledClose={() => setEditOpen(false)}
      />
    </>
  );
}
