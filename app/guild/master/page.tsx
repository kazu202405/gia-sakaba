import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/guild/cards";
import { LiveGatheringApprovals } from "@/components/guild/live-gathering-approvals";
import { LiveMasterConsole } from "@/components/guild/live-master-console";
import { getGuildContext, listGuildIntroRequests, listGuildMembers, listPendingGatheringApplications } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "ギルドマスター" };

export default async function MasterPage() {
  const context = await getGuildContext();
  if (context.membership.role !== "owner" && context.membership.role !== "master") notFound();
  const [requests, members, pendingGatherings] = await Promise.all([
    listGuildIntroRequests(), listGuildMembers(), listPendingGatheringApplications(),
  ]);
  return (
    <div className="space-y-9">
      <PageTitle
        title="ギルドマスター"
        lead="紹介依頼を確認して人をつなぎ、限定の集まりを管理します。"
      />
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
    </div>
  );
}
