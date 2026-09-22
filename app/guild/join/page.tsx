import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTitle, Window } from "@/components/guild/cards";
import { JoinForm } from "@/components/guild/join-form";
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
    const context = await getGuildContext();
    if (context.membership.role !== "owner" && context.membership.role !== "master") notFound();
    return <div className="space-y-9">
      <PageTitle title="入会フォームの確認" lead="招待された人が、ログイン後に入力する画面です。" />
      <JoinForm inviterName="ギルドマスター" inviteCode="" preview />
    </div>;
  }
  const code = invite?.trim() ?? "";
  const { data, error } = code
    ? await (await createClient()).rpc("sakaba_check_invite", { p_code: code })
    : { data: { ok: false, reason: "missing" }, error: null };
  const check = data as InviteResult | null;
  const valid = !error && check?.ok && check.guild.slug === "gia";

  return (
    <div className="space-y-9">
      <PageTitle
        title="GIAの酒場に 入会する"
        lead="名前と 会社名だけで はじめられます。くわしい ステータスは あとから 書けます。"
      />
      {valid ? (
        <JoinForm inviterName={check.inviter_name || "ギルドマスター"} inviteCode={code} />
      ) : (
        <Window title="招待リンク">
          <p className="text-sm leading-relaxed">{error ? "招待リンクを確認できませんでした。時間をおいて再度お試しください。" : check && !check.ok ? inviteErrorText[check.reason] : "この招待リンクはGIAの酒場では使えません。招待してくれた人にご確認ください。"}</p>
        </Window>
      )}
    </div>
  );
}
