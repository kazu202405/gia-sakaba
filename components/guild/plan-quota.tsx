// 「今月あと○件」と、使い切ったときの上の段への案内（紹介の申請・クエスト・プロジェクトで共通）

import Link from "next/link";
import { exhaustedLine, isExhausted, quotaLine, type PlanKey, type QuotaKind, type QuotaSlot } from "@/lib/guild/plan-usage";

export function PlanQuotaNote({ kind, plan, slot, className }: { kind: QuotaKind; plan: PlanKey; slot: QuotaSlot; className?: string }) {
  const line = quotaLine(kind, plan, slot);
  if (!line || isExhausted(slot)) return null;
  return <p className={`c-muted text-xs ${className ?? ""}`}>{line}</p>;
}

export function PlanQuotaExhausted({ kind, plan, slot }: { kind: QuotaKind; plan: PlanKey; slot: QuotaSlot }) {
  return <div className="c-card border-dashed px-4 py-3 text-sm leading-relaxed">
    <p>{exhaustedLine(kind, plan, slot)}</p>
    {plan !== "dining" && <Link href="/guild/plan" className="mt-2 inline-block underline underline-offset-4">▶ 段をくらべる</Link>}
  </div>;
}
