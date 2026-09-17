import type { Metadata } from "next";
import { MemberRow, MoreLink, PageTitle, QuestRow, Window } from "@/components/guild/cards";
import { NotificationList } from "@/components/guild/notification-list";
import { ME_ID, guild, profiles, quests } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: "おしらせ" };

// おしらせ＝ギルドで起きていること。上に自分あて、下にギルド全体の新しい動き
export default function NotificationsPage() {
  const newQuests = quests
    .filter((q) => q.status === "open")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);
  const newMembers = [...profiles]
    .filter((p) => p.id !== ME_ID)
    .sort((a, b) => b.joined_at.localeCompare(a.joined_at))
    .slice(0, 4);

  return (
    <div className="space-y-11">
      <PageTitle
        title="おしらせ"
        lead="参加の希望・クエストの変更・しょうかいの進みと、ギルドの あたらしい動きです。メールやLINEには まだ届きません。"
      />
      <NotificationList />

      <Window title={`あたらしい ${guild.terms.quest}`} action={<MoreLink href="/guild/quests" />}>
        <ul className="space-y-3">
          {newQuests.map((q) => (
            <li key={q.id}>
              <QuestRow quest={q} />
            </li>
          ))}
        </ul>
      </Window>

      <Window title={`あたらしい ${guild.terms.member}`} action={<MoreLink href="/guild/members" />}>
        <ul className="grid gap-4 sm:grid-cols-2">
          {newMembers.map((p) => (
            <li key={p.id}>
              <MemberRow profile={p} />
            </li>
          ))}
        </ul>
      </Window>
    </div>
  );
}
