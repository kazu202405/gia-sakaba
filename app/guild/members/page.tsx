import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/guild/cards";
import { MarkSeen } from "@/components/guild/mark-seen";
import { MemberDirectory } from "@/components/guild/member-directory";
import { getGuildContext, listGuildMembers } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "ギルドメンバー めいかん" };

export default async function MembersPage() {
  const [context, members] = await Promise.all([getGuildContext(), listGuildMembers()]);
  const memberTerm = context.guild.terms.member;

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
      <MemberDirectory members={members} memberTerm={memberTerm} />
    </div>
  );
}
