import Link from "next/link";
import type { GuildProject } from "@/lib/guild/server-data";

export function LiveProjectList({ projects, userId, isPaid }: { projects: GuildProject[]; userId: string; isPaid: boolean }) {
  const ownedCount = projects.filter((project) => project.owner_id === userId).length;
  const canCreate = isPaid || ownedCount < 2;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="c-muted text-sm">自分と参加中のプロジェクトだけが表示されます。</p>
        {canCreate ? <Link href="/guild/projects/new" className="rpg-button px-5 py-2.5">▶ プロジェクトをつくる</Link> :
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <span className="c-muted text-sm">無料プランの作成枠（2件）を使い切りました</span>
            <Link href="/guild/plan" className="rpg-button px-5 py-2.5">▶ 有料会員を見る</Link>
          </div>}
      </div>
      {projects.length === 0 ? (
        <div className="c-window p-6 pt-10"><span className="c-window-title">まだありません</span><p className="text-sm">まずは取り組みたいことを登録しましょう。</p></div>
      ) : projects.map((project) => {
        const done = project.tasks.filter((task) => task.status === "done").length;
        return <Link key={project.id} href={`/guild/projects/${project.id}`} className="c-card rpg-cursor-row block p-4">
          <p className="c-label text-xs">{project.status === "done" ? "完了" : "進行中"} · {project.owner_id === userId ? "自分のプロジェクト" : "参加中"}</p>
          <h2 className="mt-1 break-words text-lg">▶ {project.title}</h2>
          {project.goal && <p className="c-muted mt-1 break-words text-sm">{project.goal}</p>}
          <p className="c-muted mt-2 text-xs">タスク {done}/{project.tasks.length} 完了{project.due_date ? ` · 期限 ${project.due_date}` : ""}</p>
        </Link>;
      })}
    </div>
  );
}
