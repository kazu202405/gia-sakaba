import type { Metadata } from "next";
import { PageTitle } from "@/components/guild/cards";
import { NotificationList } from "@/components/guild/notification-list";

export const metadata: Metadata = { title: "おしらせ" };

export default function NotificationsPage() {
  return (
    <div>
      <PageTitle
        title="おしらせ"
        lead="参加の希望・クエストの変更・しょうかいの進みを ここで お知らせします。メールやLINEには まだ届きません。"
      />
      <NotificationList />
    </div>
  );
}
