import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/guild/cards";
import { GatheringApprovals } from "@/components/guild/gathering-approvals";
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
      <div className="mt-11 space-y-4">
        <Link href="/guild/master/gathering/new" className="rpg-button h-12 w-full text-base sm:w-auto sm:px-6">
          ▶ 集まりを ひらく
        </Link>
        <GatheringApprovals />
      </div>
    </div>
  );
}
