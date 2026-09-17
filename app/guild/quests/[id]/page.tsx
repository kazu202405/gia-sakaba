import { notFound } from "next/navigation";
import { BackLink, MemberRow, MoreLink, Window, questCategoryMark } from "@/components/guild/cards";
import { MembersOnlyGate } from "@/components/guild/membership-parts";
import { QuestJoinButton } from "@/components/guild/quest-join-button";
import { QuestOwnerActions } from "@/components/guild/quest-owner-actions";
import { QuestToProject } from "@/components/guild/quest-to-project";
import { formatDate, questCategoryLabel, questStatusLabel } from "@/lib/guild/labels";
import {
  ME_ID,
  applicantCount,
  canSeeApplicants,
  getProfile,
  getQuest,
  guild,
  introRequests,
  parties,
} from "@/lib/guild/mock-data";
import { introsToCancelOnWithdraw } from "@/lib/guild/notifications";

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
          {q.members_only && <span className="c-chip">有料会員限定</span>}
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
                {q.member_limit}人まで（参加したい {applicantCount(q.id)}人）
              </dd>
            </>
          )}
        </dl>

        {/* 限定の集まりは、ひとことだけ だれにでも見せる（「こういう集まりがある」が分かるように） */}
        {q.members_only && <p className="mt-6 text-[15px] leading-relaxed break-words">{q.summary}</p>}

        <MembersOnlyGate quest={q}>
          <p className="mt-6 whitespace-pre-line text-[15px] leading-loose break-words">{q.body}</p>

          <div className="c-dashed-top mt-8 pt-6">
            <QuestJoinButton quest={q} />
            {/* ギルドマスターは、人のクエストでも参加したい人を見られる */}
            {q.creator_id !== ME_ID && canSeeApplicants(q, ME_ID) && (
              <div className="mt-4">
                <MoreLink
                  href={`/guild/quests/${q.id}/applicants`}
                  label={`参加したい人を見る（${guild.terms.master}）`}
                />
              </div>
            )}
            <QuestToProject quest={q} />
            {q.creator_id === ME_ID && q.status === "open" && (
              <QuestOwnerActions
                questId={q.id}
                applicantCount={applicantCount(q.id)}
                openIntroCount={introsToCancelOnWithdraw(q.id, introRequests).length}
              />
            )}
          </div>
        </MembersOnlyGate>
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
