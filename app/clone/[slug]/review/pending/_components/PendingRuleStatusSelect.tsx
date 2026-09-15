"use client";

// 一覧上で承認状態を直接切替（申請中/承認/却下/保留）。

import { useTransition } from "react";
import { updatePendingRuleStatus } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  ruleId: string;
  status: string;
}

const STATUS_OPTIONS = ["申請中", "承認", "却下", "保留"];

export function PendingRuleStatusSelect({
  slug,
  tenantId,
  ruleId,
  status,
}: Props) {
  const [pending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const next = e.target.value;
    startTransition(async () => {
      await updatePendingRuleStatus(slug, tenantId, ruleId, next);
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
