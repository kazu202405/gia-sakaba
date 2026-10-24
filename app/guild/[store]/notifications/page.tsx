import type { Metadata } from "next";
import { currentStore } from "@/lib/guild/current-store";
import { PageTitle } from "@/components/guild/cards";
import { LiveNotificationList } from "@/components/guild/live-notification-list";
import { listGuildIntroRequests, listGuildMembers, listGuildNotifications, listGuildQuests } from "@/lib/guild/server-data";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await currentStore()).w("notifications.title") };
}

export default async function NotificationsPage() {
  const store = await currentStore();
  const [notifications, members, quests, intros] = await Promise.all([
    listGuildNotifications(), listGuildMembers(), listGuildQuests(), listGuildIntroRequests(),
  ]);
  return <div>
    <PageTitle title={store.w("notifications.title")} lead={store.w("notifications.lead")} />
    <LiveNotificationList initial={notifications} members={members} quests={quests} intros={intros} />
  </div>;
}
