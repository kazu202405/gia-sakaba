"use client";

// 「ご意見・不具合」を送る窓（0117）。ヘッダーとマイページに置く。
// 開いている画面の道（例：/guild/projects/…）と端末の種類を一緒に送り、管理者が「どこで起きたか」を追えるようにする。
// 窓の形はエンタープライズの「相談する」（enterprise-plan.tsx）と同じ。

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { FEEDBACK_KINDS, FEEDBACK_MESSAGE_MAX, feedbackError, type FeedbackKind } from "@/lib/guild/feedback";

export function FeedbackButton({ className, label = "ご意見・不具合" }: { className?: string; label?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !lock.current) setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [open]);

  async function submit() {
    if (lock.current) return;
    const issue = feedbackError(kind, message);
    if (issue) { setError(issue); return; }
    lock.current = true;
    setSaving(true); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_create_feedback_report", {
        p_guild_slug: "gia", p_kind: kind, p_message: message.trim(),
        p_page_path: pathname, p_user_agent: navigator.userAgent,
      });
      if (rpcError) {
        setError(rpcError.code === "53400" ? "送れるのは24時間に10件までです。少し時間をおいてお送りください。" : "送れませんでした。少し待ってもう一度お試しください。");
        return;
      }
      setOpen(false); setKind(null); setMessage("");
      uiToast("送りました。ありがとうございます");
    } catch {
      setError("通信に失敗しました。接続を確認してください。");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  const placeholder = FEEDBACK_KINDS.find((item) => item.key === kind)?.placeholder ?? "どんなときに、どうなったかを書いてください。";

  return <>
    <button type="button" onClick={() => { setOpen(true); setError(""); }} className={className}>{label}</button>
    {open && <div className="fixed inset-0 z-[90] flex items-end justify-center text-[#1b2a41] sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#1b2a41]/50" onClick={() => { if (!saving) setOpen(false); }} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="c-window relative w-full pt-9 sm:max-w-lg">
        <h2 id="feedback-title" className="c-window-title">ご意見・不具合</h2>
        <button ref={closeRef} type="button" disabled={saving} onClick={() => setOpen(false)} aria-label="閉じる" className="absolute top-1.5 right-2 px-2 text-xl leading-none disabled:opacity-50">×</button>
        <div className="max-h-[80vh] overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="c-muted text-[13px] leading-relaxed">届くのは管理者だけです。おかしな動きや「こうだったら使いやすい」を、気軽に送ってください。いま開いている画面も一緒に届きます。</p>
          <fieldset className="mt-5">
            <legend className="text-[15px]">どんな内容？ <span className="text-xs text-[#c62828]">必須</span></legend>
            <div className="mt-2 grid gap-2">{FEEDBACK_KINDS.map((item) => <button key={item.key} type="button" aria-pressed={kind === item.key} onClick={() => { setKind(item.key); setError(""); }} className="c-choice px-3 py-2.5 text-left text-sm">{item.title}</button>)}</div>
          </fieldset>
          <label className="mt-5 block">
            <span className="text-[15px]">内容</span> <span className="text-xs text-[#c62828]">必須</span>
            <textarea value={message} onChange={(event) => { setMessage(event.target.value); setError(""); }} rows={5} maxLength={FEEDBACK_MESSAGE_MAX} className="c-input mt-2" placeholder={placeholder} />
          </label>
          {error && <p role="alert" className="mt-2 text-sm text-[#c62828]">{error}</p>}
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" disabled={saving} onClick={() => setOpen(false)} className="c-button-sub h-11">キャンセル</button>
            <button type="button" disabled={saving} aria-busy={saving} onClick={() => void submit()} className="rpg-button h-11">{saving ? "送信中…" : "▶ 送る"}</button>
          </div>
        </div>
      </div>
    </div>}
  </>;
}
