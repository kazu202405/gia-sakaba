// メンバー詳細ページ（Phase 2：実DB化 + 相互開示ゲート）。
// applicants から id でフェッチし、ストーリー / 人柄 / つながりたい人 / サービス / 連絡先 を表示。
//
// 認証 / 公開ガード:
//   ログイン必須（未ログインは /login）。tier は問わない＝無料会員も閲覧できる。
//   基本情報（写真/名前/肩書/ジャンル/拠点/サービス/紹介チェーン）は常時公開。
//   ストーリー / 人柄 / 連絡先は「相互開示（ギブ＆シー）」で制御:
//     閲覧者が自分の同じグループを書いていれば、相手のそのグループも読める。
//     有料会員(tier='paid')は相互開示の対象外で全解禁（lib/profile-disclosure.ts）。
//
// 自分のID の場合:
//   /mypage に redirect（自分のプロフィールは mypage に集約）。
//
// 紹介チェーン:
//   applicants.referrer_id を最大5段まで辿って構築。
//   ループ防止のため Set で訪問済み id を管理。
//
// mock 特有のフィールド（撤去）:
//   recommendations（グルメ） / endorsements（推薦コメント） /
//   industry（業種） / trust_score / context_tags
//   → applicants スキーマに無いため非表示。Phase 2 で必要なら別 migration で追加。

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Clock,
  GraduationCap,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  Pencil,
  Sparkles,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  computeUnlockedGroups,
  DISCLOSURE_GROUP_PROMPT,
} from "@/lib/profile-disclosure";
import { ReferralRequestButton } from "./_components/ReferralRequestButton";

interface ProfileRow {
  id: string;
  name: string;
  nickname: string | null;
  tier: string;
  plan: string | null;
  member_no: number | null;
  photo_url: string | null;
  role_title: string | null;
  job_title: string | null;
  headline: string | null;
  services_summary: string | null;
  genre: string | null;
  location: string | null;
  story_origin: string | null;
  story_turning_point: string | null;
  story_now: string | null;
  story_future: string | null;
  want_to_connect_with: string | null;
  status_message: string | null;
  favorites: string | null;
  current_hobby: string | null;
  school_days_self: string | null;
  personal_values: string | null;
  contact_line: string | null;
  contact_instagram: string | null;
  contact_website: string | null;
  referrer_id: string | null;
}

interface ChainEntry {
  id: string;
  displayName: string;
}

const PROFILE_SELECT =
  "id, name, nickname, tier, plan, member_no, photo_url, " +
  "role_title, job_title, headline, services_summary, genre, location, " +
  "story_origin, story_turning_point, story_now, story_future, " +
  "want_to_connect_with, status_message, " +
  "favorites, current_hobby, school_days_self, personal_values, " +
  "contact_line, contact_instagram, contact_website, referrer_id";

// 相互開示ゲート判定に使う「閲覧者自身」の列（story / personality / contact + tier + plan）。
// plan は 'terakoya'（キャンパス月額11,000円）を全解禁扱いにするために必要。
const VIEWER_DISCLOSURE_SELECT =
  "tier, plan, " +
  "story_origin, story_turning_point, story_now, story_future, " +
  "favorites, current_hobby, school_days_self, personal_values, " +
  "contact_line, contact_instagram, contact_website";

function rowToProfile(raw: unknown): ProfileRow | null {
  if (!raw) return null;
  const row = raw as Record<string, unknown>;
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    nickname: (row.nickname as string | null) ?? null,
    tier: (row.tier as string) ?? "tentative",
    plan: (row.plan as string | null) ?? null,
    member_no: (row.member_no as number | null) ?? null,
    photo_url: (row.photo_url as string | null) ?? null,
    role_title: (row.role_title as string | null) ?? null,
    job_title: (row.job_title as string | null) ?? null,
    headline: (row.headline as string | null) ?? null,
    services_summary: (row.services_summary as string | null) ?? null,
    genre: (row.genre as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    story_origin: (row.story_origin as string | null) ?? null,
    story_turning_point: (row.story_turning_point as string | null) ?? null,
    story_now: (row.story_now as string | null) ?? null,
    story_future: (row.story_future as string | null) ?? null,
    want_to_connect_with: (row.want_to_connect_with as string | null) ?? null,
    status_message: (row.status_message as string | null) ?? null,
    favorites: (row.favorites as string | null) ?? null,
    current_hobby: (row.current_hobby as string | null) ?? null,
    school_days_self: (row.school_days_self as string | null) ?? null,
    personal_values: (row.personal_values as string | null) ?? null,
    contact_line: (row.contact_line as string | null) ?? null,
    contact_instagram: (row.contact_instagram as string | null) ?? null,
    contact_website: (row.contact_website as string | null) ?? null,
    referrer_id: (row.referrer_id as string | null) ?? null,
  };
}

async function buildReferrerChain(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  startReferrerId: string | null,
): Promise<ChainEntry[]> {
  if (!startReferrerId) return [];
  const chain: ChainEntry[] = [];
  const seen = new Set<string>();
  let currentId: string | null = startReferrerId;
  // 最大5段（root より深い循環参照対策＋表示の見やすさ）
  for (let i = 0; i < 5; i++) {
    if (!currentId || seen.has(currentId)) break;
    seen.add(currentId);
    const { data, error } = await supabase
      .from("member_profiles")
      .select("id, name, nickname, referrer_id")
      .eq("id", currentId)
      .single();
    if (error || !data) break;
    const row = data as Record<string, unknown>;
    const name = (row.name as string) ?? "";
    const nickname = (row.nickname as string | null) ?? null;
    chain.unshift({
      id: row.id as string,
      displayName: nickname?.trim() || name || "—",
    });
    currentId = (row.referrer_id as string | null) ?? null;
  }
  return chain;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 認証：未ログインは /login。tier は問わない（無料会員も閲覧可）。
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const userId = user.id;

  // 自分のIDが渡された場合は /mypage に集約
  if (id === userId) {
    redirect("/members/app/mypage");
  }

  // 閲覧対象プロフィール（member_profiles ビュー経由＝会員間読取り可・機密除外）と、
  // 閲覧者自身の開示状況（自分の行は applicants の self_read で取得）を並列取得。
  const [targetRes, viewerRes] = await Promise.all([
    supabase
      .from("member_profiles")
      .select(PROFILE_SELECT)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("applicants")
      .select(VIEWER_DISCLOSURE_SELECT)
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (targetRes.error || !targetRes.data) {
    return notFound();
  }

  const profile = rowToProfile(targetRes.data);
  if (!profile) return notFound();

  // 相互開示ゲート：閲覧者が自分の同グループを書いていれば、相手のそのグループも見える。
  const viewerRow = (viewerRes.data as Record<string, unknown> | null) ?? null;
  const viewerTier = (viewerRow?.tier as string | null) ?? "tentative";
  const viewerPlan = (viewerRow?.plan as string | null) ?? null;
  const unlocked = computeUnlockedGroups(viewerRow, viewerTier, viewerPlan);
  // 紹介依頼は有料会員の特典。旧サロン(tier='paid')に加えテラこや(plan='terakoya')も対象。
  // 無料はボタン→/upgrade へ誘導。
  const viewerIsPaid = viewerTier === "paid" || viewerPlan === "terakoya";

  const chain = await buildReferrerChain(supabase, profile.referrer_id);

  const displayName = profile.nickname?.trim() || profile.name || "—";
  const subInfo = [profile.role_title, profile.job_title]
    .filter((s) => s && s.trim().length > 0)
    .join(" / ");
  const referralTargetTitle =
    profile.role_title?.trim() ||
    profile.job_title?.trim() ||
    undefined;
  // plan で本会員(pro)/サロン会員(salon)を出し分け。未課金はバッジなし。
  const planBadge =
    profile.plan === "pro"
      ? "本会員"
      : profile.tier === "paid"
        ? "一般会員"
        : null;

  // ストーリー（4要素のうち入力済みのものだけ表示）
  const storyItems = [
    { label: "きっかけ", text: profile.story_origin, icon: Briefcase },
    { label: "転機", text: profile.story_turning_point, icon: Zap },
    { label: "今", text: profile.story_now, icon: Clock },
    { label: "これから", text: profile.story_future, icon: Sparkles },
  ].filter((s): s is { label: string; text: string; icon: typeof Briefcase } =>
    !!s.text && s.text.trim().length > 0,
  );

  // 人柄（入力済みのものだけ表示）
  const personalityItems = [
    { label: "好きなもの", text: profile.favorites, icon: Heart },
    { label: "最近ハマっていること", text: profile.current_hobby, icon: Sparkles },
    { label: "学生時代の自分", text: profile.school_days_self, icon: GraduationCap },
    { label: "大切にしていること", text: profile.personal_values, icon: Sparkles },
  ].filter((s): s is { label: string; text: string; icon: typeof Heart } =>
    !!s.text && s.text.trim().length > 0,
  );

  // 連絡先（入力済みのものだけ表示）
  const contactItems = [
    profile.contact_line && { label: "LINE", value: profile.contact_line },
    profile.contact_instagram && {
      label: "Instagram",
      value: profile.contact_instagram,
    },
    profile.contact_website && {
      label: "Webサイト",
      value: profile.contact_website,
      isUrl: true,
    },
  ].filter(
    (c): c is { label: string; value: string; isUrl?: boolean } => !!c,
  );

  // 相互開示ゲート用：相手がそのグループに「中身を持っているか」。
  // 中身があるのにロックされている時だけ、誘導カードを出す（中身ゼロなら何も出さない）。
  const targetHasStory =
    storyItems.length > 0 ||
    !!(profile.want_to_connect_with && profile.want_to_connect_with.trim().length > 0);
  const targetHasPersonality = personalityItems.length > 0;
  const targetHasContact = contactItems.length > 0;

  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      {/* 戻るリンク */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-6">
        <Link
          href="/members/app/members"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[var(--gia-navy)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          メンバー一覧へ戻る
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-6 pb-16 space-y-10">
        {/* ─── ヘッダーカード ─── */}
        <article className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04),0_8px_24px_-12px_rgba(15,31,51,0.06)] overflow-hidden">
          <div className="h-px bg-gradient-to-r from-[var(--gia-teal)]/0 via-[var(--gia-teal)]/40 to-[var(--gia-teal)]/0" />
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-4 sm:gap-5">
              {/* 写真：photo_url があれば実写、無ければイニシャル円（profile-photos バケットは public 読み取り） */}
              {profile.photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.photo_url}
                  alt={`${displayName} のプロフィール写真`}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover bg-[var(--gia-teal)]/[0.04] border border-[var(--gia-teal)]/15 flex-shrink-0"
                />
              ) : (
                <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] font-bold text-2xl border border-[var(--gia-teal)]/15 flex-shrink-0">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1
                    className="text-[var(--gia-navy)] tracking-[0.02em]"
                    style={{
                      fontFamily: "'Noto Serif JP', serif",
                      fontSize: "clamp(22px, 3vw, 28px)",
                      fontWeight: 500,
                      lineHeight: 1.3,
                    }}
                  >
                    {displayName}
                  </h1>
                  {profile.member_no != null && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--gia-navy)]/[0.06] text-[var(--gia-navy)] border border-[var(--gia-navy)]/15 tracking-[0.03em]">
                      No.{profile.member_no}
                    </span>
                  )}
                  {planBadge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] border border-[var(--gia-teal)]/30 tracking-[0.03em]">
                      {planBadge}
                    </span>
                  )}
                </div>
                {profile.status_message && (
                  <p className="text-xs text-gray-500 italic font-[family-name:var(--font-mincho)] mb-2">
                    {profile.status_message}
                  </p>
                )}
                {subInfo && (
                  <p className="text-sm text-gray-600">{subInfo}</p>
                )}
                {/* ジャンル / 拠点 バッジ（入力済みのみ表示） */}
                {(profile.genre || profile.location) && (
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    {profile.genre && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--gia-navy)]/[0.04] text-[var(--gia-navy)]/80 border border-[var(--gia-navy)]/10">
                        <Tag className="w-3 h-3 text-[var(--gia-teal)]" />
                        {profile.genre}
                      </span>
                    )}
                    {profile.location && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--gia-navy)]/[0.04] text-[var(--gia-navy)]/80 border border-[var(--gia-navy)]/10">
                        <MapPin className="w-3 h-3 text-[var(--gia-teal)]" />
                        {profile.location}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {profile.headline && (
              <p className="mt-5 text-[15px] text-gray-700 leading-[1.95] border-l-2 border-[var(--gia-teal)]/40 pl-4 italic font-[family-name:var(--font-mincho)]">
                {profile.headline}
              </p>
            )}

            {/* 紹介してほしい CTA */}
            <div className="mt-6 pt-5 border-t border-[var(--gia-navy)]/6 flex flex-wrap items-center gap-3">
              <ReferralRequestButton
                targetName={displayName}
                targetTitle={referralTargetTitle}
                targetPhotoUrl={profile.photo_url}
                canRequest={viewerIsPaid}
              />
              <p className="text-xs text-gray-400 leading-[1.85]">
                {viewerIsPaid
                  ? "紹介依頼は主催者LINE経由でお送りいただけます。"
                  : "※紹介依頼は一般会員（¥990〜）からご利用いただけます。"}
              </p>
            </div>
          </div>
        </article>

        {/* ─── ストーリー / つながりたい人（相互開示：自分が書いたら相手のも読める） ─── */}
        {unlocked.story ? (
          <>
            {storyItems.length > 0 && (
              <section>
                <SectionHeader eyebrow="Story" title="ストーリー" />
                <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] p-6 sm:p-8">
                  <div className="relative pl-8 space-y-6">
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[var(--gia-teal)]/40 via-[var(--gia-teal)]/20 to-transparent" />
                    {storyItems.map((item) => (
                      <div key={item.label} className="relative">
                        <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-white border-2 border-[var(--gia-teal)]/40 flex items-center justify-center">
                          <item.icon className="w-3 h-3 text-[var(--gia-teal)]" />
                        </div>
                        <p className="text-[10px] font-bold text-[var(--gia-navy)]/70 mb-1 tracking-[0.18em] uppercase">
                          {item.label}
                        </p>
                        <p className="text-sm text-gray-700 leading-[1.95] whitespace-pre-wrap">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {profile.want_to_connect_with && (
              <section>
                <SectionHeader eyebrow="Connect" title="つながりたい人" />
                <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] p-6 sm:p-8">
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--gia-teal)]/[0.08] flex items-center justify-center">
                      <Users className="w-4 h-4 text-[var(--gia-teal)]" />
                    </div>
                    <p className="text-sm text-gray-700 leading-[1.95] whitespace-pre-wrap">
                      {profile.want_to_connect_with}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          targetHasStory && (
            <LockedSection
              eyebrow="Story"
              title="ストーリー"
              prompt={DISCLOSURE_GROUP_PROMPT.story}
              editHref="/members/app/mypage/edit?tab=story"
            />
          )
        )}

        {/* ─── 人柄（相互開示） ─── */}
        {unlocked.personality
          ? personalityItems.length > 0 && (
              <section>
                <SectionHeader
                  eyebrow="Personality"
                  title={`${displayName}さんについて`}
                />
                <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] p-6 sm:p-8 space-y-5">
                  {personalityItems.map((item) => (
                    <div key={item.label} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--gia-teal)]/[0.08] flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-[var(--gia-teal)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-[var(--gia-navy)]/70 mb-1 tracking-[0.18em] uppercase">
                          {item.label}
                        </p>
                        <p className="text-sm text-gray-700 leading-[1.95] whitespace-pre-wrap">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          : targetHasPersonality && (
              <LockedSection
                eyebrow="Personality"
                title={`${displayName}さんについて`}
                prompt={DISCLOSURE_GROUP_PROMPT.personality}
                editHref="/members/app/mypage/edit?tab=other"
              />
            )}

        {/* ─── サービス（常時公開） ─── */}
        {profile.services_summary && (
          <section>
            <SectionHeader eyebrow="Services" title="サービス" />
            <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] p-6 sm:p-8">
              <p className="text-sm text-gray-700 leading-[1.95] whitespace-pre-wrap">
                {profile.services_summary}
              </p>
            </div>
          </section>
        )}

        {/* ─── 連絡先(相互開示) ─── */}
        {unlocked.contact
          ? contactItems.length > 0 && (
              <section>
                <SectionHeader eyebrow="Contact" title="連絡先" />
                <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] p-6 sm:p-8 space-y-3">
                  {contactItems.map((c) => (
                    <div key={c.label} className="flex items-start gap-3">
                      <span className="text-[10px] font-bold text-[var(--gia-navy)]/70 tracking-[0.18em] uppercase w-20 flex-shrink-0 pt-0.5">
                        {c.label}
                      </span>
                      {c.isUrl ? (
                        <a
                          href={c.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--gia-teal)] underline break-all"
                        >
                          {c.value}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-700 break-all">
                          {c.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )
          : targetHasContact && (
              <LockedSection
                eyebrow="Contact"
                title="連絡先"
                prompt={DISCLOSURE_GROUP_PROMPT.contact}
                editHref="/members/app/mypage/edit?tab=other"
              />
            )}

        {/* ─── 紹介チェーン ─── */}
        <section>
          <SectionHeader eyebrow="Chain" title="紹介チェーン" />
          <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] p-6 sm:p-8">
            {chain.length === 0 ? (
              <p className="text-sm text-gray-500 leading-[1.95] font-[family-name:var(--font-mincho)]">
                紹介経由ではないメンバーです。
              </p>
            ) : (
              <ol className="space-y-0">
                {chain.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center pt-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--gia-teal)] border-2 border-[var(--gia-teal)]/30" />
                      <div className="w-0.5 h-7 bg-[var(--gia-teal)]/20" />
                    </div>
                    <Link
                      href={`/members/app/profile/${entry.id}`}
                      className="text-sm text-gray-600 hover:text-[var(--gia-teal)] transition-colors pt-0.5"
                    >
                      {entry.displayName}
                    </Link>
                  </li>
                ))}
                <li className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--gia-navy)] border-2 border-[var(--gia-navy)]/30" />
                  </div>
                  <span
                    className="text-sm font-medium text-[var(--gia-navy)] pt-0.5"
                    style={{ fontFamily: "'Noto Serif JP', serif" }}
                  >
                    {displayName}
                  </span>
                </li>
              </ol>
            )}
          </div>
        </section>

        {/* ─── 紹介依頼 LINE ガイド ─── */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 text-xs text-gray-400">
            <MessageCircle className="w-3.5 h-3.5" />
            紹介はすべて主催者LINEを通じて行われます
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── サブコンポーネント：セクション見出し ───────────────────────────

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.32em] text-[var(--gia-teal)] uppercase mb-1.5">
        {eyebrow}
      </p>
      <h2
        className="text-[var(--gia-navy)] tracking-[0.04em] font-medium"
        style={{
          fontFamily: "'Noto Serif JP', serif",
          fontSize: "clamp(17px, 2.2vw, 20px)",
        }}
      >
        {title}
      </h2>
    </div>
  );
}

// ─── サブコンポーネント：相互開示ロック時の誘導カード ───────────────
// 相手はこのグループに中身を持っているが、閲覧者がまだ自分の同グループを
// 書いていないため読めない状態。自分のプロフィール編集へ誘導する。
function LockedSection({
  eyebrow,
  title,
  prompt,
  editHref,
}: {
  eyebrow: string;
  title: string;
  prompt: string;
  /** 「自分のプロフィールを書く」の遷移先（埋めるべきタブを ?tab= で指定） */
  editHref: string;
}) {
  return (
    <section>
      <SectionHeader eyebrow={eyebrow} title={title} />
      <div className="bg-white rounded-2xl border border-dashed border-[var(--gia-navy)]/20 p-6 sm:p-8 text-center">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--gia-gold)]/10 mb-4">
          <Lock className="w-5 h-5 text-[var(--gia-gold)]" />
        </div>
        <p className="text-sm text-gray-600 leading-[1.95] mb-5 max-w-md mx-auto font-[family-name:var(--font-mincho)]">
          {prompt}
        </p>
        <Link
          href={editHref}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-[var(--gia-navy)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Pencil className="w-4 h-4" />
          自分のプロフィールを書く
        </Link>
      </div>
    </section>
  );
}
