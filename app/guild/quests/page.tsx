import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle, QuestCard } from "@/components/guild/cards";
import { MarkSeen } from "@/components/guild/mark-seen";
import { guild, quests } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: `${guild.terms.quest} けいじばん` };

export default function QuestsPage() {
  // 取り下げたクエストは けいじばんに出さない（参加したいと伝えていた人には おしらせで伝える）
  const open = quests
    .filter((q) => q.status === "open" || q.status === "in_progress")
    .sort((a, b) => Number(b.is_urgent) - Number(a.is_urgent) || b.created_at.localeCompare(a.created_at));
  const done = quests.filter((q) => q.status === "completed");

  return (
    <div>
      <MarkSeen list="quests" />
      <PageTitle title={`${guild.terms.quest} けいじばん`} lead="仕事の依頼・相談・協業したいことを、だれでも出せます。" />

      <div className="mb-9">
        <Link href="/guild/quests/new" className="rpg-button h-12 w-full text-base sm:w-auto">
          ▶ {guild.terms.quest}を出す
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {open.map((q) => (
          <QuestCard key={q.id} quest={q} />
        ))}
      </div>

      {done.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-lg tracking-wider">▶ クリアした {guild.terms.quest}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {done.map((q) => (
              <QuestCard key={q.id} quest={q} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
