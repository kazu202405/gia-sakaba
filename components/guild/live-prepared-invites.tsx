"use client";

import { useState, type FormEvent } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import { Window } from "./cards";
import { createClient } from "@/lib/supabase/client";
import { formatDate, positionLabel } from "@/lib/guild/labels";
import { PREPARED_INTRODUCTION_MAX, validatePreparedInvite, type MasterPreparedInvite, type PreparedInvite } from "@/lib/guild/prepared-invites";
import { countDraftFields, draftHasContent, draftRpcArgs, emptyDraftFields, parseInviteProfileDrafts, pickDraftFields, validateProfileDraft, type InviteProfileDraft, type ProfileDraftFields } from "@/lib/guild/profile-drafts";
import { ProfileDraftInputs } from "./profile-draft-fields";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import type { Position } from "@/lib/guild/types";
import { inviteUrl as sharedInviteUrl } from "@/lib/guild/invite-share";
import { useGuildStore } from "@/components/guild/store-context";
import { Go } from "./go-mark";

const emptyDraft: PreparedInvite = { display_name: "", company_name: "", position: "", introduction: "" };

function inviteUrl(code: string) {
  return sharedInviteUrl(window.location.origin, code);
}

function inviteStatus(invite: MasterPreparedInvite) {
  if (invite.revoked_at) return "無効";
  if (invite.used_count > 0) return "入会済み";
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) return "期限切れ";
  return "招待中";
}

// initialDrafts：入会前のステータスの下書き（0130）。null は読めなかったとき（未適用など）で、その入力欄は出さない
export function LivePreparedInvites({ initial, initialDrafts }: { initial: MasterPreparedInvite[]; initialDrafts: InviteProfileDraft[] | null }) {
  const store = useGuildStore();
  const router = useGuildRouter();
  const [draft, setDraft] = useState<PreparedInvite>(emptyDraft);
  const [statusDrafts, setStatusDrafts] = useState(initialDrafts);
  const [statusDraft, setStatusDraft] = useState<ProfileDraftFields>(emptyDraftFields);
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
    const statusValidation = statusDrafts ? validateProfileDraft(statusDraft, store.w) : null;
    if (statusValidation) { setError(statusValidation); return; }
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
        : await supabase.rpc("sakaba_create_prepared_invite", { p_guild_slug: store.slug, ...fields });
      if (saveError || (!editingId && !data?.code)) throw saveError ?? new Error("招待状を保存できませんでした");
      if (!editingId) setNewUrl(inviteUrl(data.code));
      // ステータスの下書き：招待状ができてから、同じ招待状にひもづけて保存する。
      // 編集のときは全部空でも送る（空にして保存すると、待っている下書きを取り下げる）
      const inviteId = editingId ?? (data as { id: string }).id;
      let statusDraftFailed = false;
      if (statusDrafts && (editingId || draftHasContent(statusDraft))) {
        const { error: draftError } = await supabase.rpc("sakaba_save_invite_profile_draft", { p_invite_id: inviteId, ...draftRpcArgs(statusDraft) });
        if (draftError) statusDraftFailed = true;
        else {
          const { data: draftList, error: draftListError } = await supabase.rpc("sakaba_list_invite_profile_drafts", { p_guild_slug: store.slug });
          if (!draftListError) setStatusDrafts(parseInviteProfileDrafts(draftList));
        }
      }
      const { data: list, error: listError } = await supabase.rpc("sakaba_list_prepared_invites", { p_guild_slug: store.slug });
      if (listError) setError("保存しましたが一覧を更新できませんでした。画面を読み直してください。");
      else setInvites(Array.isArray(list) ? list as MasterPreparedInvite[] : []);
      if (statusDraftFailed) {
        // 招待状はできている。下書きだけ保存し直せるよう、この招待状の編集に切り替えて入力を残す
        setEditingId(inviteId);
        setError(store.w("prep.saveFailed"));
        router.refresh();
        return;
      }
      setDraft(emptyDraft);
      setStatusDraft(emptyDraftFields);
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
    const savedStatusDraft = statusDrafts?.find((item) => item.invite_id === invite.id);
    setStatusDraft(savedStatusDraft ? pickDraftFields(savedStatusDraft) : emptyDraftFields);
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
      {statusDrafts ? <details className="c-card p-4" open={draftHasContent(statusDraft)}>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-sm">
          <span>{store.w("prep.write")}</span><span className="c-muted text-xs">任意</span>
        </summary>
        <div className="mt-4 space-y-4">
          <p className="c-muted text-xs leading-relaxed">仕事内容などを、本人の代わりに下書きできます。入会したあと、本人が見て「載せる」を選ぶまで、誰にも見えません。本人が書いた項目は上書きしません。</p>
          <ProfileDraftInputs value={statusDraft} onChange={(next) => { setStatusDraft(next); setError(""); }} />
        </div>
      </details> : <p className="c-muted text-xs">{store.w("prep.unreadable")}</p>}
      <p className="c-muted text-xs">メールアドレスやパスワードは本人が入力します。招待状は1人用・30日間有効です。</p>
      {error && <p role="alert" className="text-sm text-[#b52a2a]">{error}</p>}
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={pending !== null} className="rpg-button min-h-11 px-5 text-sm disabled:opacity-50">{pending ? "保存中…" : editingId ? <><Go />下書きを保存する</> : <><Go />仮登録の招待状を作る</>}</button>
        {editingId && <button type="button" disabled={pending !== null} onClick={() => { setEditingId(null); setDraft(emptyDraft); setStatusDraft(emptyDraftFields); setError(""); }} className="c-button-sub min-h-11 px-4 text-sm">編集をやめる</button>}
      </div>
    </form>
    {newUrl && <div role="status" className="c-card mt-5 p-4"><p className="mb-2 text-sm">招待状ができました。このURLを本人へ渡してください。</p><input className="c-input w-full text-xs" readOnly value={newUrl} onFocus={(event) => event.target.select()} /></div>}
    <div className="mt-7 border-t border-guild-ink/20 pt-5">
      <p className="mb-3 text-sm tracking-wider">作成した招待状 <span className="c-muted">{invites.length}件</span></p>
      {invites.length === 0 ? <p className="c-muted text-sm">まだありません。</p> : <ul className="space-y-3">{invites.map((invite) => {
        const status = inviteStatus(invite);
        return <li key={invite.id} className="c-card min-w-0 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="break-words text-sm">{invite.display_name} <span className="c-muted">{invite.company_name && `・${invite.company_name}`}</span></p><span className="c-chip text-xs">{status}</span></div>
          <p className="c-muted mt-1 text-xs">{formatDate(invite.created_at)} 作成{invite.expires_at && ` ・ ${formatDate(invite.expires_at)}まで`}</p>
          {invite.introduction && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{invite.introduction}</p>}
          {status === "招待中" && (() => {
            const saved = statusDrafts?.find((item) => item.invite_id === invite.id);
            return saved && draftHasContent(saved) ? <p className="c-muted mt-2 text-xs">{store.w("prep.exists", { count: countDraftFields(saved) })}</p> : null;
          })()}
          {status === "招待中" && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void copy(invite.code)} className="c-button-sub min-h-10 px-4 text-sm">リンクをコピー</button><button type="button" disabled={pending !== null} onClick={() => edit(invite)} className="c-button-sub min-h-10 px-4 text-sm">下書きを直す</button><button type="button" disabled={pending !== null} onClick={() => void revoke(invite)} className="c-button-sub min-h-10 px-4 text-sm disabled:opacity-50">{pending === invite.id ? "無効化中…" : "無効にする"}</button></div>}
        </li>;
      })}</ul>}
    </div>
  </Window>;
}
