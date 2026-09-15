"use client";

// 一覧上で確認状態を直接切り替える select。
// 行クリック等の他の意図と干渉しないよう stopPropagation。

import { useTransition } from "react";
import { updateKnowledgeStatus } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  candidateId: string;
  status: string;
}

const STATUS_OPTIONS = ["未確認", "確認中", "反映済", "却下"];

export function KnowledgeStatusSelect({
  slug,
  tenantId,
  candidateId,
  status,
}: Props) {
  const [pending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const next = e.target.value;
    startTransition(async () => {
      await updateKnowledgeStatus(slug, tenantId, candidateId, next);
    });
  };

  return (
    <select
      value={status}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      disabled={pending}
      className="text-[11px] font-bold border border-gray-200 rounded px-2 py-0.5 bg-white tabular-nums hover:border-gray-400 transition-colors disabled:opacity-50"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
