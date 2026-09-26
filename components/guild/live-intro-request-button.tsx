"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GuildIntroRequest } from "@/lib/guild/server-data";
import type { IntroPurpose, Profile } from "@/lib/guild/types";
import { purposeLabel } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";

const PURPOSES = Object.keys(purposeLabel) as IntroPurpose[];

export function LiveIntroRequestButton({ target, existing }: { target: Profile; existing: GuildIntroRequest | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [purpose, setPurpose] = useState<IntroPurpose | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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

  async function submit() {
    if (!purpose) { setError("目的を選んでください。"); return; }
    if (saving) return;
    setSaving(true); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_create_intro_request", {
        p_guild_slug: "gia", p_target_id: target.id, p_purpose: purpose, p_message: message.trim(),
      });
      if (rpcError) {
        setError(rpcError.code === "23505" ? "この人へのつながり申請は進行中です。" : "申請を送れませんでした。少し待ってもう一度お試しください。");
        return;
      }
      setSent(true); setOpen(false);
      uiToast(`${target.display_name}さんにつながり申請を送りました`);
      router.refresh();
    } catch {
      setError("通信に失敗しました。接続を確認してください。");
    } finally {
      setSaving(false);
    }
  }

  if (existing || sent) return <Link href="/guild/requests" className="c-button-sub h-12 w-full sm:w-auto">申請の状況を見る ▶</Link>;
  if (!target.accept_intro) return <p className="c-card border-dashed px-4 py-3 text-sm">{target.display_name}さんは、いまつながり申請を受け付けていません。</p>;

  return <>
    <button type="button" onClick={() => setOpen(true)} className="rpg-button h-12 w-full text-base sm:w-auto">▶ つながりを申請する</button>
    {open && <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#1b2a41]/50" onClick={() => { if (!saving) setOpen(false); }} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby="intro-live-title" className="c-window relative w-full pt-9 sm:max-w-lg">
        <h2 id="intro-live-title" className="c-window-title">つながり申請</h2>
        <button type="button" disabled={saving} onClick={() => setOpen(false)} aria-label="閉じる" className="absolute top-1.5 right-2 px-2 text-xl leading-none disabled:opacity-50">×</button>
        <div className="max-h-[80vh] overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="text-base">{target.display_name}さんにつながりを申請する</p>
          <p className="c-muted mt-2 text-[13px] leading-relaxed">申請は相手に直接届きます。相手が承諾すると、お互いの登録済みの連絡先が見えるようになります。</p>
          <fieldset className="mt-5">
            <legend className="text-[15px]">目的 <span className="text-xs text-[#c62828]">必須</span></legend>
            <div className="mt-2 grid grid-cols-2 gap-2">{PURPOSES.map((item, index) => <button key={item} ref={index === 0 ? firstRef : undefined} type="button" aria-pressed={purpose === item} onClick={() => { setPurpose(item); setError(""); }} className="c-choice px-3 py-2.5 text-sm">{purposeLabel[item]}</button>)}</div>
          </fieldset>
          <label className="mt-5 block"><span className="text-[15px]">相手へのひとこと</span><span className="c-muted ml-1 text-xs">任意</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} maxLength={400} className="c-input mt-2" placeholder="例：採用ページの件で一度お話を伺いたいです" /></label>
          {error && <p role="alert" className="mt-2 text-sm text-[#c62828]">{error}</p>}
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="c-button-sub h-11">キャンセル</button><button type="button" disabled={saving} aria-busy={saving} onClick={() => void submit()} className="rpg-button h-11 disabled:opacity-50">{saving ? "送信中…" : "▶ 申請を送る"}</button></div>
        </div>
      </div>
    </div>}
  </>;
}
