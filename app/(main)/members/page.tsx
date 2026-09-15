import { Metadata } from "next";
import { SalonLP } from "@/components/salon/salon-lp";

export const metadata: Metadata = {
  title: { absolute: "HIROGARUキャンパス | あなたの事業は、まだまだ大きくなれる" },
  description:
    "「こんな世界があるんだ」「自分の人生と事業はまだまだ広げられる」——お金・経営・AI・思考法を通じて、経営者と挑戦者の“見えている世界”を、もう一段広げるコミュニティ。月1回の勉強会、うまくいっている企業の事例研究、参加者同士の交流・紹介・協業マッチング、壁打ち相談会、リアル懇親会。月額11,000円（税込）の実践型コミュニティ「HIROGARUキャンパス」。",
};

export default function MembersPage() {
  return <SalonLP />;
}
