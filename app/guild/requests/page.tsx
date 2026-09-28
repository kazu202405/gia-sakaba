import type { Metadata } from "next";
import { PageTitle } from "@/components/guild/cards";
import { LiveRequests } from "@/components/guild/live-requests";
import { getAuthenticatedUserId, listGuildIntroRequests, listGuildMembers } from "@/lib/guild/server-data";
import { parseContactItemsMap } from "@/lib/guild/contact-items";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "つながり申請" };

export default async function RequestsPage() {
  const [requests, members, currentUserId] = await Promise.all([
    listGuildIntroRequests(), listGuildMembers(), getAuthenticatedUserId(),
  ]);
  // 承諾し合った相手の連絡先（「つながった人だけ」の分もここで見える）
  const counterpartIds = [...new Set(requests
    .filter((request) => request.status === "accepted" || request.status === "introduced")
    .map((request) => request.requester_id === currentUserId ? request.target_id : request.requester_id))];
  let contacts: ReturnType<typeof parseContactItemsMap> | null = {};
  if (counterpartIds.length > 0) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("sakaba_get_contact_items", { p_user_ids: counterpartIds.slice(0, 200) });
    contacts = error ? null : parseContactItemsMap(data);
  }
  return (
    <div>
      <PageTitle
        title="つながり申請"
        lead="申請は相手に直接届きます。相手が承諾すると、お互いの登録済みの連絡先が見えるようになります。"
      />
      <LiveRequests initial={requests} members={members} currentUserId={currentUserId} contacts={contacts} />
    </div>
  );
}
