import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/guild/cards";
import { MarkSeen } from "@/components/guild/mark-seen";
import { MemberDirectory } from "@/components/guild/member-directory";
import { getGuildContext, listGuildMembers } from "@/lib/guild/server-data";
import { signBusinessCards } from "@/lib/guild/business-card-server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "ギルドメンバー めいかん" };

export default async function MembersPage() {
  const [context, members] = await Promise.all([getGuildContext(), listGuildMembers()]);
  const memberTerm = context.guild.terms.member;
  // 「めいし」表示用：名刺の表面（表が無ければ裏）の署名URLを人ごとに
  const supabase = await createClient();
  const { data: cardList } = await supabase.rpc("sakaba_list_business_cards");
  const cards = (cardList as { user_id: string; front: string | null; back: string | null }[] | null) ?? [];
  const signed = await signBusinessCards(supabase, cards.map((card) => card.front ?? card.back));
  const cardUrls: Record<string, string> = {};
  for (const card of cards) {
    const path = card.front ?? card.back;
    if (path && signed[path]) cardUrls[card.user_id] = signed[path];
  }

  return (
    <div>
      <MarkSeen list="members" />
      <PageTitle
        title={`${memberTerm} めいかん`}
        lead="だれが なにをしている人かを 知る場所です。気になる人がいたら、つながりの申請をしてみましょう。"
      />
      <Link href="/guild/requests" className="c-button-sub mb-6 inline-flex min-h-11 items-center px-4 text-sm">
        つながり申請の状況を見る ▶
      </Link>
      <MemberDirectory members={members} memberTerm={memberTerm} cardUrls={cardUrls} />
    </div>
  );
}
