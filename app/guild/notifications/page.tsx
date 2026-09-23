import type { Metadata } from "next";
import { PageTitle } from "@/components/guild/cards";
import { LiveNotificationList } from "@/components/guild/live-notification-list";
import { listGuildIntroRequests, listGuildMembers, listGuildNotifications, listGuildQuests } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "おしらせ" };

export default async function NotificationsPage() {
  const [notifications, members, quests, intros] = await Promise.all([
    listGuildNotifications(), listGuildMembers(), listGuildQuests(), listGuildIntroRequests(),
  ]);
  return <div>
    <PageTitle title="おしらせ" lead="紹介依頼やクエストの変化を、酒場の中で確認できます。メールやLINEには届きません。" />
    <LiveNotificationList initial={notifications} members={members} quests={quests} intros={intros} />
  </div>;
}
