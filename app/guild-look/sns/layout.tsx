import { Zen_Kaku_Gothic_New } from "next/font/google";
import { SnFrame } from "@/components/guild/look/sns/frame";

// 建設・不動産の酒場の作り直し（人脈ネットワークSNS）の見本（DBなし）。
// 仕様：contexts/projects/gia/sakaba_kensetsu_sns_spec_v0.1.md。本物の /guild/<店> の画面は変えない。
// 状態は画面の中だけ（再読み込みで元に戻る）。上のつまみで色とホームの形を切り替える。

// 10-30 決定（16「名刺・やわらか A」）の書体。sns.css の --sn-font がこの変数を読む
const snSans = Zen_Kaku_Gothic_New({ weight: ["400", "500", "700", "900"], subsets: ["latin"], variable: "--font-sn-sans", display: "swap" });

export default function SnsMockLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={snSans.variable}>
      <SnFrame>{children}</SnFrame>
    </div>
  );
}
