import { notFound } from "next/navigation";
import { BackLink, MemberRow, Window, questCategoryMark } from "@/components/guild/cards";
import { LiveQuestApplication } from "@/components/guild/live-quest-application";
import { GuestGatheringHost } from "@/components/guild/guest-gathering-host";
import { GatheringSchedule } from "@/components/guild/gathering-schedule";
import { LiveQuestOwnerActions } from "@/components/guild/live-quest-owner-actions";
import { GROUND_RULES } from "@/lib/guild/rules";
import { formatDate, questCategoryLabel, questStatusLabel } from "@/lib/guild/labels";
import type { GuestGatheringHost as GuestGatheringHostData } from "@/lib/guild/guest-gathering";
import { formatScheduleLong, type GatheringSchedule as GatheringScheduleData } from "@/lib/guild/gathering-schedule";
import { createClient } from "@/lib/supabase/server";
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
  const canManageGuestLink = q.creator_id === currentUserId && q.category === "gathering" && !q.members_only;
  const guestLinkResult = canManageGuestLink
    ? await (await createClient()).rpc("sakaba_get_guest_gathering_host", { p_quest_id: q.id })
    : null;
  const guestLink = !guestLinkResult?.error && guestLinkResult?.data
    ? guestLinkResult.data as GuestGatheringHostData
    : null;

  // 集まりの日程調整（詳しい内容を読める人だけ）。読めなかったときは、空ではなく「読み込めなかった」と出す
  const scheduleResult = q.category === "gathering" && canReadDetails
    ? await (await createClient()).rpc("sakaba_get_gathering_schedule", { p_quest_id: q.id })
    : null;
  const schedule = scheduleResult && !scheduleResult.error && scheduleResult.data
    ? scheduleResult.data as GatheringScheduleData
    : null;
  const decidedOption = schedule?.options.find((option) => option.id === schedule.decided_option_id) ?? null;

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
              {decidedOption && (
                <>
                  <dt className="c-label">かいさい日</dt>
                  <dd>{formatScheduleLong(decidedOption.starts_at)}</dd>
                </>
              )}
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

            <LiveQuestApplication quest={q} currentUserId={currentUserId} />
            {q.creator_id === currentUserId && (q.status === "open" || q.status === "in_progress") &&
              <LiveQuestOwnerActions questId={q.id} questTerm={questTerm} applicantCount={q.applicant_count} gathering={q.members_only} />}
          </>
        ) : (
          <div className="c-card mt-6 border-dashed px-4 py-5 text-sm leading-relaxed">
            この{questTerm}の詳しい内容は、有料会員だけが閲覧できます。
          </div>
        )}
      </Window>

      {schedule && <GatheringSchedule mode="member" questId={q.id} initial={schedule} open={q.status === "open"} />}
      {scheduleResult?.error && (
        <Window title="日程調整">
          <p role="alert" className="text-sm text-[#c62828]">日程調整を読み込めませんでした。画面を読み直してください。</p>
        </Window>
      )}

      {guestLink && <GuestGatheringHost questId={q.id} initial={guestLink} />}

      {creator && (
        <Window title="出した人">
          <MemberRow profile={creator} />
        </Window>
      )}
    </div>
  );
}
