import { notFound } from "next/navigation";
import { BackLink, MemberRow, Window, questCategoryMark } from "@/components/guild/cards";
import { GROUND_RULES } from "@/lib/guild/rules";
import { formatDate, questCategoryLabel, questStatusLabel } from "@/lib/guild/labels";
import {
  getAuthenticatedUserId,
  getGuildContext,
  listGuildMembers,
  listGuildQuests,
} from "@/lib/guild/server-data";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "クエスト" };

export default async function QuestDetailPage({ params }: Props) {
  const { id } = await params;
  const [context, quests, members, currentUserId] = await Promise.all([
    getGuildContext(),
    listGuildQuests(),
    listGuildMembers(),
    getAuthenticatedUserId(),
  ]);
  const q = quests.find((quest) => quest.id === id);
  if (!q) notFound();

  const creator = members.find((member) => member.id === q.creator_id);
  const questTerm = context.guild.terms.quest;
  const canReadDetails = !q.members_only || context.is_paid || q.creator_id === currentUserId;

  return (
    <div className="space-y-11">
      <BackLink href="/guild/quests" label={`${questTerm} けいじばん`} />

      <Window title={`${questCategoryMark[q.category]} ${questCategoryLabel[q.category]}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {q.is_urgent && q.status === "open" && <span className="c-tag-urgent">急ぎ</span>}
          {q.members_only && <span className="c-chip">有料会員限定</span>}
          <span className="c-chip">{questStatusLabel[q.status]}</span>
        </div>

        <h1 className="mt-3 text-xl leading-snug tracking-wider break-words sm:text-2xl">{q.title}</h1>

        {canReadDetails ? (
          <>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {q.region && (
                <>
                  <dt className="c-label">ばしょ</dt>
                  <dd>{q.region}</dd>
                </>
              )}
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
                    {q.member_limit}人まで（参加したい {q.applicant_count}人）
                  </dd>
                </>
              )}
            </dl>

            {q.category === "gathering" && (
              <div className="c-card mt-6 px-4 py-3">
                <p className="c-label text-xs">話すときの 約束（グランドルール）</p>
                <ul className="mt-1 space-y-1 text-sm leading-relaxed">
                  {GROUND_RULES.map((rule) => (
                    <li key={rule}>・{rule}</li>
                  ))}
                </ul>
              </div>
            )}

            {q.summary && <p className="mt-6 text-[15px] leading-relaxed break-words">{q.summary}</p>}
            {q.body && <p className="mt-4 whitespace-pre-line text-[15px] leading-loose break-words">{q.body}</p>}

            <div className="c-dashed-top c-muted mt-8 pt-5 text-xs leading-relaxed">
              参加・編集などの操作は、実データへの接続を順次進めています。いまは内容の閲覧ができます。
            </div>
          </>
        ) : (
          <div className="c-card mt-6 border-dashed px-4 py-5 text-sm leading-relaxed">
            この{questTerm}の詳しい内容は、有料会員だけが閲覧できます。
          </div>
        )}
      </Window>

      {creator && (
        <Window title="出した人">
          <MemberRow profile={creator} />
        </Window>
      )}
    </div>
  );
}
