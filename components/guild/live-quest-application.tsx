"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GuildQuest } from "@/lib/guild/server-data";
import { createClient } from "@/lib/supabase/client";
import { CheckBox, TextArea } from "./form-parts";
import { GUEST_VISIBILITY_NOTE, GatheringGuestVisibility } from "./gathering-guest-visibility";

export function LiveQuestApplication({
  quest,
  currentUserId,
  guestVisible = null,
}: {
  quest: GuildQuest;
  currentUserId: string;
  /** 誰でも参加できる集まりで、自分がゲストにプロフィールを見せる設定か（まだ選んでいなければ null） */
  guestVisible?: boolean | null;
}) {
  const router = useRouter();
  const [localApplication, setLocalApplication] = useState<{
    baseline: GuildQuest["my_application"];
    value: GuildQuest["my_application"];
  } | null>(null);
  const application = localApplication?.baseline === quest.my_application ? localApplication.value : quest.my_application;
  const setApplication = (value: GuildQuest["my_application"]) =>
    setLocalApplication({ baseline: quest.my_application, value });
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ゲストを招ける集まり（誰でも参加できる集まり）だけ、ゲストへのプロフィール表示を選べる
  const guestCapable = quest.category === "gathering" && !quest.members_only;
  const [showToGuests, setShowToGuests] = useState(true);

  if (quest.creator_id === currentUserId) {
    return <p className="c-muted text-sm">{quest.members_only ? "あなたが開いた集まりです。申し込みはギルドマスター画面で確認できます。" : "あなたが出したクエストです。参加希望者の確認機能は準備中です。"}</p>;
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
    const { data, error: rpcError } = await createClient().rpc("sakaba_apply_to_quest", {
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
      approved_at: (data as { approved_at?: string | null } | null)?.approved_at ?? null,
      created_at: new Date().toISOString(),
    });
    if (guestCapable) {
      const { error: visibilityError } = await createClient().rpc("sakaba_set_gathering_guest_visibility", {
        p_quest_id: quest.id,
        p_show: showToGuests,
      });
      if (visibilityError) setError("申し込みは完了しました。ゲストへの表示の設定だけ保存できなかったので、下で選び直してください。");
    }
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
    setApplication(application ? { ...application, status: "withdrawn", approved_at: null } : null);
    setConfirmWithdraw(false);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="c-dashed-top mt-8 pt-6">
      {error && <p role="alert" className="mb-4 text-sm text-[#c62828]">{error}</p>}
      {application?.status === "applied" ? (
        <div className="space-y-3">
          <p className="text-base">▶ {quest.members_only ? application.approved_at ? "参加が決まりました" : "申込中（承認待ち）" : "参加したいと伝えました"}</p>
          {application.message && <p className="c-card whitespace-pre-line break-words px-4 py-3 text-sm">{application.message}</p>}
          {guestCapable && <GatheringGuestVisibility questId={quest.id} initial={guestVisible ?? showToGuests} />}
          {confirmWithdraw ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>{quest.members_only ? "申し込みを取り消しますか？" : "参加希望を取り消しますか？"}</span>
              <button type="button" onClick={withdraw} disabled={busy} className="c-button-sub h-10">{busy ? "処理中..." : "取り消す"}</button>
              <button type="button" onClick={() => setConfirmWithdraw(false)} disabled={busy} className="c-muted underline">やめる</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmWithdraw(true)} className="c-muted text-left text-xs underline underline-offset-4">{quest.members_only ? "申し込みを取り消す" : "参加希望を取り消す"}</button>
          )}
        </div>
      ) : isFull ? (
        <p className="c-muted text-sm">このクエストは定員に達しました。</p>
      ) : writing ? (
        <div className="space-y-3">
          <p className="text-sm">{quest.members_only ? "ギルドマスターへのひとこと" : "出した人へのひとこと"}（任意・200文字以内）</p>
          <TextArea value={message} onChange={setMessage} rows={3} max={200} label="ひとこと" />
          <p className="c-muted text-xs">このひとことは、出した人とギルドマスターだけが見られます。</p>
          {guestCapable && (
            <CheckBox checked={showToGuests} onChange={setShowToGuests}>
              <span className="text-sm">ゲストにも自分のプロフィールを見せる</span>
              <span className="c-muted block text-xs leading-relaxed">{GUEST_VISIBILITY_NOTE}</span>
            </CheckBox>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setWriting(false)} disabled={busy} className="c-button-sub h-11">やめる</button>
            <button type="button" onClick={apply} disabled={busy} className="rpg-button h-11">{busy ? "申込中…" : quest.members_only ? "▶ 申し込む" : "▶ 参加したいと伝える"}</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setWriting(true)} className="rpg-button h-12 w-full text-base sm:w-auto">{quest.members_only ? "▶ 参加を申し込む" : "▶ 参加したい"}</button>
      )}
    </div>
  );
}
