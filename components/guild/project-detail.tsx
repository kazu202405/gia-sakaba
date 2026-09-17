"use client";

// プロジェクトの くわしい画面。
// 期間のバー → 備考 → タスク（一覧／工程表）→ 人ごとの すすみ → パーティ → おわりにする。

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { ProjectTask } from "@/lib/guild/types";
import { formatDate } from "@/lib/guild/labels";
import { ME_ID, TODAY, getProfile } from "@/lib/guild/mock-data";
import {
  addTask,
  getInitialProjectState,
  getProjectState,
  removeTask,
  setProjectStatus,
  subscribeProjects,
} from "@/lib/guild/project-store";
import { canSeeProject, isPrivateProject, projectProgress, stepsOf, tasksOf } from "@/lib/guild/projects";
import { ENTRY_PLAN_PRICE_LABEL, FREE_ACTIVE_PROJECT_LIMIT, canActivateProject } from "@/lib/guild/membership";
import { uiAlert, uiConfirm, uiToast } from "@/lib/ui-dialog";
import { cn } from "@/lib/utils";
import { BackLink, Window } from "./cards";
import { Select, TextInput } from "./form-parts";
import { useMembership } from "./membership-parts";
import { ProjectGantt } from "./project-gantt";
import { ProjectProgressView, QuestOriginCard, QuestOriginChip, TaskLine, VisibilityChip } from "./project-parts";
import { ProjectParty } from "./project-party";
import { ProjectPeople } from "./project-people";

const TASK_TITLE_MAX = 60;
type TaskView = "list" | "gantt";

export function ProjectDetail({ id }: { id: string }) {
  const state = useSyncExternalStore(subscribeProjects, getProjectState, getInitialProjectState);
  const [view, setView] = useState<TaskView>("list");
  const { isPaid } = useMembership();
  const project = state.projects.find((p) => p.id === id);

  // 見えないプロジェクトは「ない」と同じに見せる（あることも伝えない）
  if (!project || !canSeeProject(project, ME_ID)) {
    return (
      <div className="space-y-9">
        <BackLink href="/guild/projects" label="プロジェクト" />
        <Window>
          <p className="text-sm">このプロジェクトは 見つかりませんでした。</p>
        </Window>
      </div>
    );
  }

  const list = tasksOf(state.tasks, project.id);
  const { done, total } = projectProgress(state.tasks, project.id);
  const isParty = !isPrivateProject(project);
  const isOwner = project.owner_id === ME_ID;
  const hasSteps = stepsOf(state.steps, project.id).length > 0;
  const people = [project.owner_id, ...project.member_ids].map((pid) => getProfile(pid)).filter((p) => p !== undefined);

  const confirmRemove = async (t: ProjectTask) => {
    const ok = await uiConfirm({
      title: "タスクを 消します",
      message: `「${t.title}」を 消します。もとに もどせません。`,
      okLabel: "消す",
      danger: true,
    });
    if (!ok) return;
    removeTask(t.id);
    uiToast("タスクを 消しました");
  };

  return (
    <div className="space-y-11">
      <BackLink href="/guild/projects" label="プロジェクト" />

      <Window title={project.status === "done" ? "おわった プロジェクト" : "プロジェクト"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-wrap items-center gap-2">
            <QuestOriginChip project={project} />
            <VisibilityChip project={project} />
          </span>
          {isOwner && (
            <Link href={`/guild/projects/${project.id}/edit`} className="c-muted text-xs underline underline-offset-4">
              なおす
            </Link>
          )}
        </div>
        <h1 className="mt-3 text-2xl leading-snug tracking-[0.08em] break-words">{project.title}</h1>
        {project.goal && (
          <p className="mt-3 text-[15px] leading-relaxed break-words">
            <span className="c-label mr-2 text-xs">おわりの すがた</span>
            {project.goal}
          </p>
        )}
        <QuestOriginCard project={project} />
        <div className="mt-5">
          <ProjectProgressView project={project} state={state} />
        </div>
        {project.done_at && <p className="c-muted mt-2 text-xs">{formatDate(project.done_at)}に おわりました</p>}
        {project.memo && (
          <div className="c-dashed-top mt-5 pt-4">
            <p className="c-label text-xs">備考</p>
            <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">{project.memo}</p>
          </div>
        )}
        <p className="c-muted mt-4 text-xs">
          {isParty
            ? "パーティの人にだけ 見えています。"
            : "あなたにしか 見えていません（ギルドマスターにも 見えません）。"}
        </p>
      </Window>

      <Window
        title="タスク"
        action={
          <div className="flex gap-3 text-xs" role="group" aria-label="タスクの見せ方">
            {(["list", "gantt"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn("py-1", view === v ? "underline underline-offset-4" : "c-muted")}
              >
                {v === "list" ? "一覧" : "工程表"}
              </button>
            ))}
          </div>
        }
      >
        {view === "gantt" ? (
          <ProjectGantt project={project} tasks={list} />
        ) : list.length === 0 ? (
          <p className="c-muted text-sm">まだ タスクが ありません。下から 足してください。</p>
        ) : (
          <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
            {list.map((t) => (
              <li key={t.id}>
                <TaskLine
                  task={t}
                  showAssignee={isParty}
                  trailing={
                    <button
                      type="button"
                      onClick={() => confirmRemove(t)}
                      className="c-muted shrink-0 px-1 py-1 text-xs hover:underline"
                      aria-label={`「${t.title}」を 消す`}
                    >
                      消す
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {project.status === "active" && (
          <AddTaskForm projectId={project.id} memberIds={isParty ? [project.owner_id, ...project.member_ids] : null} />
        )}
      </Window>

      {(hasSteps || (isOwner && project.status === "active")) && (
        <div id="people" className="scroll-mt-24">
          <Window title="人ごとの すすみ">
            <ProjectPeople project={project} state={state} editable={project.status === "active"} />
          </Window>
        </div>
      )}

      {(isParty || (isOwner && project.status === "active")) && (
        <Window title="パーティ">
          <ProjectParty project={project} people={people} isOwner={isOwner} />
        </Window>
      )}

      {isOwner && (
        <div>
          {project.status === "active" ? (
            <button
              type="button"
              className="c-button-sub h-11 w-full text-sm sm:w-auto sm:px-5"
              onClick={async () => {
                const left = total - done;
                const ok = await uiConfirm({
                  title: "プロジェクトを おわりにします",
                  message:
                    left > 0
                      ? `まだ おわっていない タスクが ${left}こ あります。このまま おわりにしますか？ あとで もどせます。`
                      : "おつかれさまでした。あとで もどせます。",
                  okLabel: "おわりにする",
                });
                if (!ok) return;
                setProjectStatus(project.id, "done");
                uiToast("プロジェクトを おわりにしました");
              }}
            >
              ▶ このプロジェクトを おわりにする
            </button>
          ) : (
            <button
              type="button"
              className="c-button-sub h-11 w-full text-sm sm:w-auto sm:px-5"
              onClick={async () => {
                if (!canActivateProject(state.projects, ME_ID, isPaid)) {
                  await uiAlert({
                    title: "もどせません",
                    message: `無料では、すすめている プロジェクトは ${FREE_ACTIVE_PROJECT_LIMIT}つまで です。ほかの プロジェクトを 1つ おわりにするか、有料会員（${ENTRY_PLAN_PRICE_LABEL}）なら もどせます。`,
                  });
                  return;
                }
                setProjectStatus(project.id, "active");
                uiToast("すすめている プロジェクトに もどしました");
              }}
            >
              ▶ すすめている に もどす
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddTaskForm({ projectId, memberIds }: { projectId: string; memberIds: string[] | null }) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState(ME_ID);
  const [error, setError] = useState("");

  const options = (memberIds ?? []).map((pid) => ({
    value: pid,
    label: pid === ME_ID ? "自分" : `${getProfile(pid)?.display_name ?? ""}さん`,
  }));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim() === "") {
          setError("タスクの なまえを 入れてください");
          return;
        }
        if (due !== "" && due < TODAY) {
          setError("しめきりは きょう以降の日にしてください");
          return;
        }
        if (start !== "" && due !== "" && due < start) {
          setError("しめきりは はじめる日より あとにしてください");
          return;
        }
        addTask(projectId, {
          title: title.trim(),
          start_date: start || null,
          due_date: due || null,
          // パーティでは「きまっていない」も選べる。本人だけなら担当は持ち主
          assignee_id: memberIds ? assignee || null : null,
        });
        setTitle("");
        setStart("");
        setDue("");
        setError("");
      }}
      className="c-dashed-top mt-5 space-y-3 pt-5"
    >
      <p className="text-[15px] tracking-wider">タスクを 足す</p>
      <TextInput
        value={title}
        onChange={setTitle}
        max={TASK_TITLE_MAX}
        label="タスクの なまえ"
        placeholder="例：画像を 用意する"
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="c-muted mb-1 text-xs">はじめる日（空でも可）</p>
          <TextInput type="date" value={start} onChange={setStart} max={10} label="はじめる日" />
        </div>
        <div className="min-w-0">
          <p className="c-muted mb-1 text-xs">しめきり（空でも可）</p>
          <TextInput type="date" value={due} onChange={setDue} max={10} label="しめきり" />
        </div>
      </div>
      {memberIds && (
        <div>
          <p className="c-muted mb-1 text-xs">たんとう</p>
          <Select
            value={assignee}
            onChange={setAssignee}
            options={options}
            label="たんとう"
            placeholder="きまっていない"
          />
        </div>
      )}
      {error && <p className="text-xs text-[#c62828]">{error}</p>}
      <button type="submit" className="rpg-button h-11 w-full text-sm sm:w-auto sm:px-5">
        ▶ 足す
      </button>
    </form>
  );
}
