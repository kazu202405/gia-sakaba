import type { Metadata } from "next";
import { PageTitle } from "@/components/guild/cards";
import { LiveRequests } from "@/components/guild/live-requests";
import { getAuthenticatedUserId, listGuildIntroRequests, listGuildMembers } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "つながり申請" };

export default async function RequestsPage() {
  const [requests, members, currentUserId] = await Promise.all([
    listGuildIntroRequests(), listGuildMembers(), getAuthenticatedUserId(),
  ]);
  return (
    <div>
      <PageTitle
        title="つながり申請"
        lead="申請は相手に直接届きます。相手が承諾すると、お互いの登録済みの連絡先が見えるようになります。"
      />
      <LiveRequests initial={requests} members={members} currentUserId={currentUserId} />
    </div>
  );
}
