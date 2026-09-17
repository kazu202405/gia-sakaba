import type { Metadata } from "next";
import { PageTitle, Window } from "@/components/guild/cards";
import { JoinForm } from "@/components/guild/join-form";
import { checkInvite, inviteErrorText } from "@/lib/guild/join";
import { TODAY, getProfile, guild, invites } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: "入会" };

type Props = { searchParams: Promise<{ invite?: string }> };

// 入会は 招待リンク（/guild/join?invite=コード）からだけ。本番は 招待コードの確かめと 使った数の加算を サーバー側で行う
export default async function JoinPage({ searchParams }: Props) {
  const { invite } = await searchParams;
  const check = checkInvite(invites, invite, TODAY);

  return (
    <div className="space-y-9">
      <PageTitle
        title={`${guild.name}に 入会する`}
        lead="名前と 会社名だけで はじめられます。くわしい ステータスは あとから 書けます。"
      />
      {check.ok ? (
        <JoinForm inviterName={getProfile(check.invite.created_by)?.display_name ?? guild.terms.master} />
      ) : (
        <Window title="招待リンク">
          <p className="text-sm leading-relaxed">{inviteErrorText[check.reason]}</p>
        </Window>
      )}
    </div>
  );
}
