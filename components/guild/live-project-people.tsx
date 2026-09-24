"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, X } from "lucide-react";
import type { GuildProjectPipeline } from "@/lib/guild/server-data";
import type { Profile } from "@/lib/guild/types";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { DateInput, TextInput } from "./form-parts";
import { ProjectMemberCombobox } from "./project-member-combobox";

type Selection = { kind: "contact"; contactId: string } | { kind: "cell"; contactId: string; stepId: string } | null;

function todayInJapan() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shortDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function LiveProjectPeople({ projectId, pipeline, members, editable }: { projectId: string; pipeline: GuildProjectPipeline; members: Profile[]; editable: boolean }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(null);
  const [newContactLabel, setNewContactLabel] = useState("");
  const [newMemberId, setNewMemberId] = useState<string | null>(null);
  const [editContactLabel, setEditContactLabel] = useState("");
  const [memo, setMemo] = useState("");
  const [stepName, setStepName] = useState("");
  const [planned, setPlanned] = useState("");
  const [done, setDone] = useState("");
  const [editingSteps, setEditingSteps] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const busy = !!saving || isPending;

  async function run(name: string, args: Record<string, unknown>, action: string, onSuccess?: () => void) {
    if (busy) return;
    setSaving(action); setError("");
    try {
      const { error: rpcError } = await createClient().rpc(name, args);
      if (rpcError) setError(rpcError.code === "23505" && name === "sakaba_add_project_contact_v2" ? "このメンバーはすでに追加されています。" : `${action}に失敗しました。もう一度お試しください。`);
      else {
        onSuccess?.();
        if (action === "相手の追加") uiToast("相手を追加しました");
        startTransition(() => { router.refresh(); });
      }
    } catch {
      setError("通信に失敗しました。接続を確認してもう一度お試しください。");
    } finally {
      setSaving("");
    }
  }

  function selectContact(contactId: string) {
    const contact = pipeline.contacts.find((item) => item.id === contactId);
    if (!contact) return;
    setSelection({ kind: "contact", contactId });
    setEditContactLabel(contact.label); setMemo(contact.memo); setError("");
  }

  function selectCell(contactId: string, stepId: string) {
    const record = pipeline.records.find((item) => item.contact_id === contactId && item.step_id === stepId);
    setSelection({ kind: "cell", contactId, stepId });
    setPlanned(record?.planned_on ?? ""); setDone(record?.done_on ?? ""); setError("");
  }

  async function deleteContact(contactId: string, contactLabel: string) {
    if (busy) return;
    const confirmed = await uiConfirm({
      title: "相手を削除する",
      message: `「${contactLabel}」と、この人に記録したすべての日付を削除します。元に戻せません。`,
      okLabel: "削除する",
      danger: true,
    });
    if (!confirmed) return;
    await run("sakaba_delete_project_contact", { p_contact_id: contactId }, "削除", () => setSelection(null));
  }

  const selectedContact = pipeline.contacts.find((item) => item.id === selection?.contactId);
  const selectedStep = selection?.kind === "cell" ? pipeline.steps.find((item) => item.id === selection.stepId) : undefined;
  const selectedRecord = selection?.kind === "cell" ? pipeline.records.find((item) => item.contact_id === selection.contactId && item.step_id === selection.stepId) : undefined;

  if (pipeline.steps.length === 0) {
    return <div className="space-y-4">
      <p className="c-muted text-sm leading-relaxed">相手を行に、進める手順を列に並べ、予定日と完了日を記録します。呼び名と短いメモだけを扱い、連絡先は保存しません。</p>
      {editable && <button type="button" disabled={busy} onClick={() => run("sakaba_enable_project_steps", { p_project_id: projectId }, "開始")} className="c-button-sub c-wrap-button px-4 disabled:opacity-50">{busy ? "準備中…" : "▶ あいてごとの じょうきょうを きろくする"}</button>}
      {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
    </div>;
  }

  return <div className="space-y-5">
    <p className="c-muted text-xs leading-relaxed">行＝相手、列＝手順。ます目を選ぶと予定日と完了日を記録できます。</p>
    <div className="overflow-x-auto border-2 border-[#1b2a41]">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead><tr className="bg-[#f3ecd9]">
          <th scope="col" className="sticky left-0 z-10 min-w-28 bg-[#f3ecd9] px-3 py-2 text-left text-xs font-normal">相手</th>
          {pipeline.steps.map((step) => <th key={step.id} scope="col" className="min-w-20 px-2 py-2 text-center text-xs font-normal">{step.name}</th>)}
        </tr></thead>
        <tbody>{pipeline.contacts.length === 0 ? <tr><td colSpan={pipeline.steps.length + 1} className="c-muted px-3 py-5 text-sm">まだ相手がいません。下から追加してください。</td></tr> :
          pipeline.contacts.map((contact) => <tr key={contact.id} className="border-t-2 border-dashed border-[#1b2a41]/15">
            <th scope="row" className="sticky left-0 z-10 bg-[#fffdf6] p-2 text-left font-normal">
              <button type="button" disabled={!editable} onClick={() => selectContact(contact.id)} aria-label={`${contact.label}の名前とメモを編集`} className="block w-full text-left text-xs hover:underline disabled:cursor-default">{contact.label}{contact.memo && <span className="c-muted block text-[11px]">{contact.memo}</span>}</button>
              {contact.member_user_id && members.some((member) => member.id === contact.member_user_id) && <Link href={`/guild/members/${contact.member_user_id}`} className="c-muted mt-1 block text-[10px] underline underline-offset-2">メンバーを見る ↗</Link>}
            </th>
            {pipeline.steps.map((step) => {
              const record = pipeline.records.find((item) => item.contact_id === contact.id && item.step_id === step.id);
              return <td key={step.id} className="p-1 text-center">
                <button type="button" disabled={!editable} onClick={() => selectCell(contact.id, step.id)} aria-label={`${contact.label}の${step.name}を編集`} className="min-h-10 w-full px-1 text-xs tabular-nums hover:outline-2 hover:outline-[#1b2a41] disabled:cursor-default">
                  {record?.done_on ? <span className="bg-[#1b2a41] px-1 text-[#fffdf6]">✓ {shortDate(record.done_on)}</span> : record?.planned_on ? <span className="c-muted">{shortDate(record.planned_on)} 予定</span> : <span className="c-muted">―</span>}
                </button>
              </td>;
            })}
          </tr>)}</tbody>
      </table>
    </div>

    {selection?.kind === "cell" && selectedContact && selectedStep && <div className="c-card space-y-4 p-4">
      <p className="text-sm">{selectedContact.label}：{selectedStep.name}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><p className="c-muted mb-1 text-xs">予定日</p><DateInput value={planned} onChange={setPlanned} label="予定日" /></div>
        <div><p className="c-muted mb-1 text-xs">おわった日</p><DateInput value={done} onChange={setDone} label="おわった日" /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => run("sakaba_set_project_step_record", { p_contact_id: selection.contactId, p_step_id: selection.stepId, p_planned_on: planned || null, p_done_on: todayInJapan() }, "記録")} className="rpg-button h-11 px-4 disabled:opacity-50">今日おわった</button>
        <button type="button" disabled={busy || (!planned && !done)} onClick={() => run("sakaba_set_project_step_record", { p_contact_id: selection.contactId, p_step_id: selection.stepId, p_planned_on: planned || null, p_done_on: done || null }, "保存")} className="c-button-sub h-11 px-4 disabled:opacity-50">日付を保存</button>
        {selectedRecord && <button type="button" disabled={busy} onClick={() => run("sakaba_set_project_step_record", { p_contact_id: selection.contactId, p_step_id: selection.stepId, p_planned_on: null, p_done_on: null }, "日付の消去")} className="c-muted px-2 text-xs underline disabled:opacity-50">日付を消す</button>}
        <button type="button" onClick={() => setSelection(null)} className="c-muted ml-auto px-2 text-xs">閉じる</button>
      </div>
    </div>}

    {selection?.kind === "contact" && selectedContact && <form onSubmit={(event) => { event.preventDefault(); run("sakaba_update_project_contact", { p_contact_id: selection.contactId, p_label: editContactLabel.trim(), p_memo: memo.trim() }, "相手の更新"); }} className="c-card space-y-3 p-4">
      <p className="text-sm">名前とメモを編集</p>
      <div><p className="c-muted mb-1 text-xs">呼び名</p><TextInput value={editContactLabel} onChange={setEditContactLabel} max={30} label="呼び名" /></div>
      <div><p className="c-muted mb-1 text-xs">ひとことメモ</p><TextInput value={memo} onChange={setMemo} max={100} label="ひとことメモ" /></div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || !editContactLabel.trim()} className="rpg-button h-11 px-4 disabled:opacity-50">{saving === "相手の更新" ? "保存中…" : "保存"}</button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" disabled={busy} onClick={() => deleteContact(selectedContact.id, selectedContact.label)} aria-label="この人を削除" title="この人を削除" className="flex h-11 w-11 items-center justify-center text-[#c62828] hover:bg-[#c62828]/10 focus-visible:outline-2 focus-visible:outline-[#c62828] disabled:opacity-50"><Trash2 size={18} aria-hidden /></button>
          <button type="button" onClick={() => setSelection(null)} aria-label="閉じる" title="閉じる" className="c-muted flex h-11 w-11 items-center justify-center hover:bg-[#1b2a41]/10 focus-visible:outline-2 focus-visible:outline-[#1b2a41]"><X size={20} aria-hidden /></button>
        </div>
      </div>
    </form>}

    {editable && <form onSubmit={(event) => { event.preventDefault(); if (!newContactLabel.trim()) return; void run("sakaba_add_project_contact_v2", { p_project_id: projectId, p_label: newContactLabel.trim(), p_member_user_id: newMemberId }, "相手の追加", () => { setNewContactLabel(""); setNewMemberId(null); }); }} className="space-y-2">
      <p className="text-sm">相手を追加</p>
      <div className="flex gap-2"><ProjectMemberCombobox members={members} label={newContactLabel} selectedMemberId={newMemberId} disabled={busy} onChange={(label, memberId) => { setNewContactLabel(label); setNewMemberId(memberId); }} /><button type="submit" disabled={busy || !newContactLabel.trim()} aria-busy={busy} className="rpg-button h-11 shrink-0 px-4 disabled:opacity-50">{saving === "相手の追加" ? "追加中…" : isPending ? "読み込み中…" : "追加"}</button></div>
    </form>}

    {editable && <div className="c-dashed-top pt-4">
      <button type="button" onClick={() => setEditingSteps(!editingSteps)} className="c-muted text-xs underline">{editingSteps ? "手順の編集を閉じる" : "手順（列）をなおす"}</button>
      {editingSteps && <div className="mt-4 space-y-3">
        {pipeline.steps.map((step) => <StepNameEditor key={step.id} step={step} busy={busy} run={run} />)}
        <form onSubmit={(event) => { event.preventDefault(); if (!stepName.trim()) return; run("sakaba_add_project_step", { p_project_id: projectId, p_name: stepName.trim() }, "手順の追加", () => setStepName("")); }} className="flex gap-2">
          <div className="min-w-0 flex-1"><TextInput value={stepName} onChange={setStepName} max={12} label="新しい手順" placeholder="例：見積" /></div>
          <button type="submit" disabled={busy || !stepName.trim() || pipeline.steps.length >= 12} className="c-button-sub h-11 shrink-0 px-3 text-xs disabled:opacity-50">右に足す</button>
        </form>
      </div>}
    </div>}
    <p role="status" aria-live="polite" className="c-muted min-h-4 text-xs">{saving ? `${saving}中…` : isPending ? "読み込み中…" : ""}</p>
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
  </div>;
}

function StepNameEditor({ step, busy, run }: { step: GuildProjectPipeline["steps"][number]; busy: boolean; run: (name: string, args: Record<string, unknown>, action: string) => Promise<void> }) {
  const [name, setName] = useState(step.name);
  return <div className="flex gap-2"><div className="min-w-0 flex-1"><TextInput value={name} onChange={setName} max={12} label={`${step.name}の名前`} /></div>
    <button type="button" disabled={busy || !name.trim() || name.trim() === step.name} onClick={() => run("sakaba_rename_project_step", { p_step_id: step.id, p_name: name.trim() }, "手順の更新")} className="c-button-sub h-11 shrink-0 px-3 text-xs disabled:opacity-50">なおす</button>
  </div>;
}
