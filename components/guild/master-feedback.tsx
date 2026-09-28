"use client";

// 管理者画面：会員から届いた「ご意見・不具合」の一覧と、対応状況の切り替え（0117）

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { FEEDBACK_STATUS_LABEL, deviceLabel, feedbackKindTitle, type FeedbackReport, type FeedbackStatus } from "@/lib/guild/feedback";
import { formatJstDate } from "@/lib/guild/labels";

const STATUSES: FeedbackStatus[] = ["new", "done"];

export function MasterFeedback({ initial }: { initial: FeedbackReport[] }) {
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);

  async function setStatus(item: FeedbackReport, status: FeedbackStatus) {
    if (pending || item.status === status) return;
    setPending(item.id);
    try {
      const { error } = await createClient().rpc("sakaba_set_feedback_report_status", { p_report_id: item.id, p_status: status });
      if (error) throw error;
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, status } : row));
      uiToast(`「${FEEDBACK_STATUS_LABEL[status]}」にしました`);
    } catch {
      uiToast("変更できませんでした。もう一度お試しください", "error");
    } finally {
      setPending(null);
    }
  }

  if (items.length === 0) return <p className="c-card p-5 text-sm">まだ届いていません。</p>;
  return <div className="grid gap-4 md:grid-cols-2">
    {items.map((item) => {
      const device = deviceLabel(item.user_agent);
      return <article key={item.id} className={`c-card min-w-0 p-5 ${item.status === "done" ? "opacity-70" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link href={`/guild/members/${item.user_id}`} className="underline underline-offset-4">{item.display_name}</Link>
          <span className="flex items-center gap-2">
            <time className="c-muted text-xs tabular-nums" dateTime={item.created_at}>{formatJstDate(item.created_at)}</time>
            <span className={item.status === "new" ? "c-chip-strong" : "c-chip"}>{FEEDBACK_STATUS_LABEL[item.status]}</span>
          </span>
        </div>
        <p className="mt-3"><span className="c-chip text-xs">{feedbackKindTitle(item.kind)}</span></p>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.message}</p>
        {(item.page_path || device) && <p className="c-muted mt-3 break-all text-xs">
          {item.page_path && <>画面：<code>{item.page_path}</code></>}{item.page_path && device && " · "}{device && <>端末：{device}</>}
        </p>}
        <div className="c-dashed-top mt-4 flex flex-wrap gap-2 pt-3" role="group" aria-label="対応状況">
          {STATUSES.map((status) => <button key={status} type="button" aria-pressed={item.status === status} disabled={pending !== null} onClick={() => void setStatus(item, status)} className="c-choice px-3 py-1.5 text-xs disabled:opacity-50">{FEEDBACK_STATUS_LABEL[status]}</button>)}
        </div>
      </article>;
    })}
  </div>;
}
