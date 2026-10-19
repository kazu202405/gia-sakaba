import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle, Window } from "@/components/guild/cards";
import { GuildSceneArt } from "@/components/guild/guild-scene-art";
import { SurveyForm } from "@/components/guild/survey-form";
import { SURVEY_COPY, surveyInviteUrlFromEnv } from "@/lib/guild/survey";

// ログインなしで開く事前アンケート。検索には出さない（五島さんが直接URLを渡した人だけが開く）。
export const metadata: Metadata = {
  title: "GIAの酒場 事前アンケート",
  robots: { index: false, follow: false },
};

// 環境変数を実行時に読むため、ビルド時に固めない
export const dynamic = "force-dynamic";

export default function SurveyPage() {
  const inviteUrl = surveyInviteUrlFromEnv();
  return (
    <main className="guild-theme guild-scene min-h-screen px-4 py-8 pb-16 sm:px-6 sm:py-12">
      <GuildSceneArt art="tavern" dim />
      <div className="relative z-10 mx-auto max-w-3xl space-y-9">
        <header className="flex items-center justify-between gap-4 border-2 border-[#efe6cf]/70 px-4 py-3 text-sm">
          <Link href="/" className="guild-px tracking-widest hover:underline">GIAの酒場</Link>
        </header>
        <PageTitle title={SURVEY_COPY.pageTitle} lead={SURVEY_COPY.pageLead} />
        <Window title={SURVEY_COPY.conceptTitle}>
          <ul className="space-y-2 text-sm leading-relaxed">
            {SURVEY_COPY.concept.map((line) => (
              <li key={line} className="flex gap-2"><span aria-hidden>◆</span><span>{line}</span></li>
            ))}
          </ul>
        </Window>
        <SurveyForm inviteUrl={inviteUrl} />
      </div>
    </main>
  );
}
