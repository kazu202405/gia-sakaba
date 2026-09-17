import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink, QuestCard, Window } from "@/components/guild/cards";
import { IntroRequestButton } from "@/components/guild/intro-request-dialog";
import { JobAvatar } from "@/components/guild/job-avatar";
import { AchievementsView } from "@/components/guild/membership-parts";
import { groupLabel } from "@/lib/guild/labels";
import { achievementCounts, badges, canPostMembersOnly } from "@/lib/guild/membership";
import {
  ME_ID,
  getProfile,
  guild,
  introRequests,
  parties,
  questApplications,
  quests,
} from "@/lib/guild/mock-data";
import type { Profile, VisibleGroup } from "@/lib/guild/types";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: getProfile(id)?.display_name ?? guild.terms.member };
}

export default async function MemberStatusPage({ params }: Props) {
  const { id } = await params;
  const p = getProfile(id);
  if (!p) notFound();

  const isMe = p.id === ME_ID;
  const theirQuests = quests.filter((q) => q.creator_id === p.id && q.status !== "completed");
  const achievementData = { profile: p, quests, applications: questApplications, intros: introRequests, parties };

  return (
    <div className="space-y-11">
      <BackLink href="/guild/members" label={`${guild.terms.member} めいかん`} />

      <Window title={guild.terms.status}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <JobAvatar icon={p.job_icon} photoUrl={p.photo_url} name={p.job} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl tracking-[0.15em]">{p.display_name}</h1>
            <p className="mt-2 text-[15px] break-words">{p.headline}</p>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="c-label">しょくぎょう</dt>
              <dd>{p.job}</dd>
              <dt className="c-label">ぎょうしゅ</dt>
              <dd>{p.industry}</dd>
              <dt className="c-label">ちいき</dt>
              <dd>{p.region}</dd>
              {p.role === "owner" && (
                <>
                  <dt className="c-label">やくわり</dt>
                  <dd>{guild.terms.master}</dd>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* 人にレベル（段）は付けない。積み上がる数と、集めたバッジだけ */}
        <div className="c-dashed-top mt-6 pt-5">
          <AchievementsView
            counts={achievementCounts(achievementData)}
            badges={badges(achievementData)}
            mine={false}
            isMaster={canPostMembersOnly(p.role)}
            selfPreview={isMe}
          />
        </div>

        <div className="mt-6">
          {isMe ? (
            <Link href="/guild/me/status" className="c-button-sub h-12 w-full sm:w-auto">
              {guild.terms.status}を なおす
            </Link>
          ) : (
            <IntroRequestButton target={p} />
          )}
          {!isMe && (
            <p className="c-muted mt-2 text-xs leading-relaxed">れんらく先は、しょうかいが承諾されたときにだけ見えるようになります。</p>
          )}
        </div>
      </Window>

      <div className="grid gap-11 md:grid-cols-3">
        <GroupBlock profile={p} group="work">
          <Item label="しごとの内容" value={p.bio} />
          <Item label="できること" value={p.can_help_with} />
          {p.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {p.keywords.map((k) => (
                <span key={k} className="c-chip">
                  {k}
                </span>
              ))}
            </div>
          )}
        </GroupBlock>
        <GroupBlock profile={p} group="values">
          <Item label="つよみ" value={p.strengths} />
          <Item label="だいじにしていること" value={p.values_text} />
          <Item label="これから" value={p.vision} />
        </GroupBlock>
        <GroupBlock profile={p} group="connect">
          <Item label="さがしているもの" value={p.looking_for} />
          <Item label="であいたい人" value={p.want_to_meet} />
        </GroupBlock>
      </div>

      {theirQuests.length > 0 && (
        <Window title={`${p.display_name}さんの ${guild.terms.quest}`}>
          <div className="grid gap-4 md:grid-cols-2">
            {theirQuests.map((q) => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        </Window>
      )}
    </div>
  );
}

function GroupBlock({ profile, group, children }: { profile: Profile; group: VisibleGroup; children: React.ReactNode }) {
  const visible = profile.visible_groups.includes(group);
  return (
    <Window title={groupLabel[group].title}>
      {visible ? <div className="space-y-3">{children}</div> : <p className="c-muted text-sm">※ ひこうかいに しています</p>}
    </Window>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="c-label text-xs">{label}</p>
      <p className="mt-0.5 text-[15px] leading-relaxed break-words">{value}</p>
    </div>
  );
}
