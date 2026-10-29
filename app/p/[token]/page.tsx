import { industryLabel } from "@/lib/guild/store-profile";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BusinessCardView } from "@/components/guild/business-card-view";
import { Window } from "@/components/guild/cards";
import { JobAvatar } from "@/components/guild/job-avatar";
import { signBusinessCards } from "@/lib/guild/business-card-server";
import { formatDate, positionLabel } from "@/lib/guild/labels";
import { isShareToken, type SharedProfile } from "@/lib/guild/shared-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { StorePageFrame } from "@/components/guild/night-page-frame";
import { guildPath } from "@/lib/guild/store-path";
import { makeWording } from "@/lib/guild/store-words";
import { storeOrDefault } from "@/lib/guild/stores";

// 会員以外にも見せるステータス（本人が作った共有URL）。仕様：contexts/projects/gia/sakaba_share_url.md
// 出す項目の判断はDBの関数（sakaba_get_shared_profile）が行う。ここは渡された分を並べるだけ。
// 見た目・言葉は、URLの持ち主の店（返り値の guild_slug）のものにする。

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

// 題名と本文で同じ問い合わせを2回しないよう、1回の表示の中で使い回す
const loadShared = cache(async (token: string): Promise<SharedProfile | null> => {
  if (!isShareToken(token)) return null;
  const { data, error } = await (await createClient()).rpc("sakaba_get_shared_profile", { p_token: token });
  return error || !data ? null : data as SharedProfile;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await loadShared((await params).token);
  const config = storeOrDefault(p?.guild_slug);
  return {
    title: { absolute: `${config.terms.status} | ${config.name}` },
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

// 名刺の画像は、開いたその場で作る短い期限のURLで出す（10分）
const SHARED_CARD_URL_TTL = 10 * 60;

export default async function SharedProfilePage({ params }: Props) {
  const p = await loadShared((await params).token);
  // ない・停止中・本人が酒場を抜けている、のどれも同じ「見つかりません」にする
  if (!p) notFound();
  const config = storeOrDefault(p.guild_slug);
  const w = makeWording(config.words);
  // 店の案内ページがある店はそこへ、無い店（GIAの酒場）はトップへ
  const homeHref = config.landing ? guildPath(config.slug) : "/";

  const card = p.business_card ? { front: p.business_card.front, back: p.business_card.back, agreed_at: null } : null;
  const cardUrls = card ? await signBusinessCards(createAdminClient(), [card.front, card.back], SHARED_CARD_URL_TTL) : {};

  const sections = [
    { label: w("member.bioLabel"), value: p.bio },
    { label: w("member.valuesLabel"), value: p.values_text },
    { label: w("member.connectLabel"), value: p.looking_for },
  ].filter((section) => section.value?.trim());
  const keywords = (p.keywords ?? []).filter((word) => word.trim());
  const personal = [
    { label: w("personal.hobbies"), value: p.hobbies },
    { label: w("personal.lifeStory"), value: p.life_story },
  ].filter((item) => item.value?.trim());
  const introductions = p.introductions ?? [];

  return <StorePageFrame config={config}>
    <div className="mx-auto max-w-3xl space-y-9">
      <header className="flex items-center justify-between gap-4 text-sm">
        <Link href={homeHref} className="guild-px tracking-widest hover:underline">{config.name}</Link>
        <span className="c-chip">本人が共有したページです</span>
      </header>

      <Window title={config.terms.status}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <JobAvatar icon={p.job_icon} photoUrl={p.photo_url} name={p.job || p.display_name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-3xl tracking-[0.15em]">{p.display_name}</h1>
            {p.headline && <p className="mt-2 break-words text-[15px]">{p.headline}</p>}
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              {p.company_name && <>
                <dt className="c-label text-base">{w("member.company")}</dt>
                <dd className="break-words">{p.company_name}{p.position ? `（${positionLabel[p.position]}）` : ""}</dd>
              </>}
              {p.job && <><dt className="c-label text-base">{w("member.job")}</dt><dd className="break-words">{p.job}</dd></>}
              {p.industry && <><dt className="c-label text-base">{w("member.industry")}</dt><dd className="break-words">{industryLabel(p.industry) || p.industry}</dd></>}
              {(p.work_areas ?? []).length > 0 && <><dt className="c-label text-base">対応エリア</dt><dd className="break-words">{(p.work_areas ?? []).join("・")}</dd></>}
              {(p.work_types ?? []).length > 0 && <><dt className="c-label text-base">得意な工事</dt><dd className="break-words">{(p.work_types ?? []).join("・")}</dd></>}
              {(p.has_construction_license || p.has_real_estate_license) && <><dt className="c-label text-base">許可・免許</dt><dd>{[p.has_construction_license ? "建設業許可" : "", p.has_real_estate_license ? "宅建免許" : ""].filter(Boolean).join("・")}</dd></>}
              {p.region && <><dt className="c-label text-base">{w("member.region")}</dt><dd className="break-words">{p.region}</dd></>}
            </dl>
          </div>
        </div>
      </Window>

      {(sections.length > 0 || keywords.length > 0) && <Window title={w("member.profileWindow")}>
        <div className="divide-y-2 divide-dashed divide-guild-ink/15">
          {sections.map((section) => <section key={section.label} className="py-5 first:pt-0 last:pb-0">
            <p className="c-label text-base tracking-[0.12em]">▶ {section.label}</p>
            <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-relaxed">{section.value}</p>
          </section>)}
          {keywords.length > 0 && <section className="py-5 first:pt-0 last:pb-0">
            <p className="c-label text-base tracking-[0.12em]">▶ キーワード</p>
            <ul className="mt-2 flex flex-wrap gap-2">{keywords.map((word) => <li key={word} className="c-chip">{word}</li>)}</ul>
          </section>}
        </div>
      </Window>}

      {personal.length > 0 && <Window title="人となり">
        <dl className="divide-y-2 divide-dashed divide-guild-ink/15">
          {personal.map((item) => <div key={item.label} className="py-4 first:pt-0 last:pb-0">
            <dt className="c-label text-base">{item.label}</dt>
            <dd className="mt-1 whitespace-pre-line break-words text-[15px] leading-relaxed">{item.value}</dd>
          </div>)}
        </dl>
      </Window>}

      {card && <BusinessCardView card={card} urls={cardUrls} isMe={false} footnote="押すと大きく開きます。" />}

      {introductions.length > 0 && <Window title="紹介状">
        <ul className="divide-y-2 divide-dashed divide-guild-ink/15">
          {introductions.map((item, index) => <li key={index} className="py-4 first:pt-0 last:pb-0">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{item.body}</p>
            <p className="c-muted mt-2 text-xs">{item.author_name ? `${item.author_name}さん ・ ` : ""}{formatDate(item.created_at)}</p>
          </li>)}
        </ul>
      </Window>}

      <p className="c-muted text-xs leading-relaxed">このページは、ご本人が選んで共有した内容だけを表示しています。連絡先は含まれません。</p>
    </div>
  </StorePageFrame>;
}
