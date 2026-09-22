import type { Metadata } from "next";
import Link from "next/link";
import { MoreLink, Window } from "@/components/guild/cards";
import { dueLabel, upcomingTasks } from "@/lib/guild/projects";
import {
  getMyGuildProfile,
  listGuildNotifications,
  listGuildProjects,
} from "@/lib/guild/server-data";

export const metadata: Metadata = { title: { absolute: "GIAの酒場" } };

export default async function GuildHomePage() {
  const [me, notifications, projects] = await Promise.all([
    getMyGuildProfile(),
    listGuildNotifications(),
    listGuildProjects(),
  ]);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const active = projects.filter((project) => project.status === "active");
  const upcoming = upcomingTasks(projects, projects.flatMap((project) => project.tasks), me.id, today);
  const unread = notifications.filter((item) => item.read_at === null).length;

  return <div className="space-y-10">
    <Window title="おしらせ">
      <p className="text-[17px] leading-loose">おかえりなさい、{me.display_name}さん。</p>
      <p className="mt-1 text-sm leading-relaxed">
        {unread > 0 ? <>まだ読んでいない おしらせが <span className="text-xl tabular-nums">{unread}</span>件あります。</> : "新しい おしらせはありません。"}
      </p>
      <Link href="/guild/notifications" className="rpg-cursor-row mt-3 inline-flex items-center text-sm">▶ おしらせを見る</Link>
    </Window>

    <div className="grid gap-10 md:grid-cols-2">
      <Window title="すすめている プロジェクト" action={<MoreLink href="/guild/projects" />} className="order-2 md:order-1">
        {active.length === 0 ? <p className="c-muted text-sm leading-relaxed">すすめている プロジェクトはありません。<Link href="/guild/projects/new" className="ml-1 underline underline-offset-4">プロジェクトをつくる</Link></p> :
          <ul className="space-y-5">{active.slice(0, 5).map((project) => {
            const done = project.tasks.filter((task) => task.status === "done").length;
            return <li key={project.id}>
              <Link href={`/guild/projects/${project.id}`} className="rpg-cursor-row block text-sm break-words">▶ {project.title}</Link>
              <div className="c-gauge mt-2" aria-label={`タスク ${done}/${project.tasks.length} 完了`}>
                {Array.from({ length: 10 }, (_, index) => <span key={index} data-on={index < (project.tasks.length ? Math.round(done / project.tasks.length * 10) : 0)} />)}
              </div>
            </li>;
          })}</ul>}
      </Window>

      <Window title="しめきりが近い タスク" className="order-1 md:order-2">
        {upcoming.length === 0 ? <p className="c-muted text-sm">7日以内の自分のタスクはありません。</p> :
          <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/15">{upcoming.slice(0, 8).map(({ task, project }) => {
            const due = dueLabel(task.due_date!, today);
            return <li key={task.id}>
              <Link href={`/guild/projects/${project.id}`} className="rpg-cursor-row block py-3">
                <span className="block text-sm break-words">▶ {task.title}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 text-xs"><span className="c-muted">{project.title}</span><span className={due.overdue ? "c-chip-strong" : "c-muted"}>{due.text}</span></span>
              </Link>
            </li>;
          })}</ul>}
      </Window>
    </div>
  </div>;
}
