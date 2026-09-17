"use client";

// プロジェクトの くわしい画面。タスクを足す・おわりにする・消す、プロジェクトを おわりにする。

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { ProjectTask } from "@/lib/guild/types";
import { formatDate } from "@/lib/guild/labels";
import { ME_ID, TODAY, getProfile, getQuest } from "@/lib/guild/mock-data";
import {
  addTask,
  getInitialProjectState,
  getProjectState,
  removeTask,
  setProjectStatus,
  subscribeProjects,
} from "@/lib/guild/project-store";
import { canSeeProject, isPrivateProject, projectProgress, tasksOf } from "@/lib/guild/projects";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { BackLink, MemberRow, Window } from "./cards";
import { Select, TextInput } from "./form-parts";
import { ProjectGauge, TaskLine, VisibilityChip } from "./project-parts";

const TASK_TITLE_MAX = 60;

export function ProjectDetail({ id }: { id: string }) {
  const { projects, tasks } = useSyncExternalStore(subscribeProjects, getProjectState, getInitialProjectState);
  const project = projects.find((p) => p.id === id);

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

  const list = tasksOf(tasks, project.id);
  const { done, total } = projectProgress(tasks, project.id);
  const isParty = !isPrivateProject(project);
  const quest = project.source_quest_id ? getQuest(project.source_quest_id) : undefined;
  const isOwner = project.owner_id === ME_ID;
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
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <VisibilityChip project={project} />
          {project.due_date && project.status === "active" && (
            <span className="c-muted">いつまでに：{formatDate(project.due_date)}</span>
          )}
          {project.done_at && <span className="c-muted">{formatDate(project.done_at)}に おわりました</span>}
        </div>
        <h1 className="mt-3 text-2xl leading-snug tracking-[0.08em] break-words">{project.title}</h1>
        {project.goal && (
          <p className="mt-3 text-[15px] leading-relaxed break-words">
            <span className="c-label mr-2 text-xs">おわりの すがた</span>
            {project.goal}
          </p>
        )}
        {quest && (
          <p className="c-muted mt-3 text-xs">
            はじまりの クエスト：
            <Link href={`/guild/quests/${quest.id}`} className="underline underline-offset-4">
              {quest.title}
            </Link>
          </p>
        )}
        <div className="mt-5">
          <ProjectGauge done={done} total={total} />
        </div>
        <p className="c-muted mt-3 text-xs">
          {isParty ? "パーティの人にだけ 見えています。" : "あなたにしか 見えていません（ギルドマスターにも 見えません）。"}
        </p>
      </Window>

      <Window title="タスク">
        {list.length === 0 ? (
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

      {isParty && (
        <Window title="パーティ">
          <ul className="grid gap-4 sm:grid-cols-2">
            {people.map((p) => (
              <li key={p.id}>
                <MemberRow profile={p} />
              </li>
            ))}
          </ul>
        </Window>
      )}

      {isOwner && (
        <div>
          {project.status === "active" ? (
            <button
              type="button"
              className="c-button-sub h-11 w-full text-sm sm:w-auto"
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
              className="c-button-sub h-11 w-full text-sm sm:w-auto"
              onClick={() => {
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
        addTask(projectId, {
          title: title.trim(),
          due_date: due || null,
          // パーティでは「きまっていない」も選べる。本人だけなら担当は持ち主
          assignee_id: memberIds ? assignee || null : null,
        });
        setTitle("");
        setDue("");
        setError("");
      }}
      className="c-dashed-top mt-5 space-y-3 pt-5"
    >
      <p className="text-[15px] tracking-wider">タスクを 足す</p>
      <TextInput value={title} onChange={setTitle} max={TASK_TITLE_MAX} label="タスクの なまえ" placeholder="例：画像を 用意する" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="c-muted mb-1 text-xs">しめきり（空でも可）</p>
          <TextInput type="date" value={due} onChange={setDue} max={10} label="しめきり" />
        </div>
        {memberIds && (
          <div>
            <p className="c-muted mb-1 text-xs">たんとう</p>
            <Select value={assignee} onChange={setAssignee} options={options} label="たんとう" placeholder="きまっていない" />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-[#c62828]">{error}</p>}
      <button type="submit" className="rpg-button h-11 w-full text-sm sm:w-auto">
        ▶ 足す
      </button>
    </form>
  );
}
