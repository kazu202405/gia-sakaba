import type { Metadata } from "next";
import { PageTitle } from "@/components/guild/cards";
import { MasterConsole } from "@/components/guild/master-console";
import { guild, introRequests } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: guild.terms.master };

// 本番では guild_members.role が owner / master の人だけが開ける（サーバー側で確かめる）
export default function MasterPage() {
  return (
    <div>
      <PageTitle
        title="しょうかいの しれいしつ"
        lead="とどいた しょうかい依頼を見て、つなぐ・別の人を提案する・見送るを決めます。"
      />
      <MasterConsole initial={introRequests} />
    </div>
  );
}
