import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuestGatheringForm } from "@/components/guild/guest-gathering-form";
import { PageTitle, Window } from "@/components/guild/cards";
import type { GuestGathering } from "@/lib/guild/guest-gathering";
import { createClient } from "@/lib/supabase/server";
import "@/components/guild/guild-theme.css";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "集まりへの招待 | GIAの酒場" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function GuestGatheringPage({ params }: Props) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/i.test(token)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc("sakaba_get_guest_gathering", { p_token: token });
  if (error || !data) notFound();
  const event = data as GuestGathering;

  return <main className="guild-theme min-h-screen px-4 py-8 pb-16 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-3xl space-y-9">
      <header className="flex items-center justify-between gap-4 text-sm">
        <Link href="/" className="guild-px tracking-widest hover:underline">GIAの酒場</Link>
        <span className="c-chip">招待リンクを受け取った方へ</span>
      </header>
      <PageTitle title="集まりへの招待" lead="このページは招待リンクを知っている方だけが開けます。酒場に入会していなくても申し込めます。" />
      <Window title="集まりの内容">
        <p className="c-label text-xs">主催：{event.host_name}</p>
        <h1 className="mt-3 text-xl leading-snug break-words sm:text-2xl">{event.title}</h1>
        {event.summary && <p className="mt-3 text-sm leading-relaxed break-words">{event.summary}</p>}
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {event.region && <><dt className="c-label">場所</dt><dd className="break-words">{event.region}</dd></>}
          {event.deadline && <><dt className="c-label">申込期限</dt><dd>{event.deadline}</dd></>}
          {event.member_limit && <><dt className="c-label">定員</dt><dd>{event.member_limit}人</dd></>}
        </dl>
        {event.body && <p className="c-dashed-top mt-5 whitespace-pre-line pt-5 text-sm leading-relaxed break-words">{event.body}</p>}
      </Window>
      <Window title="参加申込者の紹介">
        <p className="c-muted text-xs leading-relaxed">紹介を載せることに同意した人だけ表示しています。このリンクを知っている人には見えます。</p>
        {event.participants.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {event.participants.map((person, index) => <div key={`${person.name}-${index}`} className="c-card px-4 py-3">
            <p className="c-label">{person.name}</p>
            {person.introduction && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed break-words">{person.introduction}</p>}
          </div>)}
        </div> : <p className="mt-4 text-sm">公開されている紹介はまだありません。</p>}
      </Window>
      <GuestGatheringForm token={token} event={event} authenticated={Boolean(auth.user)} accountEmail={auth.user?.email ?? ""} initialName={typeof auth.user?.user_metadata?.name === "string" ? auth.user.user_metadata.name : ""} />
    </div>
  </main>;
}
