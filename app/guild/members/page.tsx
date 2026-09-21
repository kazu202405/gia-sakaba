import type { Metadata } from "next";
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
        lead="だれが なにをしている人かを 知る場所です。気になる人がいたら、ギルドマスターに しょうかいを頼めます。"
      />
      <MemberDirectory members={members} memberTerm={memberTerm} />
    </div>
  );
}
