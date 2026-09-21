import { notFound } from "next/navigation";
import { BackLink, Window } from "@/components/guild/cards";
import { JobAvatar } from "@/components/guild/job-avatar";
import { groupLabel, positionLabel } from "@/lib/guild/labels";
import { getAuthenticatedUserId, getGuildContext, listGuildMembers } from "@/lib/guild/server-data";
import type { Profile, VisibleGroup } from "@/lib/guild/types";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "ギルドメンバー" };

export default async function MemberStatusPage({ params }: Props) {
  const { id } = await params;
  const [context, members, currentUserId] = await Promise.all([
    getGuildContext(),
    listGuildMembers(),
    getAuthenticatedUserId(),
  ]);
  const p = members.find((member) => member.id === id);
  if (!p) notFound();

  const isMe = p.id === currentUserId;
  const memberTerm = context.guild.terms.member;

  return (
    <div className="space-y-11">
      <BackLink href="/guild/members" label={`${memberTerm} めいかん`} />

      <Window title={context.guild.terms.status}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <JobAvatar icon={p.job_icon} photoUrl={p.photo_url} name={p.job} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl tracking-[0.15em]">{p.display_name}</h1>
            {p.name_kana && <p className="c-muted mt-1 text-xs">{p.name_kana}</p>}
            <p className="mt-2 text-[15px] break-words">{p.headline}</p>
            {p.strengths && (
              <p className="c-card mt-3 px-3 py-2 text-sm leading-relaxed break-words">
                <span className="c-label mr-2 text-xs">つよみ</span>
                {p.strengths}
              </p>
            )}
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              {/* 会社名と役職は、本人が「出す」を選んだときだけ */}
              {p.show_company && (
                <>
                  <dt className="c-label">かいしゃ</dt>
                  <dd className="break-words">
                    {p.company_name}（{positionLabel[p.position]}）
                  </dd>
                </>
              )}
              <dt className="c-label">しょくぎょう</dt>
              <dd>{p.job}</dd>
              <dt className="c-label">ぎょうしゅ</dt>
              <dd>{p.industry}</dd>
              <dt className="c-label">ちいき</dt>
              <dd>{p.region}</dd>
              {p.email && <>
                <dt className="c-label">メール</dt>
                <dd className="min-w-0 break-all"><a href={`mailto:${encodeURIComponent(p.email)}`} className="underline underline-offset-2">{p.email}</a></dd>
              </>}
              {p.line_url && <>
                <dt className="c-label">LINE</dt>
                <dd className="min-w-0 break-all"><a href={p.line_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">LINEを開く ↗</a></dd>
              </>}
              {p.website_url && <>
                <dt className="c-label">ウェブサイト</dt>
                <dd className="min-w-0 break-all"><a href={p.website_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">サイトを開く ↗</a></dd>
              </>}
              {p.role === "owner" && (
                <>
                  <dt className="c-label">やくわり</dt>
                  <dd>{context.guild.terms.master}</dd>
                </>
              )}
            </dl>
            {p.want_to_solve && (
              <p className="c-card mt-4 px-3 py-2 text-sm leading-relaxed break-words">
                <span className="c-label mr-2 text-xs">いま 解決したいこと</span>
                {p.want_to_solve}
              </p>
            )}
          </div>
        </div>

        <p className="c-dashed-top c-muted mt-6 pt-5 text-xs leading-relaxed">
          {isMe
            ? "これは、ほかのメンバーから見えるあなたのプロフィールです。"
            : "連絡先は本人がメンバー向けに公開したものだけ表示しています。しょうかい機能は準備中です。"}
        </p>
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
          <Item label="だいじにしていること" value={p.values_text} />
          <Item label="これから" value={p.vision} />
          <Item label="とりくんでいる 社会かだい" value={p.social_issue} />
        </GroupBlock>
        <GroupBlock profile={p} group="connect">
          <Item label="さがしているもの" value={p.looking_for} />
          <Item label="であいたい人" value={p.want_to_meet} />
        </GroupBlock>
      </div>

    </div>
  );
}

function GroupBlock({
  profile,
  group,
  children,
}: {
  profile: Profile;
  group: VisibleGroup;
  children: React.ReactNode;
}) {
  const visible = profile.visible_groups.includes(group);
  return (
    <Window title={groupLabel[group].title}>
      {visible ? (
        <div className="space-y-3">{children}</div>
      ) : (
        <p className="c-muted text-sm">※ ひこうかいに しています</p>
      )}
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
