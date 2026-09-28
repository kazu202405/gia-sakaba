import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle, Window } from "@/components/guild/cards";
import { GuildSceneArt } from "@/components/guild/guild-scene-art";
import { JoinForm } from "@/components/guild/join-form";
import { InviteSignup } from "@/components/guild/invite-signup";
import { inviteErrorText } from "@/lib/guild/join";
import type { PreparedInvite } from "@/lib/guild/prepared-invites";
import { getGuildContext } from "@/lib/guild/server-data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "入会" };

type Props = { searchParams: Promise<{ invite?: string; preview?: string }> };

type InviteResult =
  | { ok: true; guild: { slug: string; name: string }; inviter_name: string }
  | { ok: false; reason: keyof typeof inviteErrorText };

// 招待コードの確認はDBで行い、入会時にも利用数と期限を同一トランザクションで再確認する。
export default async function JoinPage({ searchParams }: Props) {
  const { invite, preview } = await searchParams;
  if (preview === "1") {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) notFound();
    const context = await getGuildContext();
    if (context.membership.role !== "owner" && context.membership.role !== "master") notFound();
    return <JoinPageFrame>
      <PageTitle title="入会フォームの確認" lead="招待状を受け取った人が、GIAのアカウントを作成して入会するまでの画面です。" />
      <InviteSignup inviterName="管理者" inviteCode="" preview />
      <JoinForm inviterName="管理者" inviteCode="" preview />
    </JoinPageFrame>;
  }
  const code = invite?.trim() ?? "";
  const supabase = await createClient();
  const [{ data, error }, { data: authData }] = await Promise.all([
    code
      ? supabase.rpc("sakaba_check_invite", { p_code: code })
      : Promise.resolve({ data: { ok: false, reason: "missing" }, error: null }),
    supabase.auth.getUser(),
  ]);
  const check = data as InviteResult | null;
  const valid = !error && check?.ok && check.guild.slug === "gia";
  const { data: preparedData, error: preparedError } = valid && process.env.SAKABA_PREJOIN_ENABLED === "true"
    ? await supabase.rpc("sakaba_get_prepared_invite", { p_code: code })
    : { data: null, error: null };
  const prepared = preparedData as PreparedInvite | null;

  return (
    <JoinPageFrame>
      <PageTitle
        title={prepared ? "あなたへの招待状" : "招待リンクから入会"}
        lead="GIAのアカウントを作成、またはログインして入会フォームへお進みください。詳しいプロフィールはあとから登録できます。"
      />
      {valid && prepared?.introduction && !authData.user && <Window title={`${check.inviter_name || "招待した人"}さんからの紹介`}>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{prepared.introduction}</p>
        <p className="c-muted mt-3 text-xs">この紹介文はまだ公開されていません。入会時に掲載するか自分で選べます。</p>
      </Window>}
      {preparedError ? <Window title="招待状"><p className="text-sm">招待状の下書きを読み込めませんでした。時間をおいて開き直してください。</p></Window>
      : valid && !authData.user ? (
        <InviteSignup inviterName={check.inviter_name || "酒場のメンバー"} inviteCode={code} initialName={prepared?.display_name ?? ""} />
      ) : valid ? (
        <JoinForm
          inviterName={check.inviter_name || "管理者"}
          inviteCode={code}
          initialName={typeof authData.user?.user_metadata?.name === "string" && authData.user.user_metadata.name.trim()
            ? authData.user.user_metadata.name : prepared?.display_name ?? ""}
          prepared={prepared}
        />
      ) : (
        <Window title="招待リンク">
          <p className="text-sm leading-relaxed">{error ? "招待リンクを確認できませんでした。時間をおいて再度お試しください。" : check && !check.ok ? inviteErrorText[check.reason] : "この招待リンクはGIAの酒場では使えません。招待してくれた人にご確認ください。"}</p>
        </Window>
      )}
      {valid && prepared && <Window title="入会後に選べること">
        <p className="text-sm leading-relaxed">まずはフリー（0円）で入会できます。ギルド・クエストとプロジェクト2件まで利用できます。必要になったら、プラス（月480円）でプロジェクトの作成枠を広げたり、会食（月880円）で会食の希望を伝えたりできます。入会時に有料プランを選ぶ必要はありません。</p>
      </Window>}
    </JoinPageFrame>
  );
}

function JoinPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="guild-theme guild-scene min-h-screen px-4 py-8 pb-16 sm:px-6 sm:py-12">
      <GuildSceneArt art="tavern" dim />
      <div className="relative z-10 mx-auto max-w-4xl space-y-9">
        <header className="flex items-center justify-between gap-4 border-2 border-[#efe6cf]/70 px-4 py-3 text-sm">
          <Link href="/" className="guild-px tracking-widest hover:underline">GIAの酒場</Link>
          <span className="c-chip">招待状を受け取った方へ</span>
        </header>
        <nav aria-label="入会までの流れ" className="c-window px-4 py-4 sm:px-6">
          <ol className="grid gap-2 text-sm sm:grid-cols-3 sm:gap-0">
            <li className="flex items-center gap-2 sm:border-r sm:border-dashed sm:border-[#efe6cf]/30 sm:pr-4">
              <span className="c-label guild-px">01</span><span>招待状を確認</span>
            </li>
            <li className="flex items-center gap-2 sm:border-r sm:border-dashed sm:border-[#efe6cf]/30 sm:px-4">
              <span className="c-label guild-px">02</span><span>登録・ログイン</span>
            </li>
            <li className="flex items-center gap-2 sm:pl-4">
              <span className="c-label guild-px">03</span><span>酒場へ入会</span>
            </li>
          </ol>
        </nav>
        {children}
      </div>
    </main>
  );
}
