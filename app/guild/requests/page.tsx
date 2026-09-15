import type { Metadata } from "next";
import { PageTitle } from "@/components/guild/cards";
import { MyRequests } from "@/components/guild/my-requests";
import { introRequests } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: "しょうかい いらい" };

export default function RequestsPage() {
  return (
    <div>
      <PageTitle
        title="しょうかい いらい"
        lead="しょうかいは すべて ギルドマスターを通ります。相手が承諾したときだけ、おたがいの れんらく先が見えるようになります。"
      />
      <MyRequests initial={introRequests} />
    </div>
  );
}
