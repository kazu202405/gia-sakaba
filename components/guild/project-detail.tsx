"use client";

// プロジェクトの くわしい画面。
// 期間のバー → 備考 → タスク（一覧／工程表）→ あいてごとの じょうきょう → パーティ → おわりにする。
// タスクの一覧は まだ→おわった（たたむ）の順。行を押すと すぐ下に なおす枠（日にち・たんとう・消す）が開く。

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/guild/labels";
import { ME_ID, getProfile } from "@/lib/guild/mock-data";
import { getInitialProjectState, getProjectState, setProjectStatus, subscribeProjects } from "@/lib/guild/project-store";
import { canSeeProject, isPrivateProject, projectProgress, splitTasks, stepsOf, tasksOf } from "@/lib/guild/projects";
import { ENTRY_PLAN_PRICE_LABEL, FREE_ACTIVE_PROJECT_LIMIT, canActivateProject } from "@/lib/guild/membership";
import { uiAlert, uiConfirm, uiToast } from "@/lib/ui-dialog";
import { cn } from "@/lib/utils";
import { BackLink, Window } from "./cards";
import { useMembership } from "./membership-parts";
import { ProjectGantt } from "./project-gantt";
import { ProjectProgressView, QuestOriginCard, QuestOriginChip, TaskLine, VisibilityChip } from "./project-parts";
import { ProjectParty } from "./project-party";
import { ProjectPeople } from "./project-people";
import { AddTaskForm, TaskEditor } from "./task-editor";

type TaskView = "list" | "gantt";

export function ProjectDetail({ id }: { id: string }) {
  const state = useSyncExternalStore(subscribeProjects, getProjectState, getInitialProjectState);
  const [view, setView] = useState<TaskView>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
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

  const memberIds = isParty ? [project.owner_id, ...project.member_ids] : null;
  const editable = project.status === "active";
  const { open: openTasks, done: doneTasks } = splitTasks(list);

  // なおす枠は 1つだけ開く。同じ行を もう一度押すと閉じる
  const renderTasks = (tasks: typeof list) => (
    <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
      {tasks.map((t) => (
        <li key={t.id}>
          <TaskLine
            task={t}
            showAssignee={isParty}
            onOpen={editable ? () => setEditingId(editingId === t.id ? null : t.id) : undefined}
            opened={editingId === t.id}
          />
          {editingId === t.id && (
            <TaskEditor key={t.id} task={t} memberIds={memberIds} onClose={() => setEditingId(null)} />
          )}
        </li>
      ))}
    </ul>
  );

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
            : "あなたにしか 見えていません。"}
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
          <>
            {openTasks.length > 0 ? (
              renderTasks(openTasks)
            ) : (
              <p className="c-muted py-2 text-sm">のこりの タスクは ありません。</p>
            )}
            {doneTasks.length > 0 && (
              <div className="c-dashed-top mt-2 pt-2">
                <button
                  type="button"
                  aria-expanded={showDone}
                  onClick={() => setShowDone(!showDone)}
                  className="c-muted flex h-10 w-full items-center justify-between text-sm"
                >
                  <span>おわった タスク {doneTasks.length}こ</span>
                  <span className="text-xs" aria-hidden>
                    {showDone ? "▲" : "▼"}
                  </span>
                </button>
                {showDone && renderTasks(doneTasks)}
              </div>
            )}
          </>
        )}
        {editable && <AddTaskForm projectId={project.id} memberIds={memberIds} />}
      </Window>

      {(hasSteps || (isOwner && project.status === "active")) && (
        <div id="people" className="scroll-mt-24">
          <Window title="あいてごとの じょうきょう">
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

