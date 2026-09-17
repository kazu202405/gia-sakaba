import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink, MemberRow, QuestCard, Window } from "@/components/guild/cards";
import { challengerIds, questsForBoss } from "@/lib/guild/boss";
import { bosses, getProfile, guild, questApplications, quests } from "@/lib/guild/mock-data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: bosses.find((b) => b.id === id)?.title ?? "ギルドの ボス" };
}

// ギルドの ボス＝みんなで挑む課題。ここに 挑んでいるクエストと 人が集まる
export default async function BossPage({ params }: Props) {
  const { id } = await params;
  const boss = bosses.find((b) => b.id === id);
  if (!boss) notFound();

  const related = questsForBoss(quests, boss.id);
  const people = challengerIds(quests, questApplications, boss.id)
    .map((pid) => getProfile(pid))
    .filter((p) => p !== undefined);
  const master = getProfile(boss.created_by);

  return (
    <div className="space-y-11">
      <BackLink href="/guild/quests" label={`${guild.terms.quest} けいじばん`} />

      <Window title="ギルドの ボス">
        <p className="c-label text-xs">みんなで 挑む 課題{boss.status === "defeated" ? "（たおした）" : ""}</p>
        <h1 className="mt-2 text-2xl leading-snug tracking-[0.08em] break-words">⚑ {boss.title}</h1>
        <p className="mt-4 text-[15px] leading-relaxed break-words">{boss.description}</p>
        <p className="c-muted mt-4 text-xs leading-relaxed">
          {master ? `${master.display_name}（${guild.terms.master}）が かかげました。` : ""}
          敵にするのは 課題だけです。人や会社を 敵にする クエストは 出さないでください。
        </p>
        <dl className="c-dashed-top mt-5 grid grid-cols-2 gap-3 pt-4">
          <div>
            <dt className="c-muted text-xs">挑んでいる {guild.terms.quest}</dt>
            <dd className="text-3xl tabular-nums">{related.length}</dd>
          </div>
          <div>
            <dt className="c-muted text-xs">挑んでいる 人</dt>
            <dd className="text-3xl tabular-nums">{people.length}</dd>
          </div>
        </dl>
        {boss.status === "active" && (
          <Link
            href={`/guild/quests/new?boss=${boss.id}`}
            className="rpg-button mt-6 h-12 w-full text-base sm:w-auto sm:px-6"
          >
            ▶ このボスに 挑む {guild.terms.quest}を 出す
          </Link>
        )}
      </Window>

      <Window title={`挑んでいる ${guild.terms.quest}`}>
        {related.length === 0 ? (
          <p className="c-muted text-sm">まだ ありません。最初の {guild.terms.quest}を 出してみてください。</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {related.map((q) => (
              <QuestCard key={q.id} quest={q} compact />
            ))}
          </div>
        )}
      </Window>

      {people.length > 0 && (
        <Window title="挑んでいる 人">
          <ul className="grid gap-4 sm:grid-cols-2">
            {people.map((p) => (
              <li key={p.id}>
                <MemberRow profile={p} />
              </li>
            ))}
          </ul>
        </Window>
      )}
    </div>
  );
}
