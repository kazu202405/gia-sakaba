"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GuildMasterInvite } from "@/lib/guild/server-data";
import { formatDate } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";

function inviteStatus(invite: GuildMasterInvite) {
  if (invite.revoked_at) return "無効";
  if (invite.used_count >= invite.max_uses) return "使用済み";
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) return "期限切れ";
  return "有効";
}

function inviteUrl(code: string) {
  return `${window.location.origin}/guild/join?invite=${encodeURIComponent(code)}`;
}

export function LiveMasterInvites({ initial }: { initial: GuildMasterInvite[] }) {
  const router = useRouter();
  const [invites, setInvites] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function createInvite() {
    if (pending) return;
    setPending("create"); setError("");
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("sakaba_create_master_invite", { p_guild_slug: "gia" });
      if (rpcError) throw rpcError;
      const { data: list, error: listError } = await supabase.rpc("sakaba_list_master_invites", { p_guild_slug: "gia" });
      if (listError) throw listError;
      setInvites(Array.isArray(list) ? list as GuildMasterInvite[] : []);
      try {
        await navigator.clipboard.writeText(inviteUrl(data.code));
        uiToast("招待リンクを発行してコピーしました");
      } catch {
        uiToast("招待リンクを発行しました。下の「コピー」から共有してください");
      }
      router.refresh();
    } catch {
      setError("招待リンクを発行できませんでした。少し待って再度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function revokeInvite(invite: GuildMasterInvite) {
    if (pending) return;
    const confirmed = await uiConfirm({
      title: "招待リンクを無効にします",
      message: "このリンクでは参加できなくなります。すでに参加した人はそのまま残ります。",
      okLabel: "無効にする",
      danger: true,
    });
    if (!confirmed) return;
    setPending(invite.id); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_revoke_master_invite", { p_invite_id: invite.id });
      if (rpcError) throw rpcError;
      setInvites((current) => current.map((item) => item.id === invite.id ? { ...item, revoked_at: new Date().toISOString() } : item));
      uiToast("招待リンクを無効にしました");
      router.refresh();
    } catch {
      setError("リンクを無効にできませんでした。画面を読み直して再度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function copyInvite(code: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      uiToast("招待リンクをコピーしました");
    } catch {
      setError("コピーできませんでした。ブラウザの権限設定を確認してください。");
    }
  }

  return <Window title="招待リンク" action={<span className="c-muted text-xs">発行済み {invites.length}件</span>}>
    <p className="c-muted mb-4 text-sm leading-relaxed">ここで発行するリンクは1人用・30日間有効です。メンバーがマイページで作った個人リンクも、参加した人と一緒にここへ表示されます。現在はGIAのログインアカウントを持つ人が参加できます。</p>
    <button type="button" disabled={pending !== null} onClick={() => void createInvite()} className="rpg-button h-11 px-5 text-sm disabled:opacity-50">{pending === "create" ? "発行中…" : "▶ 招待リンクを発行"}</button>
    {error && <p role="alert" className="mt-4 text-sm text-[#c62828]">{error}</p>}
    {invites.length === 0 ? <p className="c-muted mt-5 text-sm">招待リンクはまだありません。</p> :
      <ul className="mt-5 space-y-4">{invites.map((invite) => {
        const status = inviteStatus(invite);
        return <li key={invite.id} className="c-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">{formatDate(invite.created_at)} 発行 <span className="c-muted">{invite.created_by_name && `・${invite.created_by_name}`}</span></div>
            <span className="c-chip text-xs">{status}</span>
          </div>
          <p className="c-muted mt-1 text-xs">{invite.max_uses > 1 ? "メンバーの個人リンク" : "1人用リンク"} ・ {invite.expires_at ? `${formatDate(invite.expires_at)}まで` : "期限なし"} ・ {invite.used_count}人が使用</p>
          {status === "有効" && <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void copyInvite(invite.code)} className="c-button-sub h-10 px-4 text-sm">リンクをコピー</button>
            <button type="button" disabled={pending !== null} onClick={() => void revokeInvite(invite)} className="c-button-sub h-10 px-4 text-sm disabled:opacity-50">{pending === invite.id ? "無効化中…" : "無効にする"}</button>
          </div>}
          {invite.members.length > 0 && <div className="mt-4 border-t border-[#1b2a41]/20 pt-3">
            <p className="c-muted mb-2 text-xs">このリンクで参加した人</p>
            <ul className="space-y-1">{invite.members.map((member) => <li key={member.user_id} className="flex flex-wrap items-center gap-x-3 text-sm">
              <Link href={`/guild/members/${member.user_id}`} className="underline underline-offset-4">{member.display_name}</Link>
              <span className="c-muted text-xs">{formatDate(member.joined_at)} 参加{member.suspended ? "・停止中" : ""}</span>
            </li>)}</ul>
          </div>}
        </li>;
      })}</ul>}
  </Window>;
}
