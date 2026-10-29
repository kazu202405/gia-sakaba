import { StoreLink } from "@/components/guild/store-link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink, Window } from "@/components/guild/cards";
import { JobAvatar } from "@/components/guild/job-avatar";
import { LiveIntroRequestButton } from "@/components/guild/live-intro-request-button";
import { LiveMemberIntroductions } from "@/components/guild/live-member-introductions";
import { InvitePathWindow } from "@/components/guild/invite-path";
import { BusinessCardView } from "@/components/guild/business-card-view";
import { MemberShareUrl } from "@/components/guild/member-share-url";
import { LiveMemberProfileDraft } from "@/components/guild/live-member-profile-draft";
import { ContactItemsView } from "@/components/guild/contact-items-view";
import type { BusinessCard } from "@/lib/guild/business-card";
import { parseContactItemsMap } from "@/lib/guild/contact-items";
import { signBusinessCards, signWorkPhotos } from "@/lib/guild/business-card-server";
import { industryLabel, storeHasField } from "@/lib/guild/store-profile";
import { StoreProfileView } from "@/components/guild/store-profile-view";
import type { InvitePath } from "@/lib/guild/invite-path";
import { createClient } from "@/lib/supabase/server";
import { PersonalProfileWindow } from "@/components/guild/personal-profile-window";
import { groupLabelFor, positionLabel } from "@/lib/guild/labels";
import type { Wording } from "@/lib/guild/store-words";
import { getAuthenticatedUserId, getGuildContext, getMemberProfileDraft, getMyPlanUsage, listGuildIntroRequests, listGuildMemberIntroductions, listGuildMembers } from "@/lib/guild/server-data";
import type { Profile, VisibleGroup } from "@/lib/guild/types";
import { currentStore } from "@/lib/guild/current-store";
import { Go } from "@/components/guild/go-mark";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await currentStore()).w("member.metaTitle") };
}

export default async function MemberStatusPage({ params }: Props) {
  const store = await currentStore();
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
  // ステータスの下書き（0130）：オーナー・マスターが、自分以外のメンバーに書いて届ける
  const canDraftStatus = !isMe && (context.membership.role === "owner" || context.membership.role === "master");
  const memberDraft = canDraftStatus ? await getMemberProfileDraft(p.id) : null;
  // 入会のつながり（あなた → … → この方）
  const supabase = await createClient();
  const invitePathResult = await supabase.rpc("sakaba_get_invite_path", { p_target_id: p.id, p_guild_slug: store.slug });
  const invitePath = invitePathResult.error ? null : invitePathResult.data as InvitePath;
  // 名刺（同じギルドの会員だけが見られる）
  const { data: cardData } = await supabase.rpc("sakaba_get_business_card", { p_user_id: p.id, p_guild_slug: store.slug });
  const card = cardData as BusinessCard | null;
  const cardUrls = await signBusinessCards(supabase, [card?.front, card?.back]);
  // 伝えたいことの写真（その店の会員だけが署名URLを作れる）
  const workPhotoUrls = await signWorkPhotos(supabase, p.work_photos ?? []);
  const has = (field: Parameters<typeof storeHasField>[1]) => storeHasField(store.config, field);
  // 連絡先（見せてよい分だけDBから来る。「つながった人だけ」でまだのものは種類だけ）
  const { data: contactData, error: contactError } = await supabase.rpc("sakaba_get_contact_items", { p_user_ids: [p.id], p_guild_slug: store.slug });
  const contactItems = parseContactItemsMap(contactData)[p.id] ?? [];
  // 相手の共有URL（あれば）と、入会のつながり（招待した人・された人）。読めなかったときは、どちらも出さない
  const linkResult = isMe ? null : await supabase.rpc("sakaba_get_member_link_info", { p_target_id: p.id, p_guild_slug: store.slug });
  const linkInfo = linkResult && !linkResult.error ? linkResult.data as { share_token: string | null; invite_connected: boolean } : null;
  // 自分の画面でも、他の人に見える「紹介のためのURL」を同じ形で出す（人からの見え方の確認）。共有オフなら「まだ作っていません」と同じ表示
  const myShareResult = isMe ? await supabase.rpc("sakaba_get_my_share", { p_guild_slug: store.slug }) : null;
  const myShare = myShareResult && !myShareResult.error ? myShareResult.data as { token: string; enabled: boolean } : null;
  const shareToken = isMe ? (myShare?.enabled ? myShare.token : null) : linkInfo?.share_token ?? null;
  const showShareUrl = isMe ? Boolean(myShare) : Boolean(linkInfo);
  const memberTerm = context.guild.terms.member;

  return (
    <div className="space-y-11">
      <BackLink href={store.path("/members")} label={store.w("members.title", { member: memberTerm })} />

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
                  <dt className="c-label text-base">{store.w("member.company")}</dt>
                  <dd className="break-words">
                    {p.company_name}（{positionLabel[p.position]}）
                  </dd>
                </>
              )}
              {has("job") && <><dt className="c-label text-base">{store.w("member.job")}</dt><dd>{p.job}</dd></>}
              {(has("industry") || has("industry_choice")) && <><dt className="c-label text-base">{store.w("member.industry")}</dt><dd>{has("industry_choice") ? industryLabel(p.industry) : p.industry}</dd></>}
              {has("region") && <><dt className="c-label text-base">{store.w("member.region")}</dt><dd>{p.region}</dd></>}
            </dl>
            {contactError
              ? <p className="c-muted mt-4 text-xs">連絡先を読み込めませんでした。</p>
              : <ContactItemsView items={contactItems} className="c-dashed-top mt-4 pt-4" />}
            <StoreProfileView profile={p} />
            {has("want_to_solve") && p.want_to_solve && (
              <p className="c-card mt-4 px-3 py-2 text-sm leading-relaxed break-words">
                <span className="c-label mr-2 text-base">{store.w("member.wantToSolve")}</span>
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
        {!isMe && linkInfo?.invite_connected && <p className="mt-5"><span className="c-chip">入会のつながりで、つながっています</span></p>}
        {!isMe && <div className="mt-5"><LiveIntroRequestButton target={p} existing={requests.find((request) => request.requester_id === currentUserId && request.target_id === p.id && ["requested", "reviewing", "proposed", "accepted", "introduced"].includes(request.status)) ?? null} quota={usage ? { plan: usage.plan, slot: usage.intro } : null} inviteConnected={Boolean(linkInfo?.invite_connected)} /></div>}
        {showShareUrl && <MemberShareUrl token={shareToken} isMe={isMe} />}
      </Window>

      <PersonalProfileWindow profile={p} />

      <ProfileWindow
        profile={p}
        isMe={isMe}
        sections={[
          ...(has("bio") ? [{ group: "work" as const, label: store.w("member.bioLabel"), value: p.bio }] : []),
          ...(has("values_text") ? [{ group: "values" as const, label: store.w("member.valuesLabel"), value: p.values_text }] : []),
          ...(has("looking_for") ? [{ group: "connect" as const, label: store.w("member.connectLabel"), value: p.looking_for }] : []),
        ]}
        workPhotos={has("work_photos") ? (p.work_photos ?? []).flatMap((path) => workPhotoUrls[path] ? [workPhotoUrls[path]] : []) : []}
        w={store.w}
      />

      {memberDraft && (memberDraft.ok
        ? <LiveMemberProfileDraft key={memberDraft.draft?.id ?? "none"} memberId={p.id} memberName={p.display_name} initial={memberDraft.draft} />
        : <Window title={store.w("status.draftTitle")}><p className="text-sm">下書きを読み込めませんでした。時間をおいて開き直してください。</p></Window>)}

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
  workPhotos,
  w,
}: {
  profile: Profile;
  isMe: boolean;
  w: Wording;
  /** 伝えたいことに添える写真の署名URL（出さない店では空） */
  workPhotos: string[];
  sections: { group: VisibleGroup; label: string; value: string }[];
}) {
  const shown = isMe ? sections : sections.filter((section) => !profile.visible_groups.includes(section.group) || section.value.trim());
  return (
    <Window title={w("member.profileWindow")}>
      {shown.length === 0 ? (
        <p className="c-muted text-sm">まだ書かれていません。</p>
      ) : (
        <div className="divide-y-2 divide-dashed divide-guild-ink/15">
          {shown.map((section) => (
            <section key={section.group} className="py-5 first:pt-0 last:pb-0">
              <h2 className="c-label text-base tracking-[0.12em]"><Go />{groupLabelFor(w)[section.group].title}</h2>
              {profile.visible_groups.includes(section.group) && !section.value.trim() ? (
                <p className="c-muted mt-1.5 text-sm">
                  まだ入力されていません。
                  <StoreLink to="/me/status" className="ml-2 underline underline-offset-4">{w("status.editButton")}</StoreLink>
                </p>
              ) : profile.visible_groups.includes(section.group) ? (
                <>
                  <p className="c-muted mt-1 text-xs">{section.label}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed break-words whitespace-pre-line">{section.value}</p>
                  {section.group === "work" && workPhotos.length > 0 && <ul className="mt-3 grid grid-cols-3 gap-2">
                    {workPhotos.map((url) => <li key={url} className="c-card aspect-square overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 期限つきの署名URLの画像なので next/image を通さない */}
                      <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="伝えたいことの写真" className="h-full w-full object-cover" /></a>
                    </li>)}
                  </ul>}
                </>
              ) : (
                <p className="c-muted mt-1.5 text-sm">{w("member.hidden")}</p>
              )}
            </section>
          ))}
        </div>
      )}
    </Window>
  );
}
