import type { Metadata } from "next";
import { QuestForm } from "@/components/guild/quest-form";

export const metadata: Metadata = { title: "集まりを ひらく" };

// 本番では guild_members.role が owner / master の人だけが開ける（サーバー側で確かめる）。出すときも RPC で役割を確かめる
export default function NewGatheringPage() {
  return <QuestForm gathering />;
}
