import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/guild/cards";
import { LiveMasterConsole } from "@/components/guild/live-master-console";
import { getGuildContext, listGuildIntroRequests, listGuildMembers } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "ギルドマスター" };

export default async function MasterPage() {
  const context = await getGuildContext();
  if (context.membership.role !== "owner" && context.membership.role !== "master") notFound();
  const [requests, members] = await Promise.all([listGuildIntroRequests(), listGuildMembers()]);
  return (
    <div>
      <PageTitle
        title="ギルドマスター"
        lead="届いた紹介依頼を見て、相手に打診するか、見送るかを決めます。"
      />
      <LiveMasterConsole initial={requests} members={members} />
    </div>
  );
}
