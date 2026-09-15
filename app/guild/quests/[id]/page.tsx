import { notFound } from "next/navigation";
import { BackLink, MemberRow, Window, questCategoryMark } from "@/components/guild/cards";
import { QuestJoinButton } from "@/components/guild/quest-join-button";
import { formatDate, questCategoryLabel, questStatusLabel } from "@/lib/guild/labels";
import { getProfile, getQuest, guild, parties } from "@/lib/guild/mock-data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: getQuest(id)?.title ?? guild.terms.quest };
}

export default async function QuestDetailPage({ params }: Props) {
  const { id } = await params;
  const q = getQuest(id);
  if (!q) notFound();

  const creator = getProfile(q.creator_id);
  const party = parties.find((p) => p.quest_id === q.id);

  return (
    <div className="space-y-11">
      <BackLink href="/guild/quests" label={`${guild.terms.quest} けいじばん`} />

      <Window title={`${questCategoryMark[q.category]} ${questCategoryLabel[q.category]}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {q.is_urgent && q.status === "open" && <span className="c-tag-urgent">急ぎ</span>}
          <span className="c-chip">{questStatusLabel[q.status]}</span>
        </div>

        <h1 className="mt-3 text-xl leading-snug tracking-wider break-words sm:text-2xl">{q.title}</h1>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="c-label">ばしょ</dt>
          <dd>{q.region}</dd>
          {q.deadline && (
            <>
              <dt className="c-label">しめきり</dt>
              <dd>{formatDate(q.deadline)}まで</dd>
            </>
          )}
          {q.member_limit && (
            <>
              <dt className="c-label">にんずう</dt>
              <dd>
                {q.member_limit}人まで（参加したい {q.applicant_ids.length}人）
              </dd>
            </>
          )}
        </dl>

        <p className="mt-6 whitespace-pre-line text-[15px] leading-loose break-words">{q.body}</p>

        <div className="c-dashed-top mt-8 pt-6">
          <QuestJoinButton quest={q} />
        </div>
      </Window>

      {creator && (
        <Window title="出した人">
          <MemberRow profile={creator} />
        </Window>
      )}

      {party && (
        <Window title={guild.terms.party}>
          <p className="text-base">{party.name}</p>
          <p className="c-muted mt-1 text-xs">
            {guild.terms.quest}クリアで、この{guild.terms.party}が残りました。
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {party.member_ids.map((mid) => {
              const m = getProfile(mid);
              return m ? (
                <li key={mid}>
                  <MemberRow profile={m} />
                </li>
              ) : null;
            })}
          </ul>
        </Window>
      )}
    </div>
  );
}
