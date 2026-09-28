"use client";

import { useState, type FormEvent } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import { Window } from "./cards";
import { createClient } from "@/lib/supabase/client";
import { formatDate, positionLabel } from "@/lib/guild/labels";
import { PREPARED_INTRODUCTION_MAX, validatePreparedInvite, type MasterPreparedInvite, type PreparedInvite } from "@/lib/guild/prepared-invites";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import type { Position } from "@/lib/guild/types";

const emptyDraft: PreparedInvite = { display_name: "", company_name: "", position: "", introduction: "" };

function inviteUrl(code: string) {
  return `${window.location.origin}/guild/join?invite=${encodeURIComponent(code)}`;
}

function inviteStatus(invite: MasterPreparedInvite) {
  if (invite.revoked_at) return "無効";
  if (invite.used_count > 0) return "入会済み";
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) return "期限切れ";
  return "招待中";
}

export function LivePreparedInvites({ initial }: { initial: MasterPreparedInvite[] }) {
  const router = useGuildRouter();
  const [draft, setDraft] = useState<PreparedInvite>(emptyDraft);
  const [invites, setInvites] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [newUrl, setNewUrl] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const validation = validatePreparedInvite(draft);
    if (validation) { setError(validation); return; }
    setPending(editingId ?? "create"); setError(""); setNewUrl("");
    try {
      const supabase = createClient();
      const fields = {
        p_display_name: draft.display_name.trim(),
        p_company_name: draft.company_name.trim(),
        p_position: draft.position,
        p_introduction: draft.introduction.trim(),
      };
      const { data, error: saveError } = editingId
        ? await supabase.rpc("sakaba_update_prepared_invite", { p_invite_id: editingId, ...fields })
        : await supabase.rpc("sakaba_create_prepared_invite", { p_guild_slug: "gia", ...fields });
      if (saveError || (!editingId && !data?.code)) throw saveError ?? new Error("招待状を保存できませんでした");
      if (!editingId) setNewUrl(inviteUrl(data.code));
      const { data: list, error: listError } = await supabase.rpc("sakaba_list_prepared_invites", { p_guild_slug: "gia" });
      if (listError) setError("保存しましたが一覧を更新できませんでした。画面を読み直してください。");
      else setInvites(Array.isArray(list) ? list as MasterPreparedInvite[] : []);
      setDraft(emptyDraft);
      setEditingId(null);
      uiToast(editingId ? "招待状の下書きを更新しました" : "仮登録の招待状を作成しました");
      router.refresh();
    } catch {
      setError("招待状を保存できませんでした。内容を確認して再度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      uiToast("招待リンクをコピーしました");
    } catch {
      setError("コピーできませんでした。作成直後のリンクを手動でコピーするか、ブラウザの権限を確認してください。");
    }
  }

  async function revoke(invite: MasterPreparedInvite) {
    if (pending) return;
    const confirmed = await uiConfirm({
      title: "仮登録の招待状を無効にします",
      message: "このリンクでは入会できなくなります。入会済みの人は削除されません。",
      okLabel: "無効にする", danger: true,
    });
    if (!confirmed) return;
    setPending(invite.id); setError("");
    try {
      const { error: revokeError } = await createClient().rpc("sakaba_revoke_master_invite", { p_invite_id: invite.id });
      if (revokeError) throw revokeError;
      setInvites((current) => current.map((item) => item.id === invite.id ? { ...item, revoked_at: new Date().toISOString() } : item));
      uiToast("招待状を無効にしました");
      router.refresh();
    } catch {
      setError("招待状を無効にできませんでした。読み直して再度お試しください。");
    } finally {
      setPending(null);
    }
  }

  function edit(invite: MasterPreparedInvite) {
    setEditingId(invite.id);
    setDraft({ display_name: invite.display_name, company_name: invite.company_name, position: invite.position, introduction: invite.introduction });
    setError(""); setNewUrl("");
    document.getElementById("prepared-invite-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <Window title="メンバーの仮登録">
    <p className="text-sm leading-relaxed">先に分かる範囲だけ書いて、1人用の招待状を渡せます。相手が内容を確認・修正して入会するまでは、名鑑には載りません。</p>
    <form id="prepared-invite-form" onSubmit={(event) => void create(event)} className="mt-5 space-y-4">
      {editingId && <p className="c-card px-3 py-2 text-sm">招待状を編集中です。保存すると、同じリンクで新しい内容が表示されます。</p>}
      <label className="block text-sm">お名前 <span className="text-[#b52a2a]">必須</span>
        <input className="c-input mt-1 h-11" value={draft.display_name} onChange={(event) => setDraft({ ...draft, display_name: event.target.value })} maxLength={30} placeholder="例：山田 太郎" required />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">会社名・屋号 <span className="c-muted text-xs">任意</span>
          <input className="c-input mt-1 h-11" value={draft.company_name} onChange={(event) => setDraft({ ...draft, company_name: event.target.value })} maxLength={60} placeholder="分からなければ空欄でOK" />
        </label>
        <label className="block text-sm">役職 <span className="c-muted text-xs">任意</span>
          <select className="c-input mt-1 h-11" value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value as Position | "" })}>
            <option value="">本人に選んでもらう</option>
            {(Object.keys(positionLabel) as Position[]).map((position) => <option key={position} value={position}>{positionLabel[position]}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">あなたから見た、その人の紹介 <span className="c-muted text-xs">任意</span>
        <textarea className="c-input mt-1 min-h-28 resize-y p-3" value={draft.introduction} onChange={(event) => setDraft({ ...draft, introduction: event.target.value })} maxLength={PREPARED_INTRODUCTION_MAX} placeholder="一緒に仕事をしていなくても、人柄や話してみて感じた魅力などを。" />
        <span className="c-muted mt-1 block text-xs">{draft.introduction.length} / {PREPARED_INTRODUCTION_MAX}字。本人が掲載に同意したときだけ紹介状になります。</span>
      </label>
      <p className="c-muted text-xs">メールアドレスやパスワードは本人が入力します。招待状は1人用・30日間有効です。</p>
      {error && <p role="alert" className="text-sm text-[#b52a2a]">{error}</p>}
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={pending !== null} className="rpg-button min-h-11 px-5 text-sm disabled:opacity-50">{pending ? "保存中…" : editingId ? "▶ 下書きを保存する" : "▶ 仮登録の招待状を作る"}</button>
        {editingId && <button type="button" disabled={pending !== null} onClick={() => { setEditingId(null); setDraft(emptyDraft); setError(""); }} className="c-button-sub min-h-11 px-4 text-sm">編集をやめる</button>}
      </div>
    </form>
    {newUrl && <div role="status" className="c-card mt-5 p-4"><p className="mb-2 text-sm">招待状ができました。このURLを本人へ渡してください。</p><input className="c-input w-full text-xs" readOnly value={newUrl} onFocus={(event) => event.target.select()} /></div>}
    <div className="mt-7 border-t border-[#1b2a41]/20 pt-5">
      <p className="mb-3 text-sm tracking-wider">作成した招待状 <span className="c-muted">{invites.length}件</span></p>
      {invites.length === 0 ? <p className="c-muted text-sm">まだありません。</p> : <ul className="space-y-3">{invites.map((invite) => {
        const status = inviteStatus(invite);
        return <li key={invite.id} className="c-card min-w-0 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="break-words text-sm">{invite.display_name} <span className="c-muted">{invite.company_name && `・${invite.company_name}`}</span></p><span className="c-chip text-xs">{status}</span></div>
          <p className="c-muted mt-1 text-xs">{formatDate(invite.created_at)} 作成{invite.expires_at && ` ・ ${formatDate(invite.expires_at)}まで`}</p>
          {invite.introduction && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{invite.introduction}</p>}
          {status === "招待中" && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void copy(invite.code)} className="c-button-sub min-h-10 px-4 text-sm">リンクをコピー</button><button type="button" disabled={pending !== null} onClick={() => edit(invite)} className="c-button-sub min-h-10 px-4 text-sm">下書きを直す</button><button type="button" disabled={pending !== null} onClick={() => void revoke(invite)} className="c-button-sub min-h-10 px-4 text-sm disabled:opacity-50">{pending === invite.id ? "無効化中…" : "無効にする"}</button></div>}
        </li>;
      })}</ul>}
    </div>
  </Window>;
}
