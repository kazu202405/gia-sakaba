"use client";

// 管理者画面：エンタープライズプランの相談の一覧と、対応状況の切り替え（0115）

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { CONSULT_STATUS_LABEL, consultTopicTitle, type ConsultRequest, type ConsultStatus } from "@/lib/guild/enterprise";
import { formatJstDate } from "@/lib/guild/labels";

const NEXT_STATUSES: ConsultStatus[] = ["new", "contacted", "closed"];

export function MasterConsults({ initial }: { initial: ConsultRequest[] }) {
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);

  async function setStatus(item: ConsultRequest, status: ConsultStatus) {
    if (pending || item.status === status) return;
    setPending(item.id);
    try {
      const { error } = await createClient().rpc("sakaba_set_consult_request_status", { p_request_id: item.id, p_status: status });
      if (error) throw error;
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, status } : row));
      uiToast(`「${CONSULT_STATUS_LABEL[status]}」にしました`);
    } catch {
      uiToast("変更できませんでした。もう一度お試しください", "error");
    } finally {
      setPending(null);
    }
  }

  if (items.length === 0) return <p className="c-card p-5 text-sm">まだ相談は届いていません。</p>;
  return <div className="grid gap-4 md:grid-cols-2">
    {items.map((item) => <article key={item.id} className={`c-card min-w-0 p-5 ${item.status === "closed" ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href={`/guild/members/${item.user_id}`} className="underline underline-offset-4">{item.display_name}</Link>
        <span className="flex items-center gap-2">
          <time className="c-muted text-xs tabular-nums" dateTime={item.created_at}>{formatJstDate(item.created_at)}</time>
          <span className={item.status === "new" ? "c-chip-strong" : "c-chip"}>{CONSULT_STATUS_LABEL[item.status]}</span>
        </span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5">{item.topics.map((topic) => <li key={topic} className="c-chip text-xs">{consultTopicTitle(topic)}</li>)}</ul>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.message}</p>
      <div className="c-dashed-top mt-4 flex flex-wrap gap-2 pt-3" role="group" aria-label="対応状況">
        {NEXT_STATUSES.map((status) => <button key={status} type="button" aria-pressed={item.status === status} disabled={pending !== null} onClick={() => void setStatus(item, status)} className="c-choice px-3 py-1.5 text-xs disabled:opacity-50">{CONSULT_STATUS_LABEL[status]}</button>)}
      </div>
    </article>)}
  </div>;
}
