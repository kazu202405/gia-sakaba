"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { applyToSeminar } from "../actions";

// セミナー参加申込ボタン。押下→Server Action→成功で「申込済み」表示に切替。
export function ApplyButton({ seminarId }: { seminarId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await applyToSeminar(seminarId);
      if (res.ok) {
        setDone(true);
      } else {
        setError(res.error);
      }
    });
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] text-sm font-semibold border border-[var(--gia-teal)]/30">
        <Check className="w-4 h-4" />
        申込みました（承認待ち）
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--gia-navy)] hover:bg-[var(--gia-navy)]/90 text-white text-sm font-semibold transition-colors disabled:opacity-60 tracking-[0.02em]"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        参加を申し込む
      </button>
      {error && (
        <span className="inline-flex items-center gap-1 text-[11px] text-red-600">
          <AlertCircle className="w-3 h-3" />
          {error}
        </span>
      )}
    </div>
  );
}
