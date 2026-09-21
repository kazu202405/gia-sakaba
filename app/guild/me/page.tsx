import type { Metadata } from "next";
import Link from "next/link";
import { JobAvatar } from "@/components/guild/job-avatar";
import { PageTitle, Window } from "@/components/guild/cards";
import { groupLabel } from "@/lib/guild/labels";
import { getGuildContext, getMyGuildProfile, listGuildProjects, listGuildQuests } from "@/lib/guild/server-data";
import type { VisibleGroup } from "@/lib/guild/types";

export const metadata: Metadata = { title: "マイページ" };

export default async function MyPage() {
  const [context, me, quests, projects] = await Promise.all([
    getGuildContext(), getMyGuildProfile(), listGuildQuests(), listGuildProjects(),
  ]);
  const fields = [me.bio, me.can_help_with, me.strengths, me.values_text, me.vision, me.looking_for, me.want_to_meet];
  const filled = fields.filter((value) => value.trim()).length + (me.photo_url ? 1 : 0);
  const myQuests = quests.filter((quest) => quest.creator_id === me.id && quest.status !== "withdrawn");
  const joinedQuests = quests.filter((quest) => quest.my_application?.status === "applied");
  const myProjects = projects.filter((project) => project.owner_id === me.id);

  return <div className="space-y-9">
    <PageTitle title="マイページ" lead="自分のステータスと、酒場で進めていることを確認できます。" />
    <Window title={context.guild.terms.status}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <JobAvatar icon={me.job_icon} photoUrl={me.photo_url} name={me.job || me.display_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl tracking-[0.12em]">{me.display_name}</h1>
          {me.name_kana && <p className="c-muted mt-1 text-xs">{me.name_kana}</p>}
          <p className="mt-1 break-words text-[15px]">{me.headline || "ひとことはまだありません"}</p>
          <p className="c-muted mt-2 text-xs">{me.company_name} · {me.job || "職業未設定"} · {me.region || "地域未設定"}</p>
          <div className="mt-4">
            <div className="c-muted flex justify-between text-xs"><span>ステータスの かんせいど</span><span>{filled}/8</span></div>
            <div className="c-gauge mt-1" aria-label={`8項目中${filled}項目が入力済み`}>
              {Array.from({ length: 8 }, (_, index) => <span key={index} data-on={index < filled} />)}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:w-44">
          <Link href="/guild/me/status" className="rpg-button h-11 text-sm">▶ ステータスをなおす</Link>
          <Link href={`/guild/members/${me.id}`} className="c-button-sub h-11 text-sm">みんなからの見え方</Link>
        </div>
      </div>
    </Window>

    <Window title="こうかい はんい">
      <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
        {(["work", "values", "connect"] as VisibleGroup[]).map((group) => <li key={group} className="flex items-center justify-between gap-4 py-2.5 text-sm">
          <span>{groupLabel[group].title}</span>
          <span className="c-muted text-xs">{me.visible_groups.includes(group) ? "公開中" : "非公開"}</span>
        </li>)}
        <li className="flex items-center justify-between gap-4 py-2.5 text-sm"><span>しょうかいの受け付け</span><span className="c-muted text-xs">{me.accept_intro ? "受付中" : "お休み中"}</span></li>
        <li className="flex items-center justify-between gap-4 py-2.5 text-sm"><span>ウェブサイト</span><span className="c-muted text-xs">{me.website_visibility === "members" ? "メンバーに公開" : "非公開（紹介機能は準備中）"}</span></li>
      </ul>
      <Link href="/guild/me/status#visibility" className="c-muted mt-3 inline-block text-xs underline">公開範囲をなおす</Link>
    </Window>

    <div className="grid gap-6 md:grid-cols-2">
      <Window title={`出した ${context.guild.terms.quest}`}>
        {myQuests.length === 0 ? <p className="c-muted text-sm">まだありません。<Link href="/guild/quests/new" className="underline">クエストを出す</Link></p> :
          <ul className="space-y-2">{myQuests.map((quest) => <li key={quest.id}><Link href={`/guild/quests/${quest.id}`} className="rpg-cursor-row block break-words text-sm">▶ {quest.title}</Link></li>)}</ul>}
      </Window>
      <Window title="参加したいクエスト">
        {joinedQuests.length === 0 ? <p className="c-muted text-sm">まだありません。</p> :
          <ul className="space-y-2">{joinedQuests.map((quest) => <li key={quest.id}><Link href={`/guild/quests/${quest.id}`} className="rpg-cursor-row block break-words text-sm">▶ {quest.title}</Link></li>)}</ul>}
      </Window>
    </div>
    <Window title="自分のプロジェクト">
      {myProjects.length === 0 ? <p className="c-muted text-sm">まだありません。<Link href="/guild/projects/new" className="underline">プロジェクトをつくる</Link></p> :
        <ul className="space-y-2">{myProjects.map((project) => <li key={project.id}><Link href={`/guild/projects/${project.id}`} className="rpg-cursor-row block break-words text-sm">▶ {project.title} <span className="c-muted text-xs">{project.status === "done" ? "完了" : "進行中"}</span></Link></li>)}</ul>}
    </Window>
  </div>;
}
