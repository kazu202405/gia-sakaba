import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/guild/cards";
import { LiveGatheringApprovals } from "@/components/guild/live-gathering-approvals";
import { LiveMasterInvites } from "@/components/guild/live-master-invites";
import { InviteNetwork } from "@/components/guild/invite-network";
import { listMealWishes } from "@/lib/guild/meal-wishes-server";
import { getGuildContext, listGuildInviteNetwork, listGuildMasterInvites, listPendingGatheringApplications } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "ギルドマスター" };

export default async function MasterPage() {
  const context = await getGuildContext();
  if (context.membership.role !== "owner" && context.membership.role !== "master") notFound();
  const [pendingGatherings, invites, network] = await Promise.all([
    listPendingGatheringApplications(), listGuildMasterInvites(), listGuildInviteNetwork(),
  ]);
  const diningEnabled = process.env.SAKABA_880_ENABLED === "true";
  const mealWishes = diningEnabled ? await listMealWishes(context.guild.id) : [];
  const memberNames = new Map(network.map((person) => [person.user_id, person.display_name]));
  return (
    <div className="space-y-9">
      <PageTitle
        title="ギルドマスター"
        lead="限定の集まりと、酒場への招待のつながりを管理します。"
      />
      <nav aria-label="管理項目" className="flex flex-wrap gap-3 text-sm">
        <a href="#master-gatherings-title" className="c-button-sub inline-flex h-10 items-center px-4">限定の集まり</a>
        {diningEnabled && <a href="#master-meal-wishes-title" className="c-button-sub inline-flex h-10 items-center px-4">会食の希望</a>}
        <a href="#master-invites-title" className="c-button-sub inline-flex h-10 items-center px-4">招待リンク</a>
        <a href="#master-network-title" className="c-button-sub inline-flex h-10 items-center px-4">招待のつながり</a>
        <Link href="/guild/join?preview=1" className="c-button-sub inline-flex h-10 items-center px-4">入会フォームを見る</Link>
      </nav>
      <section aria-labelledby="master-gatherings-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="master-gatherings-title" className="text-xl tracking-wider">限定の集まり</h2>
          <Link href="/guild/master/gathering/new" className="rpg-button inline-flex h-11 items-center px-5 text-sm">▶ 集まりを開く</Link>
        </div>
        <LiveGatheringApprovals initial={pendingGatherings} />
      </section>
      {diningEnabled && <section aria-labelledby="master-meal-wishes-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-meal-wishes-title" className="text-xl tracking-wider">会食の希望</h2>
        <p className="c-muted text-sm">880円会員から届いた希望です。会食の開催・成立を約束するものではありません。</p>
        {mealWishes.length === 0 ? <p className="c-card p-5 text-sm">まだ希望は届いていません。</p> : <div className="grid gap-4 md:grid-cols-2">
          {mealWishes.map((wish) => <article key={wish.user_id} className="c-card min-w-0 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><Link href={`/guild/members/${wish.user_id}`} className="underline underline-offset-4">{memberNames.get(wish.user_id) ?? "メンバー"}</Link><time className="c-muted text-xs" dateTime={wish.updated_at}>{new Date(wish.updated_at).toLocaleDateString("ja-JP")}</time></div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{wish.wish_text}</p>
          </article>)}
        </div>}
      </section>}
      <section aria-labelledby="master-invites-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-invites-title" className="text-xl tracking-wider">招待リンク</h2>
        <LiveMasterInvites initial={invites} />
      </section>
      <section aria-labelledby="master-network-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-network-title" className="text-xl tracking-wider">招待のつながり</h2>
        <InviteNetwork members={network} />
      </section>
    </div>
  );
}
