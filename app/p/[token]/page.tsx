import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCardView } from "@/components/guild/business-card-view";
import { Window } from "@/components/guild/cards";
import { JobAvatar } from "@/components/guild/job-avatar";
import { signBusinessCards } from "@/lib/guild/business-card-server";
import { formatDate, positionLabel } from "@/lib/guild/labels";
import { isShareToken, type SharedProfile } from "@/lib/guild/shared-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NightPageFrame } from "@/components/guild/night-page-frame";

// 会員以外にも見せるステータス（本人が作った共有URL）。仕様：contexts/projects/gia/sakaba_share_url.md
// 出す項目の判断はDBの関数（sakaba_get_shared_profile）が行う。ここは渡された分を並べるだけ。

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "ステータス | GIAの酒場" },
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

// 名刺の画像は、開いたその場で作る短い期限のURLで出す（10分）
const SHARED_CARD_URL_TTL = 10 * 60;

export default async function SharedProfilePage({ params }: Props) {
  const { token } = await params;
  if (!isShareToken(token)) notFound();
  const { data, error } = await (await createClient()).rpc("sakaba_get_shared_profile", { p_token: token });
  // ない・停止中・本人が酒場を抜けている、のどれも同じ「見つかりません」にする
  if (error || !data) notFound();
  const p = data as SharedProfile;

  const card = p.business_card ? { front: p.business_card.front, back: p.business_card.back, agreed_at: null } : null;
  const cardUrls = card ? await signBusinessCards(createAdminClient(), [card.front, card.back], SHARED_CARD_URL_TTL) : {};

  const sections = [
    { label: "仕事内容・できること", value: p.bio },
    { label: "だいじにしていること・これから", value: p.values_text },
    { label: "さがしているもの・であいたい人", value: p.looking_for },
  ].filter((section) => section.value?.trim());
  const keywords = (p.keywords ?? []).filter((word) => word.trim());
  const personal = [
    { label: "しゅみ・すきなこと", value: p.hobbies },
    { label: "これまでの あゆみ", value: p.life_story },
  ].filter((item) => item.value?.trim());
  const introductions = p.introductions ?? [];

  return <NightPageFrame>
    <div className="mx-auto max-w-3xl space-y-9">
      <header className="flex items-center justify-between gap-4 text-sm">
        <Link href="/" className="guild-px tracking-widest hover:underline">GIAの酒場</Link>
        <span className="c-chip">本人が共有したページです</span>
      </header>

      <Window title="ステータス">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <JobAvatar icon={p.job_icon} photoUrl={p.photo_url} name={p.job || p.display_name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-3xl tracking-[0.15em]">{p.display_name}</h1>
            {p.headline && <p className="mt-2 break-words text-[15px]">{p.headline}</p>}
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              {p.company_name && <>
                <dt className="c-label text-base">かいしゃ</dt>
                <dd className="break-words">{p.company_name}{p.position ? `（${positionLabel[p.position]}）` : ""}</dd>
              </>}
              {p.job && <><dt className="c-label text-base">しょくぎょう</dt><dd className="break-words">{p.job}</dd></>}
              {p.industry && <><dt className="c-label text-base">ぎょうしゅ</dt><dd className="break-words">{p.industry}</dd></>}
              {p.region && <><dt className="c-label text-base">ちいき</dt><dd className="break-words">{p.region}</dd></>}
            </dl>
          </div>
        </div>
      </Window>

      {(sections.length > 0 || keywords.length > 0) && <Window title="プロフィール">
        <div className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
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
        <dl className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
          {personal.map((item) => <div key={item.label} className="py-4 first:pt-0 last:pb-0">
            <dt className="c-label text-base">{item.label}</dt>
            <dd className="mt-1 whitespace-pre-line break-words text-[15px] leading-relaxed">{item.value}</dd>
          </div>)}
        </dl>
      </Window>}

      {card && <BusinessCardView card={card} urls={cardUrls} isMe={false} footnote="押すと大きく開きます。" />}

      {introductions.length > 0 && <Window title="紹介状">
        <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
          {introductions.map((item, index) => <li key={index} className="py-4 first:pt-0 last:pb-0">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{item.body}</p>
            <p className="c-muted mt-2 text-xs">{item.author_name ? `${item.author_name}さん ・ ` : ""}{formatDate(item.created_at)}</p>
          </li>)}
        </ul>
      </Window>}

      <p className="c-muted text-xs leading-relaxed">このページは、ご本人が選んで共有した内容だけを表示しています。連絡先は含まれません。</p>
    </div>
  </NightPageFrame>;
}
