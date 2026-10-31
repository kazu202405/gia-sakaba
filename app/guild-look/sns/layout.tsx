import { BIZ_UDPGothic, Zen_Kaku_Gothic_New } from "next/font/google";
import { SnFrame } from "@/components/guild/look/sns/frame";

// 建設・不動産の酒場の作り直し（人脈ネットワークSNS）の見本（DBなし）。
// 仕様：contexts/projects/gia/sakaba_kensetsu_sns_spec_v0.1.md。本物の /guild/<店> の画面は変えない。
// 状態は画面の中だけ（再読み込みで元に戻る）。上のつまみで色（藍／深緑）を切り替える。

// 10-31 決定（23「紹介の道＋地域」）の書体：本文は BIZ UDPGothic・見出しは Zen Kaku Gothic New。sns.css の --sn-font / --sn-head がこの変数を読む
const snBody = BIZ_UDPGothic({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-sn-body", display: "swap" });
const snHead = Zen_Kaku_Gothic_New({ weight: ["500", "700", "900"], subsets: ["latin"], variable: "--font-sn-head", display: "swap" });

export default function SnsMockLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${snBody.variable} ${snHead.variable}`}>
      <SnFrame>{children}</SnFrame>
    </div>
  );
}
