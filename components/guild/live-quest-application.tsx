"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GuildQuest } from "@/lib/guild/server-data";
import { createClient } from "@/lib/supabase/client";
import { TextArea } from "./form-parts";

export function LiveQuestApplication({
  quest,
  currentUserId,
}: {
  quest: GuildQuest;
  currentUserId: string;
}) {
  const router = useRouter();
  const [application, setApplication] = useState(quest.my_application);
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApplication(quest.my_application);
  }, [quest.my_application]);

  if (quest.creator_id === currentUserId) {
    return <p className="c-muted text-sm">あなたが出したクエストです。参加希望者の確認機能は準備中です。</p>;
  }

  if (quest.status !== "open") {
    return <p className="c-muted text-sm">このクエストは募集を終えています。</p>;
  }

  const isFull =
    quest.member_limit !== null &&
    quest.applicant_count >= quest.member_limit &&
    application?.status !== "applied";

  async function apply() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const trimmed = message.trim();
    const { error: rpcError } = await createClient().rpc("sakaba_apply_to_quest", {
      p_quest_id: quest.id,
      p_message: trimmed,
    });
    if (rpcError) {
      setError("申請できませんでした。募集状況を確認してから再度お試しください。");
      setBusy(false);
      router.refresh();
      return;
    }
    setApplication({
      quest_id: quest.id,
      user_id: currentUserId,
      message: trimmed,
      status: "applied",
      approved_at: null,
      created_at: new Date().toISOString(),
    });
    setWriting(false);
    setBusy(false);
    router.refresh();
  }

  async function withdraw() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc("sakaba_withdraw_application", {
      p_quest_id: quest.id,
    });
    if (rpcError) {
      setError("取り消しできませんでした。ページを更新して再度お試しください。");
      setBusy(false);
      router.refresh();
      return;
    }
    setApplication((current) => current ? { ...current, status: "withdrawn", approved_at: null } : null);
    setConfirmWithdraw(false);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="c-dashed-top mt-8 pt-6">
      {error && <p role="alert" className="mb-4 text-sm text-[#c62828]">{error}</p>}
      {application?.status === "applied" ? (
        <div className="space-y-3">
          <p className="text-base">▶ {quest.members_only && !application.approved_at ? "申請中（承認待ち）" : "参加したいと伝えました"}</p>
          {application.message && <p className="c-card whitespace-pre-line break-words px-4 py-3 text-sm">{application.message}</p>}
          {confirmWithdraw ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>参加希望を取り消しますか？</span>
              <button type="button" onClick={withdraw} disabled={busy} className="c-button-sub h-10">{busy ? "処理中..." : "取り消す"}</button>
              <button type="button" onClick={() => setConfirmWithdraw(false)} disabled={busy} className="c-muted underline">やめる</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmWithdraw(true)} className="c-muted text-left text-xs underline underline-offset-4">参加希望を取り消す</button>
          )}
        </div>
      ) : isFull ? (
        <p className="c-muted text-sm">このクエストは定員に達しました。</p>
      ) : writing ? (
        <div className="space-y-3">
          <p className="text-sm">出した人へのひとこと（任意・200文字以内）</p>
          <TextArea value={message} onChange={setMessage} rows={3} max={200} label="ひとこと" />
          <p className="c-muted text-xs">このひとことは、出した人とギルドマスターだけが見られます。</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setWriting(false)} disabled={busy} className="c-button-sub h-11">やめる</button>
            <button type="button" onClick={apply} disabled={busy} className="rpg-button h-11">{busy ? "送信中..." : "▶ 参加したいと伝える"}</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setWriting(true)} className="rpg-button h-12 w-full text-base sm:w-auto">▶ 参加したい</button>
      )}
    </div>
  );
}
