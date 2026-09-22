import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/guild/cards";
import { LiveGatheringApprovals } from "@/components/guild/live-gathering-approvals";
import { LiveMasterConsole } from "@/components/guild/live-master-console";
import { LiveMasterInvites } from "@/components/guild/live-master-invites";
import { getGuildContext, listGuildIntroRequests, listGuildMasterInvites, listGuildMembers, listPendingGatheringApplications } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "ギルドマスター" };

export default async function MasterPage() {
  const context = await getGuildContext();
  if (context.membership.role !== "owner" && context.membership.role !== "master") notFound();
  const [requests, members, pendingGatherings, invites] = await Promise.all([
    listGuildIntroRequests(), listGuildMembers(), listPendingGatheringApplications(), listGuildMasterInvites(),
  ]);
  return (
    <div className="space-y-9">
      <PageTitle
        title="ギルドマスター"
        lead="紹介依頼・限定の集まり・招待リンクをまとめて管理します。"
      />
      <nav aria-label="管理項目" className="flex flex-wrap gap-3 text-sm">
        <a href="#master-intros-title" className="c-button-sub inline-flex h-10 items-center px-4">紹介依頼</a>
        <a href="#master-gatherings-title" className="c-button-sub inline-flex h-10 items-center px-4">限定の集まり</a>
        <a href="#master-invites-title" className="c-button-sub inline-flex h-10 items-center px-4">招待リンク</a>
      </nav>
      <section aria-labelledby="master-intros-title" className="space-y-4">
        <h2 id="master-intros-title" className="text-xl tracking-wider">紹介依頼</h2>
        <LiveMasterConsole initial={requests} members={members} />
      </section>
      <section aria-labelledby="master-gatherings-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="master-gatherings-title" className="text-xl tracking-wider">限定の集まり</h2>
          <Link href="/guild/master/gathering/new" className="rpg-button inline-flex h-11 items-center px-5 text-sm">▶ 集まりを開く</Link>
        </div>
        <LiveGatheringApprovals initial={pendingGatherings} />
      </section>
      <section aria-labelledby="master-invites-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-invites-title" className="text-xl tracking-wider">招待リンク</h2>
        <LiveMasterInvites initial={invites} />
      </section>
    </div>
  );
}
