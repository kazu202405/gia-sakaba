"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GuildIntroRequest } from "@/lib/guild/server-data";
import type { Profile } from "@/lib/guild/types";
import { closedStatuses, formatDate, introStatusLabel, purposeLabel } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";

export function LiveContactDetails({ name, contact }: {
  name: string;
  contact: GuildIntroRequest["other_contact"];
}) {
  if (!contact) return null;
  return <div className="mt-4 border-2 border-dashed border-[#8f7337] bg-[#fffdf6] px-3 py-3 text-sm">
    <p className="c-label text-xs">{name}さんの連絡先（承諾済み）</p>
    {contact.email || contact.line_url || contact.website_url ? <div className="mt-2 space-y-1 break-all">
      {contact.email && <p>メール：<a href={`mailto:${encodeURIComponent(contact.email)}`} className="underline underline-offset-2">{contact.email}</a></p>}
      {contact.line_url && <p>LINE：<a href={contact.line_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">開く ↗</a></p>}
      {contact.website_url && <p>ウェブサイト：<a href={contact.website_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">開く ↗</a></p>}
    </div> : <p className="c-muted mt-2 text-xs">まだ登録されていません。</p>}
  </div>;
}

export function LiveRequests({ initial, members, currentUserId }: {
  initial: GuildIntroRequest[];
  members: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const names = new Map(members.map((member) => [member.id, member.display_name]));
  const sent = initial.filter((request) => request.requester_id === currentUserId);
  const received = initial.filter((request) => request.target_id === currentUserId && ["proposed", "accepted", "introduced"].includes(request.status));

  async function act(request: GuildIntroRequest, action: "accept" | "decline_target" | "cancel") {
    if (pendingId) return;
    if (action !== "accept") {
      const confirmed = await uiConfirm({
        title: action === "cancel" ? "依頼を取り下げます" : "今回は辞退します",
        message: action === "cancel" ? "この紹介依頼を取り下げます。" : "依頼者には『今回はご縁がありませんでした』と表示されます。",
        okLabel: action === "cancel" ? "取り下げる" : "辞退する",
      });
      if (!confirmed) return;
    }
    setPendingId(request.id); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_act_on_intro_request", {
        p_request_id: request.id, p_action: action,
      });
      if (rpcError) throw rpcError;
      uiToast(action === "accept" ? "紹介を承諾しました" : action === "cancel" ? "依頼を取り下げました" : "辞退しました");
      router.refresh();
    } catch {
      setError("更新できませんでした。画面を読み直してもう一度お試しください。");
    } finally {
      setPendingId(null);
    }
  }

  return <div className="space-y-9">
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
    <Window title="あなたへの しょうかい依頼">
      {received.length === 0 ? <p className="c-muted text-sm">いまは紹介依頼が来ていません。</p> : <div className="space-y-4">{received.map((request) => {
        const name = names.get(request.requester_id) ?? "メンバー";
        return <article key={request.id} className="c-card p-4 sm:p-5">
          <p className="c-label text-xs">{name}さんからの紹介依頼</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><Link href={`/guild/members/${request.requester_id}`} className="text-base underline underline-offset-2">{name}さん</Link><span className="c-chip">{introStatusLabel[request.status].requester}</span></div>
          <p className="c-muted mt-1 text-xs">{purposeLabel[request.purpose]}・{formatDate(request.created_at)}</p>
          {request.message && <p className="mt-3 border-2 border-dashed border-[#1b2a41]/30 px-3 py-2 text-sm break-words">{request.message}</p>}
          {request.status === "proposed" ? <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pendingId !== null} onClick={() => void act(request, "accept")} className="rpg-button h-11 disabled:opacity-50">{pendingId === request.id ? "更新中…" : "▶ 会ってみる"}</button><button type="button" disabled={pendingId !== null} onClick={() => void act(request, "decline_target")} className="c-button-sub h-11 disabled:opacity-50">今回は辞退する</button></div> : <LiveContactDetails name={name} contact={request.other_contact} />}
        </article>;
      })}</div>}
    </Window>
    <Window title="あなたが出した いらい">
      {sent.length === 0 ? <p className="c-muted text-sm">まだ紹介を依頼していません。<Link href="/guild/members" className="underline">メンバー名鑑から探す</Link></p> : <div className="space-y-4">{sent.map((request) => {
        const name = names.get(request.target_id) ?? "メンバー";
        const closed = closedStatuses.includes(request.status);
        return <article key={request.id} className={`c-card p-4 sm:p-5 ${closed ? "opacity-75" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/guild/members/${request.target_id}`} className="text-base underline underline-offset-2">{name}さん</Link><span className="c-chip">{introStatusLabel[request.status].requester}</span></div>
          <p className="c-muted mt-1 text-xs">{purposeLabel[request.purpose]}・{formatDate(request.created_at)}</p>
          {request.status === "accepted" || request.status === "introduced" ? <LiveContactDetails name={name} contact={request.other_contact} /> : null}
          {request.status === "proposed" && <button type="button" disabled={pendingId !== null} onClick={() => void act(request, "cancel")} className="c-muted mt-4 text-xs underline underline-offset-4 disabled:opacity-50">{pendingId === request.id ? "更新中…" : "依頼を取り下げる"}</button>}
        </article>;
      })}</div>}
    </Window>
  </div>;
}
