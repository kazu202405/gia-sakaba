"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteDatedReminder } from "../_actions";

// 2段階のインライン確認（window.confirm を使わない方針）。
export function DeleteReminderButton({
  slug,
  tenantId,
  id,
}: {
  slug: string;
  tenantId: string;
  id: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteDatedReminder(slug, tenantId, id);
            })
          }
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-white bg-[#8a4538] hover:bg-[#6f3328] disabled:opacity-40 transition-colors"
        >
          {pending && <Loader2 className="w-3 h-3 animate-spin" />}
          削除
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="px-2 py-1 rounded text-[11px] text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          やめる
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="削除"
      className="p-1.5 rounded text-gray-300 hover:text-[#8a4538] hover:bg-[#f3e9e6] transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
