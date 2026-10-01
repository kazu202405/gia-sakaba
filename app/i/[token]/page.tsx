import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MasterIntroductionResponse } from "@/components/guild/master-introduction-response";
import { PageTitle, Window } from "@/components/guild/cards";
import type { MasterIntroductionView } from "@/lib/guild/master-introductions";
import { createClient } from "@/lib/supabase/server";
import { NightPageFrame } from "@/components/guild/night-page-frame";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "ご紹介の打診 | GIAの酒場" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function MasterIntroductionPage({ params }: Props) {
  if (process.env.SAKABA_MASTER_INTRO_ENABLED !== "true") notFound();
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/i.test(token)) notFound();
  const supabase = await createClient();
  const [{ data: auth }, { data, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("sakaba_get_master_introduction", { p_token: token }),
  ]);
  if (error || !data) notFound();
  const introduction = data as MasterIntroductionView;

  return <NightPageFrame>
    <div className="mx-auto max-w-3xl space-y-9">
      <header className="flex items-center justify-between gap-4 text-sm">
        <Link href="/" className="guild-px tracking-widest hover:underline">GIAの酒場</Link>
        <span className="c-chip">専用URLを受け取った方へ</span>
      </header>
      <PageTitle title="ご紹介の打診" lead="酒場への入会案内ではありません。あなたが承諾するまで、相手に氏名や連絡先は表示されません。" />
      <Window title={`${introduction.recipient_name}さんへ`}>
        <p className="c-label text-xs">{introduction.administrator_name}さんから</p>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{introduction.reason}</p>
        <div className="c-dashed-top mt-5 pt-5">
          <p className="c-label text-xs">おつなぎしたい相手について</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{introduction.counterpart_preview}</p>
          <p className="c-muted mt-3 text-xs">双方が承諾したときに、相手の氏名と本人が選んだ連絡方法が表示されます。</p>
        </div>
      </Window>
      <MasterIntroductionResponse token={token} introduction={introduction} authenticated={Boolean(auth.user)} accountEmail={auth.user?.email ?? ""} />
    </div>
  </NightPageFrame>;
}
