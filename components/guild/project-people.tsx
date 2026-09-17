"use client";

// 人ごとの すすみ。行＝相手、列＝ステップ、ます目＝予定日と完了日。
// 持つのは呼び名・ひとことメモ・日付だけ（連絡先や商談の内容は持たない。タスク管理のための表）。
// ます目や名前を押すと、表のすぐ下に入力の枠が開く（スマホで小さな画面を重ねない）。

import { Fragment, useRef, useState } from "react";
import type { Project, ProjectContact, ProjectStep } from "@/lib/guild/types";
import { TODAY } from "@/lib/guild/mock-data";
import {
  addContact,
  addStep,
  removeContact,
  removeStep,
  renameStep,
  setRecord,
  startSteps,
  updateContact,
  type ProjectState,
} from "@/lib/guild/project-store";
import { contactsOf, recordOf, stepsOf } from "@/lib/guild/projects";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { cn } from "@/lib/utils";
import { TextInput } from "./form-parts";

const LABEL_MAX = 30;
const CONTACT_MEMO_MAX = 100;
const STEP_NAME_MAX = 12;

type Selection = { kind: "cell"; contactId: string; stepId: string } | { kind: "contact"; contactId: string } | null;

/** "2026-09-10" → "9/10" */
const short = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
};

export function ProjectPeople({
  project,
  state,
  editable,
}: {
  project: Project;
  state: ProjectState;
  editable: boolean;
}) {
  const steps = stepsOf(state.steps, project.id);
  const contacts = contactsOf(state.contacts, project.id);
  const [selection, setSelection] = useState<Selection>(null);
  const [editingSteps, setEditingSteps] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const select = (next: Selection) => {
    setSelection(next);
    // 表の下に開くので、スマホでは見える所まで動かす
    requestAnimationFrame(() =>
      panelRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      }),
    );
  };

  if (steps.length === 0) {
    return (
      <div className="space-y-3">
        <p className="c-muted text-sm leading-relaxed">
          営業など、同じ手順を 何人にも すすめるときに使います。行に 相手、列に ステップを並べ、予定日と 完了日を
          入れていきます。
        </p>
        {editable && (
          <button type="button" className="c-button-sub h-11 px-4 text-sm" onClick={() => startSteps(project.id)}>
            ▶ 人ごとの すすみを はじめる
          </button>
        )}
      </div>
    );
  }

  const selectedContact = selection ? contacts.find((c) => c.id === selection.contactId) : undefined;
  const selectedStep = selection?.kind === "cell" ? steps.find((s) => s.id === selection.stepId) : undefined;

  return (
    <div className="space-y-5">
      {/* スマホは 名前を ます目の上の行に出して、ステップの列だけを横に並べる（4列なら横に動かさずに収まる）。
          PCは 名前の列を左に置く。それでも入りきらないときは、この枠の中だけで横に動かす */}
      <div className="overflow-x-auto border-2 border-[#1b2a41]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f3ecd9]">
              <th
                scope="col"
                className="hidden bg-[#f3ecd9] px-2 py-2 text-left text-xs font-normal sm:sticky sm:left-0 sm:z-10 sm:table-cell"
              >
                相手
              </th>
              {steps.map((s) => (
                <th key={s.id} scope="col" className="px-1 py-2 text-center text-[11px] font-normal whitespace-nowrap">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && (
              <tr>
                <td colSpan={steps.length + 1} className="c-muted px-3 py-4 text-sm">
                  まだ 相手が いません。下から 足してください。
                </td>
              </tr>
            )}
            {contacts.map((c) => {
              const name = (
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => select({ kind: "contact", contactId: c.id })}
                  className={cn(
                    "block w-full text-left",
                    selection?.kind === "contact" && selection.contactId === c.id && "underline underline-offset-4",
                  )}
                >
                  <span className="text-xs leading-snug break-words">{c.label}</span>
                  {c.memo && <span className="c-muted ml-2 text-[11px] sm:ml-0 sm:block sm:truncate">{c.memo}</span>}
                </button>
              );
              return (
                <Fragment key={c.id}>
                  <tr className="border-t-2 border-dashed border-[#1b2a41]/15 sm:hidden">
                    <th scope="row" colSpan={steps.length} className="px-2 pt-2 text-left font-normal">
                      {name}
                    </th>
                  </tr>
                  <tr className="sm:border-t-2 sm:border-dashed sm:border-[#1b2a41]/15">
                    <th
                      scope="row"
                      className="hidden w-32 max-w-32 bg-[#fffdf6] px-2 py-1.5 text-left align-top font-normal sm:sticky sm:left-0 sm:z-10 sm:table-cell"
                    >
                      {name}
                    </th>
                    {steps.map((s) => {
                      const r = recordOf(state.records, c.id, s.id);
                      const active =
                        selection?.kind === "cell" && selection.contactId === c.id && selection.stepId === s.id;
                      return (
                        <td key={s.id} className="p-1 text-center align-middle">
                          <button
                            type="button"
                            disabled={!editable}
                            onClick={() =>
                              select({
                                kind: "cell",
                                contactId: c.id,
                                stepId: s.id,
                              })
                            }
                            aria-label={`${c.label}の ${s.name}：${cellText(r)}`}
                            className={cn(
                              "flex min-h-10 w-full items-center justify-center px-0.5 text-[11px] whitespace-nowrap tabular-nums",
                              active && "outline-2 outline-[#1b2a41]",
                            )}
                          >
                            <CellMark record={r} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="c-muted text-[11px]">✓＝おわった日／「予定」＝これからの日。ます目を押すと 日付を入れられます。</p>

      <div ref={panelRef}>
        {selection?.kind === "cell" && selectedContact && selectedStep && (
          <CellEditor
            key={`${selectedContact.id}-${selectedStep.id}`}
            contact={selectedContact}
            step={selectedStep}
            state={state}
            onClose={() => setSelection(null)}
          />
        )}
        {selection?.kind === "contact" && selectedContact && (
          <ContactEditor key={selectedContact.id} contact={selectedContact} onClose={() => setSelection(null)} />
        )}
      </div>

      {editable && (
        <>
          <AddContactForm projectId={project.id} />
          <div className="c-dashed-top pt-4">
            <button
              type="button"
              className="c-muted text-xs underline underline-offset-4"
              onClick={() => setEditingSteps((v) => !v)}
            >
              {editingSteps ? "ステップの へんしゅうを 閉じる" : "ステップ（列）を なおす"}
            </button>
            {editingSteps && <StepEditor projectId={project.id} steps={steps} />}
          </div>
        </>
      )}
    </div>
  );
}

function cellText(r: { planned_on: string | null; done_on: string | null } | undefined): string {
  if (!r) return "まだ";
  if (r.done_on) return `${short(r.done_on)}に おわり`;
  if (r.planned_on) return `${short(r.planned_on)}の予定`;
  return "まだ";
}

function CellMark({ record }: { record: { planned_on: string | null; done_on: string | null } | undefined }) {
  if (record?.done_on) return <span className="bg-[#1b2a41] px-1 text-[#fffdf6]">✓{short(record.done_on)}</span>;
  if (record?.planned_on) {
    // 予定日を過ぎても終わっていないものは、濃紺の枠で目立たせる（赤は急ぎと入力エラーだけ）
    const late = record.planned_on < TODAY;
    return <span className={late ? "c-chip" : "c-muted"}>{short(record.planned_on)}予定</span>;
  }
  return <span className="c-muted opacity-50">―</span>;
}

function CellEditor({
  contact,
  step,
  state,
  onClose,
}: {
  contact: ProjectContact;
  step: ProjectStep;
  state: ProjectState;
  onClose: () => void;
}) {
  const current = recordOf(state.records, contact.id, step.id);
  const [planned, setPlanned] = useState(current?.planned_on ?? "");
  const [done, setDone] = useState(current?.done_on ?? "");

  const save = (dates: { planned_on: string | null; done_on: string | null }, message: string) => {
    setRecord(contact.id, step.id, dates);
    uiToast(message);
    onClose();
  };

  return (
    <div className="c-card space-y-4 p-4">
      <p className="text-[15px]">
        {contact.label}：<span className="tracking-wider">{step.name}</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="c-muted mb-1 text-xs">予定日</p>
          <TextInput type="date" value={planned} onChange={setPlanned} max={10} label="予定日" />
        </div>
        <div>
          <p className="c-muted mb-1 text-xs">おわった日</p>
          <TextInput type="date" value={done} onChange={setDone} max={10} label="おわった日" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rpg-button h-11 px-4 text-sm"
          onClick={() =>
            save({ planned_on: planned || null, done_on: TODAY }, `${step.name}を きょう おわりにしました`)
          }
        >
          ▶ きょう おわった
        </button>
        <button
          type="button"
          className="c-button-sub h-11 px-4 text-sm"
          onClick={() => save({ planned_on: planned || null, done_on: done || null }, "日付を 入れました")}
        >
          この日付で 入れる
        </button>
        {current && (
          <button
            type="button"
            className="c-muted h-11 px-2 text-xs underline underline-offset-4"
            onClick={() => save({ planned_on: null, done_on: null }, "日付を 消しました")}
          >
            日付を 消す
          </button>
        )}
        <button type="button" className="c-muted ml-auto h-11 px-2 text-xs" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}

function ContactEditor({ contact, onClose }: { contact: ProjectContact; onClose: () => void }) {
  const [label, setLabel] = useState(contact.label);
  const [memo, setMemo] = useState(contact.memo);
  const [error, setError] = useState("");

  return (
    <form
      noValidate
      className="c-card space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (label.trim() === "") {
          setError("呼び名を 入れてください");
          return;
        }
        updateContact(contact.id, { label: label.trim(), memo: memo.trim() });
        uiToast("なおしました");
        onClose();
      }}
    >
      <div>
        <p className="c-muted mb-1 text-xs">呼び名</p>
        <TextInput value={label} onChange={setLabel} max={LABEL_MAX} label="呼び名" />
        {error && <p className="mt-1 text-xs text-[#c62828]">{error}</p>}
      </div>
      <div>
        <p className="c-muted mb-1 text-xs">ひとことメモ（{CONTACT_MEMO_MAX}字まで）</p>
        <TextInput
          value={memo}
          onChange={setMemo}
          max={CONTACT_MEMO_MAX}
          label="ひとことメモ"
          placeholder="例：次は 資料を送る（連絡先は 書かないでください）"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="rpg-button h-11 px-4 text-sm">
          ▶ なおす
        </button>
        <button
          type="button"
          className="c-muted h-11 px-2 text-xs underline underline-offset-4"
          onClick={async () => {
            const ok = await uiConfirm({
              title: "相手を 消します",
              message: `「${contact.label}」と、その行の日付を すべて消します。もとに もどせません。`,
              okLabel: "消す",
              danger: true,
            });
            if (!ok) return;
            removeContact(contact.id);
            uiToast("相手を 消しました");
            onClose();
          }}
        >
          この相手を 消す
        </button>
        <button type="button" className="c-muted ml-auto h-11 px-2 text-xs" onClick={onClose}>
          閉じる
        </button>
      </div>
    </form>
  );
}

function AddContactForm({ projectId }: { projectId: string }) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      noValidate
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (label.trim() === "") {
          setError("呼び名を 入れてください");
          return;
        }
        addContact(projectId, label.trim());
        setLabel("");
        setError("");
      }}
    >
      <p className="text-[15px] tracking-wider">相手を 足す</p>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <TextInput
            value={label}
            onChange={setLabel}
            max={LABEL_MAX}
            label="相手の 呼び名"
            placeholder="例：Dさん（美容室）"
          />
        </div>
        <button type="submit" className="rpg-button h-11 shrink-0 px-4 text-sm">
          ▶ 足す
        </button>
      </div>
      {error && <p className="text-xs text-[#c62828]">{error}</p>}
    </form>
  );
}

function StepEditor({ projectId, steps }: { projectId: string; steps: ProjectStep[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="mt-4 space-y-3">
      <ul className="space-y-2">
        {steps.map((s) => (
          <StepNameRow key={s.id} step={s} canRemove={steps.length > 1} />
        ))}
      </ul>
      <form
        noValidate
        className="space-y-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() === "") {
            setError("ステップの なまえを 入れてください");
            return;
          }
          addStep(projectId, name.trim());
          setName("");
          setError("");
        }}
      >
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <TextInput
              value={name}
              onChange={setName}
              max={STEP_NAME_MAX}
              label="足す ステップの なまえ"
              placeholder="例：見積"
            />
          </div>
          <button type="submit" className="c-button-sub h-11 shrink-0 px-4 text-sm">
            右に 足す
          </button>
        </div>
        {error && <p className="text-xs text-[#c62828]">{error}</p>}
      </form>
    </div>
  );
}

function StepNameRow({ step, canRemove }: { step: ProjectStep; canRemove: boolean }) {
  const [name, setName] = useState(step.name);
  const changed = name.trim() !== step.name;
  return (
    <li className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <TextInput value={name} onChange={setName} max={STEP_NAME_MAX} label={`${step.name}の なまえ`} />
      </div>
      <button
        type="button"
        disabled={!changed || name.trim() === ""}
        className="c-button-sub h-11 shrink-0 px-3 text-xs disabled:opacity-40"
        onClick={() => {
          renameStep(step.id, name.trim());
          uiToast("なまえを なおしました");
        }}
      >
        なおす
      </button>
      {canRemove && (
        <button
          type="button"
          className="c-muted h-11 shrink-0 px-2 text-xs underline underline-offset-4"
          onClick={async () => {
            const ok = await uiConfirm({
              title: "ステップを 消します",
              message: `「${step.name}」の列と、その列の日付を すべて消します。もとに もどせません。`,
              okLabel: "消す",
              danger: true,
            });
            if (!ok) return;
            removeStep(step.id);
            uiToast("ステップを 消しました");
          }}
        >
          消す
        </button>
      )}
    </li>
  );
}
