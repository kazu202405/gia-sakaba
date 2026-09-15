"use client";

// ナレッジ候補 1 件のカード行。カード全体クリックで KnowledgeCandidateEditDialog を
// 開く。内部の StatusSelect / Delete ボタンはそれぞれ stopPropagation で誤発火を
// 防ぐ前提（既存実装に入っている）。

import { useState } from "react";
import {
  EditorialCard,
} from "@/app/admin/_components/EditorialChrome";
import { KnowledgeStatusSelect } from "./KnowledgeStatusSelect";
import { KnowledgeCandidateEditDialog } from "./KnowledgeCandidateEditDialog";
import { KnowledgeCandidateDeleteButton } from "./KnowledgeCandidateDeleteButton";
import type { KnowledgeCandidateInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  candidateId: string;
  content: string;
  kind: string | null;
  targetDb: string | null;
  priority: string | null;
  originLog: string | null;
  reviewStatus: string | null;
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<
    string,
    { bg: string; border: string; text: string }
  > = {
    高: { bg: "bg-[#f3e9e6]", border: "border-[#d8c4be]", text: "text-[#8a4538]" },
    中: { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]" },
    低: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500" },
  };
  const s = styles[priority] ?? styles["低"];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${s.bg} ${s.border} ${s.text}`}
    >
      {priority}
    </span>
  );
}

export function KnowledgeCandidateCardRow({
  slug, tenantId, candidateId,
  content, kind, targetDb, priority, originLog, reviewStatus,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const dimmed = reviewStatus === "却下" || reviewStatus === "反映済";
  const initial: KnowledgeCandidateInput = {
    content,
    kind: kind ?? "",
    target_db: targetDb ?? "",
    priority: priority ?? "",
    origin_log: originLog ?? "",
  };
  const label = content.slice(0, 40);

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
          className={`px-5 py-4 group hover:border-[#1c3550]/30 hover:bg-gray-50/40 transition-colors ${dimmed ? "opacity-60" : ""}`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#1c3550] leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
              <div className="flex items-center gap-3 mt-2">
                {kind && (
                  <span className="text-[11px] tracking-[0.15em] text-gray-500 uppercase">
                    {kind}
                  </span>
                )}
                {targetDb && (
                  <span className="text-[11px] text-gray-500">
                    → {targetDb}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <PriorityBadge priority={priority} />
              <KnowledgeStatusSelect
                slug={slug}
                tenantId={tenantId}
                candidateId={candidateId}
                status={reviewStatus ?? "未確認"}
              />
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <KnowledgeCandidateDeleteButton
                  slug={slug}
                  tenantId={tenantId}
                  candidateId={candidateId}
                  label={label}
                />
              </div>
            </div>
          </div>

          {originLog && (
            <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500 whitespace-pre-wrap">
              <span className="text-gray-400 tracking-wider">元: </span>
              {originLog}
            </div>
          )}
        </EditorialCard>
      </div>

      {/* カード外で controlled 編集ダイアログを描画。トリガーボタンは非表示。 */}
      <KnowledgeCandidateEditDialog
        slug={slug}
        tenantId={tenantId}
        candidateId={candidateId}
        initial={initial}
        open={editOpen}
        onOpenChange={setEditOpen}
        hideTrigger
      />
    </>
  );
}
