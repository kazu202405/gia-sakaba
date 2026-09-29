"use client";

import Link from "next/link";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import { useEffect, useRef, useState } from "react";
import type { MyMemberInvite } from "@/lib/guild/server-data";
import { formatDate } from "@/lib/guild/labels";
import { canNativeShare, inviteMessage, inviteUrl, isShareCancel, lineShareUrl } from "@/lib/guild/invite-share";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";

export function LiveMyInvite({ initial }: { initial: MyMemberInvite }) {
  const router = useGuildRouter();
  const [invite, setInvite] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  // 画面が出てから決める（サーバーの描画と食い違わせない）。共有画面は対応する端末だけ。
  const [origin, setOrigin] = useState("");
  const [canShare, setCanShare] = useState(false);
  const sharing = useRef(false); // 共有画面を開いている間の二重起動を防ぐ（押した瞬間にかける）
  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(canNativeShare(navigator));
  }, []);

  async function issue(rotate: boolean) {
    if (pending) return;
    if (rotate) {
      const confirmed = await uiConfirm({
        title: "招待リンクを作り直します",
        message: "今のリンクは使えなくなります。すでに入会した人とのつながりは残ります。",
        okLabel: "作り直す",
        danger: true,
      });
      if (!confirmed) return;
    }
    setPending(true); setError("");
    try {
      const supabase = createClient();
      const { data, error: issueError } = await supabase.rpc("sakaba_create_my_member_invite", {
        p_guild_slug: "gia",
        p_rotate: rotate,
      });
      if (issueError) throw issueError;
      const { data: fresh, error: getError } = await supabase.rpc("sakaba_get_my_member_invite", { p_guild_slug: "gia" });
      if (getError) throw getError;
      setInvite(fresh as MyMemberInvite);
      try {
        await navigator.clipboard.writeText(inviteUrl(window.location.origin, data.code));
        uiToast(rotate ? "新しい招待リンクを作ってコピーしました" : "招待リンクを作ってコピーしました");
      } catch {
        uiToast("招待リンクを作りました。下のボタンからコピーできます");
      }
      router.refresh();
    } catch {
      setError("招待リンクを作れませんでした。画面を読み直して再度お試しください。");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!invite.link) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(window.location.origin, invite.link.code));
      uiToast("招待リンクをコピーしました");
    } catch {
      setError("コピーできませんでした。ブラウザの権限設定を確認してください。");
    }
  }

  // 招待文（あいさつ＋リンク）。そのまま貼って送れる。
  async function copyMessage() {
    if (!invite.link) return;
    try {
      await navigator.clipboard.writeText(inviteMessage(inviteUrl(window.location.origin, invite.link.code)));
      uiToast("招待文をコピーしました");
    } catch {
      setError("コピーできませんでした。ブラウザの権限設定を確認してください。");
    }
  }

  // 端末の共有画面（LINE・メール・メッセージなど）を開く。閉じただけならエラーにしない。
  async function share() {
    if (!invite.link || sharing.current) return;
    sharing.current = true;
    try {
      await navigator.share({
        title: "GIAの酒場への招待",
        text: inviteMessage(inviteUrl(window.location.origin, invite.link.code)),
      });
    } catch (e) {
      if (!isShareCancel(e)) setError("共有できませんでした。「招待文をコピー」から送ってください。");
    } finally {
      sharing.current = false;
    }
  }

  const lineHref = invite.link && origin ? lineShareUrl(inviteMessage(inviteUrl(origin, invite.link.code))) : "";

  return <Window title="仲間を招く">
    <p className="c-muted mb-5 text-sm leading-relaxed">あなたから酒場へ招くためのリンクです。</p>
    {invite.link ? <div className="border-2 border-dashed border-[#1b2a41] bg-[#fffdf6] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2a41]/20 pb-3 text-xs tracking-wider">
        <span>YOUR INVITATION</span><span className="c-muted">{formatDate(invite.link.created_at)} 発行</span>
      </div>
      <p className="mt-4 text-base tracking-wider">酒場への招待状</p>
      <p className="c-muted mt-2 text-xs leading-relaxed">このリンクを受け取った人は、入会フォームを開けます。</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {lineHref && <a href={lineHref} target="_blank" rel="noopener noreferrer" className="rpg-button inline-flex h-11 items-center px-5 text-sm">▶ LINEで送る</a>}
        {canShare && <button type="button" onClick={() => void share()} className="rpg-button h-11 px-5 text-sm">▶ ほかのアプリで送る</button>}
        <button type="button" onClick={() => void copyMessage()} className="c-button-sub h-11 px-4 text-sm">招待文をコピー</button>
        <button type="button" onClick={() => void copy()} className="c-button-sub h-11 px-4 text-sm">リンクだけコピー</button>
      </div>
      <p className="c-muted mt-3 text-xs leading-relaxed">招待文は「酒場に招待します。フリープラン（0円）で入会できます」という短いあいさつと、リンクです。</p>
      <div className="mt-4 border-t border-[#1b2a41]/20 pt-3">
        <button type="button" disabled={pending} onClick={() => void issue(true)} className="c-button-sub h-11 px-4 text-sm disabled:opacity-50">{pending ? "作り直し中…" : "リンクを作り直す"}</button>
      </div>
    </div> : <button type="button" disabled={pending} onClick={() => void issue(false)} className="rpg-button h-11 px-5 text-sm disabled:opacity-50">{pending ? "発行中…" : "▶ 自分の招待リンクを作る"}</button>}
    {error && <p role="alert" className="mt-3 text-sm text-[#c62828]">{error}</p>}
    <div className="mt-6 border-t-2 border-dashed border-[#1b2a41]/20 pt-4">
      <p className="text-sm tracking-wider">あなたの招待から入った人 <span className="c-muted">{invite.people.length}人</span></p>
      {invite.people.length === 0 ? <p className="c-muted mt-3 text-sm">まだいません。招待リンクを、酒場に迎えたい人へ送ってください。</p> :
        <ul className="mt-3 space-y-2">{invite.people.map((person) => <li key={person.user_id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2a41]/10 pb-2 text-sm">
          <Link href={`/guild/members/${person.user_id}`} className="underline underline-offset-4">{person.display_name}</Link>
          <span className="c-muted text-xs">{formatDate(person.joined_at)} 入会{person.suspended ? "・停止中" : ""}</span>
        </li>)}</ul>}
    </div>
  </Window>;
}
