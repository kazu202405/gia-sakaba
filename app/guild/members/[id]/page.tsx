import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, Window } from "@/components/guild/cards";
import { JobAvatar } from "@/components/guild/job-avatar";
import { LiveIntroRequestButton } from "@/components/guild/live-intro-request-button";
import { LiveMemberIntroductions } from "@/components/guild/live-member-introductions";
import { InvitePathWindow } from "@/components/guild/invite-path";
import { BusinessCardView } from "@/components/guild/business-card-view";
import { ContactItemsView } from "@/components/guild/contact-items-view";
import type { BusinessCard } from "@/lib/guild/business-card";
import { parseContactItemsMap } from "@/lib/guild/contact-items";
import { signBusinessCards } from "@/lib/guild/business-card-server";
import type { InvitePath } from "@/lib/guild/invite-path";
import { createClient } from "@/lib/supabase/server";
import { PersonalProfileWindow } from "@/components/guild/personal-profile-window";
import { groupLabel, positionLabel } from "@/lib/guild/labels";
import { getAuthenticatedUserId, getGuildContext, getMyPlanUsage, listGuildIntroRequests, listGuildMemberIntroductions, listGuildMembers } from "@/lib/guild/server-data";
import type { Profile, VisibleGroup } from "@/lib/guild/types";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "ギルドメンバー" };

export default async function MemberStatusPage({ params }: Props) {
  const { id } = await params;
  const [context, members, currentUserId, requests, introductions, usage] = await Promise.all([
    getGuildContext(),
    listGuildMembers(),
    getAuthenticatedUserId(),
    listGuildIntroRequests(),
    listGuildMemberIntroductions(id),
    getMyPlanUsage(),
  ]);
  const p = members.find((member) => member.id === id);
  if (!p) notFound();

  const isMe = p.id === currentUserId;
  // 入会のつながり（あなた → … → この方）
  const supabase = await createClient();
  const invitePathResult = await supabase.rpc("sakaba_get_invite_path", { p_target_id: p.id });
  const invitePath = invitePathResult.error ? null : invitePathResult.data as InvitePath;
  // 名刺（同じギルドの会員だけが見られる）
  const { data: cardData } = await supabase.rpc("sakaba_get_business_card", { p_user_id: p.id });
  const card = cardData as BusinessCard | null;
  const cardUrls = await signBusinessCards(supabase, [card?.front, card?.back]);
  // 連絡先（見せてよい分だけDBから来る。「つながった人だけ」でまだのものは種類だけ）
  const { data: contactData, error: contactError } = await supabase.rpc("sakaba_get_contact_items", { p_user_ids: [p.id] });
  const contactItems = parseContactItemsMap(contactData)[p.id] ?? [];
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
            </dl>
            {contactError
              ? <p className="c-muted mt-4 text-xs">連絡先を読み込めませんでした。</p>
              : <ContactItemsView items={contactItems} className="c-dashed-top mt-4 pt-4" />}
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
            : "連絡先は、本人が選んだ相手にだけ表示しています。🔒 のものは、つながり申請を承諾し合うと見えるようになります。"}
        </p>
        {!isMe && <div className="mt-5"><LiveIntroRequestButton target={p} existing={requests.find((request) => request.requester_id === currentUserId && request.target_id === p.id && ["requested", "reviewing", "proposed", "accepted", "introduced"].includes(request.status)) ?? null} quota={usage ? { plan: usage.plan, slot: usage.intro } : null} /></div>}
      </Window>

      <PersonalProfileWindow profile={p} />

      <ProfileWindow
        profile={p}
        isMe={isMe}
        sections={[
          { group: "work", label: "仕事内容・できること", value: p.bio },
          { group: "values", label: "だいじにしていること・これから", value: p.values_text },
          { group: "connect", label: "さがしているもの・であいたい人", value: p.looking_for },
        ]}
      />

      <BusinessCardView card={card} urls={cardUrls} isMe={isMe} />

      <InvitePathWindow path={invitePath} isMe={isMe} failed={Boolean(invitePathResult.error)} />

      <LiveMemberIntroductions targetId={p.id} targetName={p.display_name} currentUserId={currentUserId} initial={introductions} />

    </div>
  );
}

/**
 * しごと・おもい・つながりを1つの窓にまとめる。
 * ほかの人が見るとき：書かれていない項目は出さない（空の見出しが並ぶと「何も書いていない人」と目立つため）。
 * 本人が見るとき：空の項目も出して「まだ入力されていません」とステータスをなおす画面へ案内する。
 * 非公開の項目は、その見出しだけ出して「ひこうかい」と書く。1つも出すものがなければ、その旨を1行だけ出す。
 */
function ProfileWindow({
  profile,
  isMe,
  sections,
}: {
  profile: Profile;
  isMe: boolean;
  sections: { group: VisibleGroup; label: string; value: string }[];
}) {
  const shown = isMe ? sections : sections.filter((section) => !profile.visible_groups.includes(section.group) || section.value.trim());
  return (
    <Window title="プロフィール">
      {shown.length === 0 ? (
        <p className="c-muted text-sm">まだ書かれていません。</p>
      ) : (
        <div className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
          {shown.map((section) => (
            <section key={section.group} className="py-5 first:pt-0 last:pb-0">
              <h2 className="c-label text-sm tracking-[0.12em]">▶ {groupLabel[section.group].title}</h2>
              {profile.visible_groups.includes(section.group) && !section.value.trim() ? (
                <p className="c-muted mt-1.5 text-sm">
                  まだ入力されていません。
                  <Link href="/guild/me/status" className="ml-2 underline underline-offset-4">▶ ステータスをなおす</Link>
                </p>
              ) : profile.visible_groups.includes(section.group) ? (
                <>
                  <p className="c-muted mt-1 text-xs">{section.label}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed break-words whitespace-pre-line">{section.value}</p>
                </>
              ) : (
                <p className="c-muted mt-1.5 text-sm">※ ひこうかいに しています</p>
              )}
            </section>
          ))}
        </div>
      )}
    </Window>
  );
}
