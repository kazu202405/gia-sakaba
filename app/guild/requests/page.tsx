import type { Metadata } from "next";
import { PageTitle } from "@/components/guild/cards";
import { LiveRequests } from "@/components/guild/live-requests";
import { getAuthenticatedUserId, listGuildIntroRequests, listGuildMembers } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "しょうかい いらい" };

export default async function RequestsPage() {
  const [requests, members, currentUserId] = await Promise.all([
    listGuildIntroRequests(), listGuildMembers(), getAuthenticatedUserId(),
  ]);
  return (
    <div>
      <PageTitle
        title="しょうかい いらい"
        lead="依頼は相手に直接届きます。相手が承諾したときだけ、おたがいの れんらく先が見えるようになります。"
      />
      <LiveRequests initial={requests} members={members} currentUserId={currentUserId} />
    </div>
  );
}
