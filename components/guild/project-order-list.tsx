"use client";

// プロジェクト一覧の「進行中」。ふだんはカードのリンク、「並べ替え」を押すと各行に ▲▼ が出る（0118・2026-09-29 五島さん）。
// 並び順は人ごと。「この順にする」で保存するまでは画面の中だけで動かす（「やめる」で元に戻る）。

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { GuildProject } from "@/lib/guild/server-data";
import { moveItem } from "@/lib/guild/project-order";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { useGuildRouter } from "@/components/guild/use-guild-router";

export function ProjectCard({ project, userId }: { project: GuildProject; userId: string }) {
  const done = project.tasks.filter((task) => task.status === "done").length;
  return <Link href={`/guild/projects/${project.id}`} className="c-card rpg-cursor-row block p-4">
    <p className="c-label text-xs">{project.status === "done" ? "完了" : "進行中"} · {project.owner_id === userId ? "自分のプロジェクト" : "参加中"}</p>
    <h2 className="mt-1 break-words text-lg">▶ {project.title}</h2>
    {project.goal && <p className="c-muted mt-1 break-words text-sm">{project.goal}</p>}
    <p className="c-muted mt-2 text-xs">タスク {done}/{project.tasks.length} 完了{project.due_date ? ` · 期限 ${project.due_date}` : ""}</p>
  </Link>;
}

export function ProjectOrderList({ projects, userId }: { projects: GuildProject[]; userId: string }) {
  const router = useGuildRouter();
  const [ordering, setOrdering] = useState(false);
  const [draft, setDraft] = useState(projects);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  async function save() {
    if (lock.current) return;
    const changed = draft.some((project, index) => project.id !== projects[index]?.id);
    if (!changed) { setOrdering(false); return; }
    lock.current = true;
    setSaving(true); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_set_project_order", {
        p_guild_slug: "gia", p_project_ids: draft.map((project) => project.id),
      });
      if (rpcError) { setError("並び順を保存できませんでした。少し待ってもう一度お試しください。"); return; }
      setOrdering(false);
      uiToast("並び順を保存しました");
      router.refresh();
    } catch {
      setError("通信に失敗しました。接続を確認してください。");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  const list = ordering ? draft : projects;
  return <div className="space-y-3">
    {projects.length >= 2 && <div className="flex flex-wrap items-center justify-end gap-2">
      {ordering ? <>
        <button type="button" disabled={saving} onClick={() => { setOrdering(false); setDraft(projects); setError(""); }} className="c-button-sub h-10 px-4 text-sm">やめる</button>
        <button type="button" disabled={saving} aria-busy={saving} onClick={() => void save()} className="rpg-button h-10 px-4 text-sm">{saving ? "保存中…" : "▶ この順にする"}</button>
      </> : <button type="button" onClick={() => { setDraft(projects); setOrdering(true); }} className="c-button-sub h-10 px-4 text-sm">並べ替え</button>}
    </div>}
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
    {ordering && <p className="c-muted text-xs">▲▼で動かして「この順にする」を押してください。並び順はあなたの画面だけに反映されます。</p>}
    <ul className="space-y-3">
      {list.map((project, index) => <li key={project.id} className={ordering ? "flex items-stretch gap-2" : undefined}>
        {ordering ? <>
          <div className="c-card min-w-0 flex-1 p-4">
            <p className="c-label text-xs">{project.owner_id === userId ? "自分のプロジェクト" : "参加中"}</p>
            <p className="mt-1 break-words text-[15px]">{project.title}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <button type="button" disabled={saving || index === 0} onClick={() => setDraft((current) => moveItem(current, index, -1))} aria-label={`${project.title}を上へ`} className="c-button-sub h-11 w-11 !px-0 disabled:opacity-40"><ChevronUp size={18} aria-hidden="true" /></button>
            <button type="button" disabled={saving || index === list.length - 1} onClick={() => setDraft((current) => moveItem(current, index, 1))} aria-label={`${project.title}を下へ`} className="c-button-sub h-11 w-11 !px-0 disabled:opacity-40"><ChevronDown size={18} aria-hidden="true" /></button>
          </div>
        </> : <ProjectCard project={project} userId={userId} />}
      </li>)}
    </ul>
  </div>;
}
