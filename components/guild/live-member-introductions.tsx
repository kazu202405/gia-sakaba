"use client";

import Link from "next/link";
import { useState } from "react";
import type { GuildMemberIntroduction } from "@/lib/guild/server-data";
import { formatDate } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";

export function LiveMemberIntroductions({ targetId, targetName, currentUserId, initial }: {
  targetId: string;
  targetName: string;
  currentUserId: string;
  initial: GuildMemberIntroduction[];
}) {
  const isMe = targetId === currentUserId;
  const [items, setItems] = useState(initial);
  const mine = items.find((item) => item.author_id === currentUserId);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(mine?.body ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const { data, error: rpcError } = await createClient().rpc("sakaba_list_member_introductions", {
      p_guild_slug: "gia",
      p_target_id: targetId,
    });
    if (rpcError) throw rpcError;
    setItems(Array.isArray(data) ? data as GuildMemberIntroduction[] : []);
  }

  async function save() {
    const text = body.trim();
    if (!text || text.length > 400 || pending) {
      setError(!text ? "紹介文を入力してください。" : "紹介文は400文字以内で入力してください。");
      return;
    }
    setPending(true); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_save_member_introduction", {
        p_guild_slug: "gia",
        p_target_id: targetId,
        p_body: text,
      });
      if (rpcError) throw rpcError;
      await refresh();
      setEditing(false);
      uiToast(mine ? "紹介文を更新しました" : "紹介文を贈りました");
    } catch {
      setError("紹介文を保存できませんでした。画面を読み直して再度お試しください。");
    } finally {
      setPending(false);
    }
  }

  async function remove(item: GuildMemberIntroduction) {
    if (pending) return;
    const confirmed = await uiConfirm({
      title: "紹介文を削除します",
      message: item.author_id === currentUserId ? "あなたが書いた紹介文を削除します。" : "自分のページからこの紹介文を削除します。",
      okLabel: "削除する",
      danger: true,
    });
    if (!confirmed) return;
    setPending(true); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_delete_member_introduction", { p_introduction_id: item.id });
      if (rpcError) throw rpcError;
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (item.author_id === currentUserId) { setBody(""); setEditing(false); }
      uiToast("紹介文を削除しました");
    } catch {
      setError("紹介文を削除できませんでした。画面を読み直して再度お試しください。");
    } finally {
      setPending(false);
    }
  }

  return <Window title="冒険者からの紹介状" action={<span className="c-muted text-xs">{items.length}通</span>}>
    <p className="c-muted mb-5 text-sm leading-relaxed">酒場で{isMe ? "あなた" : `${targetName}さん`}を知る仲間から見た、人柄や魅力の紹介です。</p>
    {!isMe && !editing && <button type="button" onClick={() => { setBody(mine?.body ?? ""); setEditing(true); }} className="rpg-button h-11 px-5 text-sm">{mine ? "▶ 自分の紹介文をなおす" : "▶ 紹介文を贈る"}</button>}
    {!isMe && editing && <div className="mb-6 border-2 border-dashed border-[#8f7337] bg-[#fffdf6] p-4">
      <label className="block"><span className="text-sm tracking-wider">{targetName}さんは、どんな仲間？</span>
        <textarea value={body} onChange={(event) => { setBody(event.target.value); setError(""); }} rows={5} maxLength={400} className="c-input mt-2 leading-relaxed" placeholder="話したときの印象や人柄、ほかの仲間に伝えたい魅力を書いてください" /></label>
      <p className="c-muted mt-1 text-right text-[11px] tabular-nums">{body.length}/400</p>
      <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" disabled={pending} onClick={() => { setEditing(false); setBody(mine?.body ?? ""); setError(""); }} className="c-button-sub h-10 px-4 text-sm">閉じる</button><button type="button" disabled={pending} onClick={() => void save()} className="rpg-button h-10 px-5 text-sm disabled:opacity-50">{pending ? "保存中…" : mine ? "▶ 更新する" : "▶ 紹介状を贈る"}</button></div>
    </div>}
    {error && <p role="alert" className="mb-4 text-sm text-[#c62828]">{error}</p>}
    {items.length === 0 ? <p className="c-card border-dashed px-4 py-8 text-center text-sm">紹介状はまだありません。</p> :
      <ul className="grid gap-4 sm:grid-cols-2">{items.map((item) => <li key={item.id} className="relative border-2 border-[#1b2a41] bg-[#fffdf6] p-4 pt-5 shadow-[3px_3px_0_#c8a55a]">
        <span className="absolute -top-2 left-4 bg-[#fffdf6] px-2 text-[10px] tracking-[0.14em] text-[#8f7337]">LETTER FROM ALLY</span>
        <p className="whitespace-pre-line break-words text-sm leading-[1.9]">{item.body}</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-[#1b2a41]/15 pt-3">
          <div><Link href={`/guild/members/${item.author_id}`} className="text-sm underline underline-offset-4">{item.author_name}</Link><p className="c-muted mt-0.5 text-[10px]">{formatDate(item.updated_at)}</p></div>
          <div className="flex gap-3 text-xs">{item.can_edit && <button type="button" disabled={pending} onClick={() => { setBody(item.body); setEditing(true); }} className="underline underline-offset-4 disabled:opacity-50">編集</button>}{item.can_delete && <button type="button" disabled={pending} onClick={() => void remove(item)} className="text-[#9d2929] underline underline-offset-4 disabled:opacity-50">削除</button>}</div>
        </div>
      </li>)}</ul>}
  </Window>;
}
