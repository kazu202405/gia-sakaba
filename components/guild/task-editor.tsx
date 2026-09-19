"use client";

// タスクを 足す／なおす。入れる項目と決まり（validateTaskDraft）は どちらも同じ。
// なおす枠は、タスクの行を押すと すぐ下に開く（あいてごとの じょうきょう と同じ形）。

import { useState } from "react";
import type { ProjectTask } from "@/lib/guild/types";
import { ME_ID, TODAY, getProfile } from "@/lib/guild/mock-data";
import { validateTaskDraft } from "@/lib/guild/projects";
import { addTask, removeTask, updateTask } from "@/lib/guild/project-store";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { DateInput, Select, TextInput } from "./form-parts";

const TASK_TITLE_MAX = 60;

type Fields = { title: string; start: string; due: string; assignee: string };

/** なまえ・日にち・たんとう の欄。memberIds が null なら 本人だけのプロジェクト（たんとう欄なし） */
function TaskFields({
  value,
  onChange,
  memberIds,
  narrow = false,
}: {
  value: Fields;
  onChange: (v: Fields) => void;
  memberIds: string[] | null;
  /** 行の下に開く なおす枠は 幅がせまいので、スマホでは 日にちを たてに並べる */
  narrow?: boolean;
}) {
  const set = (patch: Partial<Fields>) => onChange({ ...value, ...patch });
  const options = (memberIds ?? []).map((pid) => ({
    value: pid,
    label: pid === ME_ID ? "自分" : `${getProfile(pid)?.display_name ?? ""}さん`,
  }));

  return (
    <>
      <TextInput
        value={value.title}
        onChange={(title) => set({ title })}
        max={TASK_TITLE_MAX}
        label="タスクの なまえ"
        placeholder="例：画像を 用意する"
      />
      <div className={narrow ? "grid gap-3 sm:grid-cols-2" : "grid grid-cols-2 gap-3"}>
        <div className="min-w-0">
          <p className="c-muted mb-1 text-xs">はじめる日（空でも可）</p>
          <DateInput value={value.start} onChange={(start) => set({ start })} label="はじめる日" />
        </div>
        <div className="min-w-0">
          <p className="c-muted mb-1 text-xs">しめきり（空でも可）</p>
          <DateInput value={value.due} onChange={(due) => set({ due })} label="しめきり" />
        </div>
      </div>
      {memberIds && (
        <div>
          <p className="c-muted mb-1 text-xs">たんとう</p>
          <Select
            value={value.assignee}
            onChange={(assignee) => set({ assignee })}
            options={options}
            label="たんとう"
            placeholder="きまっていない"
          />
        </div>
      )}
    </>
  );
}

function toInput(v: Fields, memberIds: string[] | null) {
  return {
    title: v.title.trim(),
    start_date: v.start || null,
    due_date: v.due || null,
    // パーティでは「きまっていない」も選べる。本人だけなら担当は持ち主
    assignee_id: memberIds ? v.assignee || null : null,
  };
}

export function AddTaskForm({ projectId, memberIds }: { projectId: string; memberIds: string[] | null }) {
  const empty: Fields = { title: "", start: "", due: "", assignee: ME_ID };
  const [fields, setFields] = useState<Fields>(empty);
  const [error, setError] = useState("");

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const problem = validateTaskDraft(fields, TODAY);
        if (problem) {
          setError(problem);
          return;
        }
        addTask(projectId, toInput(fields, memberIds));
        setFields(empty);
        setError("");
      }}
      className="c-dashed-top mt-5 space-y-3 pt-5"
    >
      <p className="text-[15px] tracking-wider">タスクを 足す</p>
      <TaskFields value={fields} onChange={setFields} memberIds={memberIds} />
      {error && <p className="text-xs text-[#c62828]">{error}</p>}
      <button type="submit" className="rpg-button h-11 w-full text-sm sm:w-auto sm:px-5">
        ▶ 足す
      </button>
    </form>
  );
}

export function TaskEditor({
  task,
  memberIds,
  onClose,
}: {
  task: ProjectTask;
  memberIds: string[] | null;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<Fields>({
    title: task.title,
    start: task.start_date ?? "",
    due: task.due_date ?? "",
    assignee: task.assignee_id ?? "",
  });
  const [error, setError] = useState("");

  return (
    <form
      noValidate
      className="c-card mb-3 space-y-3 p-3 sm:p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const problem = validateTaskDraft(fields, TODAY, task.due_date);
        if (problem) {
          setError(problem);
          return;
        }
        updateTask(task.id, toInput(fields, memberIds));
        uiToast("タスクを なおしました");
        onClose();
      }}
    >
      <TaskFields value={fields} onChange={setFields} memberIds={memberIds} narrow />
      {error && <p className="text-xs text-[#c62828]">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="rpg-button h-11 px-4 text-sm">
          ▶ なおす
        </button>
        <button
          type="button"
          className="c-muted h-11 px-2 text-xs underline underline-offset-4"
          onClick={async () => {
            const ok = await uiConfirm({
              title: "タスクを 消します",
              message: `「${task.title}」を 消します。もとに もどせません。`,
              okLabel: "消す",
              danger: true,
            });
            if (!ok) return;
            removeTask(task.id);
            uiToast("タスクを 消しました");
            onClose();
          }}
        >
          このタスクを 消す
        </button>
        <button type="button" className="c-muted ml-auto h-11 px-2 text-xs" onClick={onClose}>
          閉じる
        </button>
      </div>
    </form>
  );
}
