"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import Link from "next/link";
import { Loader2, Trash2, X } from "lucide-react";
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
  const router = useGuildRouter();
  const [selection, setSelection] = useState<Selection>(null);
  const [newContactLabel, setNewContactLabel] = useState("");
  const [newMemberId, setNewMemberId] = useState<string | null>(null);
  const [editContactLabel, setEditContactLabel] = useState("");
  const [memo, setMemo] = useState("");
  const [stepName, setStepName] = useState("");
  // ます目の日付は1つだけ。「おわった」にチェックがあれば完了日、なければ予定日として保存する
  const [cellDate, setCellDate] = useState("");
  const [cellFinished, setCellFinished] = useState(false);
  const [cellResult, setCellResult] = useState<"ok" | "ng" | null>(null);
  // ます目の入力は、変えて少し待つと自動で保存する（editVersion＝直したたびに増える印、savedVersion＝保存に出した版）
  const [editVersion, setEditVersion] = useState(0);
  const savedVersion = useRef(0);
  // 過去の日付を入れたときは「おわった」を自動でつける（記録のための入力なので、毎回チェックしなくてよい）。チェックを手で触ったら 触らない
  const finishedTouched = useRef(false);
  const [editingSteps, setEditingSteps] = useState(false);
  // フォローアップ表の絞り込み（一番右の手順の結果で分ける）
  const [followUpTab, setFollowUpTab] = useState<"all" | "ok" | "ng" | "undecided">("all");
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const busy = !!saving || isPending;
  // ます目の保存は、ます目の中に「保存中…」が出る。下の共通の表示（読み込み中…）は 出さない
  const [lastAction, setLastAction] = useState("");
  // 追加した直後〜一覧が読み直されるまで出しておく仮の行（トーストだけ先に出て相手が増えない時間を作らない）
  const [addingContacts, setAddingContacts] = useState<{ key: number; label: string }[]>([]);
  // 日付を保存した直後〜一覧が読み直されるまでは、保存した日付を先にます目へ出す
  const [recordOverride, setRecordOverride] = useState<Record<string, { planned_on: string | null; done_on: string | null; result: "ok" | "ng" | null }>>({});
  // 削除を確定した手順は、消える処理が終わって一覧が読み直されるまで隠しておき、編集欄には「削除中…」を出す
  const [hiddenSteps, setHiddenSteps] = useState<string[]>([]);
  useEffect(() => {
    if (isPending || saving) return;
    setHiddenSteps((current) => (current.length ? [] : current));
    setAddingContacts((current) => (current.length ? [] : current));
    setRecordOverride((current) => (Object.keys(current).length ? {} : current));
  }, [isPending, saving]);

  // 日付の保存：仮の表示 → トースト → 一覧の読み直し の順（run が onSuccess のあとにトーストを出す）
  function saveRecord(contactId: string, stepId: string, plannedOn: string | null, doneOn: string | null, result: "ok" | "ng" | null, action: string, keepOpen = false) {
    return run("sakaba_set_project_step_record", { p_contact_id: contactId, p_step_id: stepId, p_planned_on: plannedOn, p_done_on: doneOn, p_result: result }, action, () => {
      setRecordOverride((current) => ({ ...current, [`${contactId}:${stepId}`]: { planned_on: plannedOn, done_on: doneOn, result } }));
      if (!keepOpen) setSelection(null);
      if (!keepOpen && action === "保存") uiToast("保存しました");
    });
  }

  function editCell(change: () => void) {
    change();
    setEditVersion((version) => version + 1);
  }

  // 待たずに閉じる・ほかを開くときは、直した分をすぐ保存してから移る（0.5秒待ちで消えないように）
  function leaveCell() {
    if (selection?.kind === "cell" && editVersion !== savedVersion.current && !busy) {
      savedVersion.current = editVersion;
      void saveRecord(selection.contactId, selection.stepId, cellFinished || !cellDate ? null : cellDate, cellFinished && cellDate ? cellDate : null, cellResult, "保存", true);
    }
    savedVersion.current = editVersion;
  }

  // 直してから0.5秒たったら保存。保存中に直した分は、終わったあとの再実行で拾う（取りこぼさない）
  useEffect(() => {
    if (selection?.kind !== "cell" || editVersion === savedVersion.current || busy) return;
    const timer = setTimeout(() => {
      savedVersion.current = editVersion;
      void saveRecord(selection.contactId, selection.stepId, cellFinished || !cellDate ? null : cellDate, cellFinished && cellDate ? cellDate : null, cellResult, "保存", true);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editVersion, busy, selection, cellDate, cellFinished, cellResult]);

  async function run(name: string, args: Record<string, unknown>, action: string, onSuccess?: () => void): Promise<boolean> {
    if (busy) return false;
    setSaving(action); setLastAction(action); setError("");
    let ok = false;
    try {
      const { error: rpcError } = await createClient().rpc(name, args);
      if (rpcError) setError(rpcError.code === "23505" && name === "sakaba_add_project_contact_v2" ? "このメンバーはすでに追加されています。" : `${action}に失敗しました。もう一度お試しください。`);
      else {
        onSuccess?.();
        if (action === "相手の追加") uiToast("相手を追加しました");
                else if (action === "日付の消去") uiToast("消しました");
        ok = true;
        startTransition(() => { router.refresh(); });
      }
    } catch {
      setError("通信に失敗しました。接続を確認してもう一度お試しください。");
    } finally {
      setSaving("");
    }
    return ok;
  }

  async function deleteStep(step: GuildProjectPipeline["steps"][number]) {
    if (busy) return;
    const confirmed = await uiConfirm({
      title: "手順を削除する",
      message: `「${step.name}」の列と、この列に記録したすべての日付・結果を削除します。元に戻せません。`,
      okLabel: "削除する",
      danger: true,
    });
    if (!confirmed) return;
    // 確定した瞬間に列を隠す。失敗したら戻して理由を出す（黙って消さない）
    setHiddenSteps((current) => [...current, step.id]);
    const ok = await run("sakaba_delete_project_step", { p_step_id: step.id }, "手順の削除", () => uiToast("手順を削除しました"));
    if (!ok) setHiddenSteps((current) => current.filter((id) => id !== step.id));
  }

  function selectContact(contactId: string) {
    leaveCell();
    const contact = pipeline.contacts.find((item) => item.id === contactId);
    if (!contact) return;
    setSelection({ kind: "contact", contactId });
    setEditContactLabel(contact.label); setMemo(contact.memo); setError("");
  }

  function selectCell(contactId: string, stepId: string) {
    leaveCell();
    const record = pipeline.records.find((item) => item.contact_id === contactId && item.step_id === stepId);
    setSelection({ kind: "cell", contactId, stepId });
    const current = recordOverride[`${contactId}:${stepId}`] ?? record;
    finishedTouched.current = false;
    setCellFinished(!!current?.done_on);
    setCellResult(current?.result ?? null);
    setCellDate(current?.done_on ?? current?.planned_on ?? ""); setError("");
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

  // 一番右の手順が「完了」になった相手は、下の「フォローアップ」へ移す（保存した直後の表示＝recordOverride も見る）
  const visibleSteps = pipeline.steps.filter((step) => !hiddenSteps.includes(step.id));
  const lastStep = visibleSteps[visibleSteps.length - 1];
  const isFollowUp = (contactId: string) => {
    const record = recordOverride[`${contactId}:${lastStep.id}`] ?? pipeline.records.find((item) => item.contact_id === contactId && item.step_id === lastStep.id);
    return !!record?.done_on;
  };
  const activeContacts = pipeline.contacts.filter((contact) => !isFollowUp(contact.id));
  const followUpContacts = pipeline.contacts.filter((contact) => isFollowUp(contact.id));
  const lastResultOf = (contactId: string) => (recordOverride[`${contactId}:${lastStep.id}`] ?? pipeline.records.find((item) => item.contact_id === contactId && item.step_id === lastStep.id))?.result ?? null;
  const followUpTabs = [
    { key: "all", label: "すべて", list: followUpContacts },
    { key: "ok", label: "OK", list: followUpContacts.filter((contact) => lastResultOf(contact.id) === "ok") },
    { key: "ng", label: "NG", list: followUpContacts.filter((contact) => lastResultOf(contact.id) === "ng") },
    { key: "undecided", label: "未定", list: followUpContacts.filter((contact) => lastResultOf(contact.id) === null) },
  ] as const;
  const shownFollowUp = followUpTabs.find((tab) => tab.key === followUpTab) ?? followUpTabs[0];

  const peopleTable = (contacts: typeof pipeline.contacts, kind: "active" | "followUp") => <div className="overflow-x-auto border-2 border-[#1b2a41]">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead><tr className="bg-[#f3ecd9]">
          <th scope="col" className="sticky left-0 z-10 min-w-28 bg-[#f3ecd9] px-3 py-2 text-left text-xs font-normal">相手</th>
          {visibleSteps.map((step) => <th key={step.id} scope="col" className="min-w-20 px-2 py-2 text-center text-xs font-normal">{step.name}</th>)}
        </tr></thead>
        <tbody>{contacts.length === 0 && (kind === "followUp" || addingContacts.length === 0) ? <tr><td colSpan={visibleSteps.length + 1} className="c-muted px-3 py-5 text-sm">{kind === "followUp" ? (followUpContacts.length === 0 ? "まだいません。一番右の手順が「完了」になった人がここに移ります。" : "この結果の人はいません。") : "まだ相手がいません。下から追加してください。"}</td></tr> :
          contacts.map((contact) => <tr key={contact.id} className="border-t-2 border-dashed border-[#1b2a41]/15">
            <th scope="row" className="sticky left-0 z-10 bg-[#fffdf6] p-2 text-left font-normal">
              <button type="button" disabled={!editable} onClick={() => selectContact(contact.id)} aria-label={`${contact.label}の名前とメモを編集`} className="block w-full text-left text-xs hover:underline disabled:cursor-default">{contact.label}{contact.memo && <span className="c-muted block text-[11px]">{contact.memo}</span>}</button>
              {contact.member_user_id && members.some((member) => member.id === contact.member_user_id) && <Link href={`/guild/members/${contact.member_user_id}`} className="c-muted mt-1 block text-[10px] underline underline-offset-2">メンバーを見る ↗</Link>}
            </th>
            {visibleSteps.map((step) => {
              const record = recordOverride[`${contact.id}:${step.id}`] ?? pipeline.records.find((item) => item.contact_id === contact.id && item.step_id === step.id);
              return <td key={step.id} className="p-1 text-center">
                <button type="button" disabled={!editable} onClick={() => selectCell(contact.id, step.id)} aria-label={`${contact.label}の${step.name}を編集`} className="min-h-10 w-full px-1 text-xs tabular-nums hover:outline-2 hover:outline-[#1b2a41] disabled:cursor-default">
                  {record?.done_on ? <span className="bg-[#1b2a41] px-1 text-[#fffdf6]">✓ {shortDate(record.done_on)}</span> : record?.planned_on ? (record.planned_on < todayInJapan() ? <span className="px-1 text-[#c62828]">{shortDate(record.planned_on)} 遅れ</span> : <span className="c-muted">{shortDate(record.planned_on)} 予定</span>) : record?.result ? null : <span className="c-muted">―</span>}
                  {record?.result && <span className={`ml-1 px-1 font-bold ${record.result === "ok" ? "text-[#1f7a3d]" : "text-[#c62828]"}`}>{record.result === "ok" ? "OK" : "NG"}</span>}
                </button>
              </td>;
            })}
          </tr>)}
          {kind === "active" && addingContacts.map((contact) => <tr key={contact.key} aria-busy="true" className="border-t-2 border-dashed border-[#1b2a41]/15 opacity-60">
            <th scope="row" className="sticky left-0 z-10 bg-[#fffdf6] p-2 text-left font-normal"><span className="block text-xs">{contact.label}</span></th>
            <td colSpan={visibleSteps.length} className="c-muted p-1 text-left text-xs">追加中…</td>
          </tr>)}</tbody>
      </table>
    </div>;

  // 編集する枠は、選んだ相手がいる表（進行中／フォローアップ）のすぐ下に出す
  const selectedInFollowUp = !!selection && isFollowUp(selection.contactId);
  const editPanels = <>
    {selection?.kind === "cell" && selectedContact && selectedStep && <div className="c-card space-y-4 p-4">
      <p className="text-sm">{selectedContact.label}：{selectedStep.name}</p>
      <div className="space-y-3">
        <div><p className="c-muted mb-1 text-xs">{cellFinished ? "おわった日" : "予定日"}</p><DateInput value={cellDate} onChange={(value) => editCell(() => { setCellDate(value); if (value && value <= todayInJapan() && !finishedTouched.current) setCellFinished(true); })} label={cellFinished ? "おわった日" : "予定日"} /></div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div role="radiogroup" aria-label="進み具合" className="flex items-center gap-2">
            {([[true, "完了"], [false, "未定"]] as const).map(([value, text]) => <button key={text} type="button" role="radio" aria-checked={cellFinished === value} onClick={() => editCell(() => { finishedTouched.current = true; setCellFinished(value); if (value && !cellDate) setCellDate(todayInJapan()); })} className={`h-9 min-w-14 border-2 border-[#1b2a41] px-3 text-sm ${cellFinished === value ? "bg-[#1b2a41] text-[#fffdf6]" : "bg-[#fffdf6]"}`}>{text}</button>)}
          </div>
          <div role="group" aria-label="結果" className="flex items-center gap-2">
            {([["ok", "OK"], ["ng", "NG"]] as const).map(([value, text]) => <button key={text} type="button" aria-pressed={cellResult === value} onClick={() => editCell(() => setCellResult(cellResult === value ? null : value))} className={`h-9 min-w-14 border-2 border-[#1b2a41] px-3 text-sm ${cellResult === value ? "bg-[#1b2a41] text-[#fffdf6]" : "bg-[#fffdf6]"}`}>{text}</button>)}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p role="status" aria-live="polite" className="c-muted text-xs">{saving === "保存" ? "保存中…" : editVersion !== savedVersion.current ? "変更あり…" : "✓ 変えると自動で保存されます（保存ボタンでも保存できます）"}</p>
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || (!cellDate && !cellResult)} onClick={() => { savedVersion.current = editVersion; void saveRecord(selection.contactId, selection.stepId, cellFinished || !cellDate ? null : cellDate, cellFinished && cellDate ? cellDate : null, cellResult, "保存"); }} className="rpg-button h-11 px-6 disabled:opacity-50">{saving === "保存" ? "保存中…" : "保存"}</button>
        <div className="ml-auto flex items-center gap-1">
          {selectedRecord && <button type="button" disabled={busy} onClick={() => saveRecord(selection.contactId, selection.stepId, null, null, null, "日付の消去")} aria-label="日付と結果を消す" title="日付と結果を消す" className="flex h-11 w-11 items-center justify-center text-[#c62828] hover:bg-[#c62828]/10 focus-visible:outline-2 focus-visible:outline-[#c62828] disabled:opacity-50"><Trash2 size={18} aria-hidden /></button>}
          <button type="button" onClick={() => { leaveCell(); setSelection(null); }} aria-label="閉じる" title="閉じる" className="c-muted flex h-11 w-11 items-center justify-center hover:bg-[#1b2a41]/10 focus-visible:outline-2 focus-visible:outline-[#1b2a41]"><X size={20} aria-hidden /></button>
        </div>
      </div>
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
  </>;

  return <div className="space-y-5">
    <p className="c-muted text-xs leading-relaxed">行＝相手、列＝手順。ます目を選ぶと予定日と完了日を記録できます。一番右の手順が「完了」になった人は、下の「フォローアップ」へ移ります。</p>
    <div className="space-y-2">
      <p className="text-sm">進行中<span className="c-muted ml-2 text-xs">{activeContacts.length}人</span></p>
      {peopleTable(activeContacts, "active")}
    </div>
    {!selectedInFollowUp && editPanels}
    <div className="space-y-2">
      <p className="text-sm">フォローアップ<span className="c-muted ml-2 text-xs">{followUpContacts.length}人</span></p>
      <div role="tablist" aria-label="フォローアップの結果" className="flex flex-wrap gap-2">
        {followUpTabs.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={followUpTab === tab.key} onClick={() => setFollowUpTab(tab.key)} className={`h-9 min-w-16 border-2 border-[#1b2a41] px-3 text-sm ${followUpTab === tab.key ? "bg-[#1b2a41] text-[#fffdf6]" : "bg-[#fffdf6]"}`}>{tab.label} {tab.list.length}</button>)}
      </div>
      {peopleTable(shownFollowUp.list, "followUp")}
    </div>
    {selectedInFollowUp && editPanels}


    {editable && <form onSubmit={(event) => { event.preventDefault(); if (!newContactLabel.trim()) return; void run("sakaba_add_project_contact_v2", { p_project_id: projectId, p_label: newContactLabel.trim(), p_member_user_id: newMemberId }, "相手の追加", () => { setAddingContacts((current) => [...current, { key: Date.now() + Math.random(), label: newContactLabel.trim() }]); setNewContactLabel(""); setNewMemberId(null); }); }} className="space-y-2">
      <p className="text-sm">相手を追加</p>
      <div className="flex gap-2"><ProjectMemberCombobox members={members} label={newContactLabel} selectedMemberId={newMemberId} disabled={busy} onChange={(label, memberId) => { setNewContactLabel(label); setNewMemberId(memberId); }} /><button type="submit" disabled={busy || !newContactLabel.trim()} aria-busy={busy} className="rpg-button h-11 shrink-0 px-4 disabled:opacity-50">{saving === "相手の追加" ? "追加中…" : isPending ? "読み込み中…" : "追加"}</button></div>
    </form>}

    {editable && <div className="c-dashed-top pt-4">
      <button type="button" onClick={() => setEditingSteps(!editingSteps)} className="c-muted text-xs underline">{editingSteps ? "手順の編集を閉じる" : "手順（列）をなおす"}</button>
      {editingSteps && <div className="mt-4 space-y-3">
        {pipeline.steps.map((step) => hiddenSteps.includes(step.id)
          ? <div key={step.id} role="status" aria-busy="true" className="c-muted flex h-11 items-center gap-2 text-xs opacity-60"><Loader2 size={16} className="animate-spin" aria-hidden />「{step.name}」を削除中…</div>
          : <StepNameEditor key={step.id} step={step} busy={busy} run={run} onDelete={() => deleteStep(step)} canDelete={visibleSteps.length > 1} />)}
        <form onSubmit={(event) => { event.preventDefault(); if (!stepName.trim()) return; run("sakaba_add_project_step", { p_project_id: projectId, p_name: stepName.trim() }, "手順の追加", () => setStepName("")); }} className="flex gap-2">
          <div className="min-w-0 flex-1"><TextInput value={stepName} onChange={setStepName} max={12} label="新しい手順" placeholder="例：見積" /></div>
          <button type="submit" disabled={busy || !stepName.trim() || visibleSteps.length >= 12} className="c-button-sub h-11 shrink-0 px-3 text-xs disabled:opacity-50">右に足す</button>
        </form>
      </div>}
    </div>}
    <p role="status" aria-live="polite" className="c-muted min-h-4 text-xs">{lastAction === "保存" || lastAction === "日付の消去" ? "" : saving ? `${saving}中…` : isPending ? "読み込み中…" : ""}</p>
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
  </div>;
}

function StepNameEditor({ step, busy, run, onDelete, canDelete }: { step: GuildProjectPipeline["steps"][number]; busy: boolean; run: (name: string, args: Record<string, unknown>, action: string, onSuccess?: () => void) => Promise<boolean>; onDelete: () => void; canDelete: boolean }) {
  const [name, setName] = useState(step.name);
  return <div className="flex items-center gap-2"><div className="min-w-0 flex-1"><TextInput value={name} onChange={setName} max={12} label={`${step.name}の名前`} /></div>
    <button type="button" disabled={busy || !name.trim() || name.trim() === step.name} onClick={() => run("sakaba_rename_project_step", { p_step_id: step.id, p_name: name.trim() }, "手順の更新")} className="c-button-sub h-11 shrink-0 px-3 text-xs disabled:opacity-50">なおす</button>
    <button type="button" disabled={busy || !canDelete} onClick={onDelete} aria-label={`${step.name}の列を削除`} title={canDelete ? `${step.name}の列を削除` : "最後の1列は削除できません"} className="flex h-11 w-11 shrink-0 items-center justify-center text-[#c62828] hover:bg-[#c62828]/10 focus-visible:outline-2 focus-visible:outline-[#c62828] disabled:opacity-40"><Trash2 size={18} aria-hidden /></button>
  </div>;
}
