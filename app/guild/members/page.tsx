import type { Metadata } from "next";
import { PageTitle } from "@/components/guild/cards";
import { MemberDirectory } from "@/components/guild/member-directory";
import { guild, listMembers } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: `${guild.terms.member} めいかん` };

export default function MembersPage() {
  return (
    <div>
      <PageTitle
        title={`${guild.terms.member} めいかん`}
        lead="だれが なにをしている人かを 知る場所です。気になる人がいたら、ギルドマスターに しょうかいを頼めます。"
      />
      <MemberDirectory members={listMembers()} />
    </div>
  );
}
