import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTitle, Window } from "@/components/guild/cards";
import { JoinForm } from "@/components/guild/join-form";
import { InviteSignup } from "@/components/guild/invite-signup";
import { inviteErrorText } from "@/lib/guild/join";
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
      <InviteSignup inviterName="ギルドマスター" inviteCode="" preview />
      <JoinForm inviterName="ギルドマスター" inviteCode="" preview />
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

  return (
    <JoinPageFrame>
      <PageTitle
        title="招待リンクから入会"
        lead="GIAのアカウントでログインし、入会フォームへお進みください。詳しいプロフィールはあとから登録できます。"
      />
      {valid && !authData.user ? (
        <InviteSignup inviterName={check.inviter_name || "酒場のメンバー"} inviteCode={code} />
      ) : valid ? (
        <JoinForm
          inviterName={check.inviter_name || "ギルドマスター"}
          inviteCode={code}
          initialName={typeof authData.user?.user_metadata?.name === "string" ? authData.user.user_metadata.name : ""}
        />
      ) : (
        <Window title="招待リンク">
          <p className="text-sm leading-relaxed">{error ? "招待リンクを確認できませんでした。時間をおいて再度お試しください。" : check && !check.ok ? inviteErrorText[check.reason] : "この招待リンクはGIAの酒場では使えません。招待してくれた人にご確認ください。"}</p>
        </Window>
      )}
    </JoinPageFrame>
  );
}

function JoinPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="guild-theme min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl space-y-9">{children}</div>
    </main>
  );
}
