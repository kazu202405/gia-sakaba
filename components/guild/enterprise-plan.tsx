"use client";

// 会員プランの3つの枠の下に置く、横長の「エンタープライズプラン」。
// 管理者が事業そのものを手伝う（要相談・相談をまとめてお見積もりを出すまでは無料）。月額の決済はせず、相談を管理者画面に届けるだけ（0115）。

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { CONSULT_MESSAGE_MAX, CONSULT_TOPICS, consultError, type ConsultTopic } from "@/lib/guild/enterprise";
import { PHRASE_WRAP, Ph } from "./phrase";

export function EnterprisePlan({ isMaster }: { isMaster: boolean }) {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<ConsultTopic[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  // 開いたら「閉じる」に置く（最初の選択肢に置くと、選ばれているように見えるため）
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [open, saving]);

  const toggle = (key: ConsultTopic) => {
    setTopics((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
    setError("");
  };

  async function submit() {
    if (saving) return;
    const issue = consultError(topics, message);
    if (issue) { setError(issue); return; }
    setSaving(true); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_create_consult_request", {
        p_guild_slug: "gia", p_topics: topics, p_message: message.trim(),
      });
      if (rpcError) {
        setError(rpcError.code === "53400" ? "相談は24時間に3件までです。少し時間をおいてお送りください。" : "送れませんでした。少し待ってもう一度お試しください。");
        return;
      }
      setSent(true); setOpen(false); setTopics([]); setMessage("");
      uiToast("相談を送りました。管理者からご連絡します");
    } catch {
      setError("通信に失敗しました。接続を確認してください。");
    } finally {
      setSaving(false);
    }
  }

  return <section aria-label="エンタープライズプラン" className={`c-window border-[#8f7337] p-5 sm:p-7 ${PHRASE_WRAP}`}>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10">
      <div className="min-w-0">
        <h2 className="guild-px text-[32px] leading-tight tracking-[0.1em]"><Ph text="エンタープライズ|プラン" /></h2>
        <p className="mt-4 text-[28px] leading-none tracking-wide">要相談</p>
        <p className="c-muted mt-2 text-xs"><Ph text="相談がまとまって|お見積もりを出すまでは|無料です" /></p>
        <p className="mt-5 text-[15px] leading-relaxed"><span className="c-label mb-1 block w-fit text-base">こんな人に</span><Ph text="自社の仕事に、|五島に一緒に|入ってもらいたい" /></p>
      </div>
      <div className="min-w-0">
        <p className="text-[15px] leading-relaxed"><Ph text="アプリの機能だけでは|届かないところを、|管理者が直接|手伝います。|事業の状況を伺って、|必要なことだけを|ご提案します。" /></p>
        <ul className="mt-4 grid gap-4 border-t border-[#1b2a41]/25 pt-4 sm:grid-cols-2">
          {CONSULT_TOPICS.filter((topic) => topic.key !== "other").map((topic) => <li key={topic.key} className="flex gap-2">
            <span aria-hidden="true" className="text-sm leading-relaxed">▶</span>
            <span className="min-w-0">
              <span className="block text-[15px] leading-relaxed"><Ph text={topic.title.replace("・", "・|").replace("／", "／|")} /></span>
              <span className="c-muted block text-xs leading-relaxed"><Ph text={topic.desc} /></span>
            </span>
          </li>)}
        </ul>
        <div className="mt-6">
          {isMaster
            ? <span className="c-chip">相談は管理者画面に届きます</span>
            : <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => { setOpen(true); setError(""); }} className="rpg-button inline-flex min-h-11 items-center px-5 text-sm">▶ 相談する</button>
              {sent && <p role="status" className="c-muted text-xs"><Ph text="相談を受け付けました。|管理者から|ご連絡します。" /></p>}
            </div>}
        </div>
      </div>
    </div>

    {open && <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#1b2a41]/50" onClick={() => { if (!saving) setOpen(false); }} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby="enterprise-consult-title" className="c-window relative w-full pt-9 sm:max-w-lg">
        <h2 id="enterprise-consult-title" className="c-window-title">相談する</h2>
        <button ref={firstRef} type="button" disabled={saving} onClick={() => setOpen(false)} aria-label="閉じる" className="absolute top-1.5 right-2 px-2 text-xl leading-none disabled:opacity-50">×</button>
        <div className={`max-h-[80vh] overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6 ${PHRASE_WRAP}`}>
          <p className="c-muted text-[13px] leading-relaxed"><Ph text="届くのは管理者だけです。|内容を見て、|管理者からご連絡します。|相談がまとまって|お見積もりを出すまでは|無料です。" /></p>
          <fieldset className="mt-5">
            <legend className="text-[15px]">相談したいこと <span className="text-xs text-[#c62828]">必須</span><span className="c-muted ml-1 text-xs">いくつでも</span></legend>
            <div className="mt-2 grid gap-2">{CONSULT_TOPICS.map((topic) => <button key={topic.key} type="button" aria-pressed={topics.includes(topic.key)} onClick={() => toggle(topic.key)} className="c-choice px-3 py-2.5 text-left text-sm">{topic.title}</button>)}</div>
          </fieldset>
          <label className="mt-5 block">
            <span className="text-[15px]">いまの状況・困っていること</span> <span className="text-xs text-[#c62828]">必須</span>
            <textarea value={message} onChange={(event) => { setMessage(event.target.value); setError(""); }} rows={4} maxLength={CONSULT_MESSAGE_MAX} className="c-input mt-2" placeholder="例：問い合わせ対応に毎日2時間かかっている。紹介は来るが、商談につながらない など" />
          </label>
          {error && <p role="alert" className="mt-2 text-sm text-[#c62828]">{error}</p>}
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" disabled={saving} onClick={() => setOpen(false)} className="c-button-sub h-11">キャンセル</button>
            <button type="button" disabled={saving} aria-busy={saving} onClick={() => void submit()} className="rpg-button h-11 disabled:opacity-50">{saving ? "送信中…" : "▶ 相談を送る"}</button>
          </div>
        </div>
      </div>
    </div>}
  </section>;
}
