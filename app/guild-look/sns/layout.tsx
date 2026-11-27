import type { Metadata } from "next";
import { snsFontClass } from "@/components/guild/look/sns/typography";
import { SnFrame } from "@/components/guild/look/sns/frame";
import { SNS_BASE, SNS_PWA_ICON, SNS_PWA_NAME } from "@/lib/guild/look/sns-mock";

// 建設・不動産の酒場の作り直し（人脈ネットワークSNS）の見本（DBなし）。
// 仕様：contexts/projects/gia/sakaba_kensetsu_sns_spec_v0.1.md。本物の /guild/<店> の画面は変えない。
// 状態は画面の中だけ（再読み込みで元に戻る）。上のつまみで色（藍／深緑）を切り替える。

export const metadata: Metadata = {
  title: { absolute: SNS_PWA_NAME },
  manifest: SNS_BASE + "/manifest.webmanifest",
  icons: { apple: SNS_PWA_ICON + "-apple-touch.png" },
};

export default function SnsMockLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={snsFontClass}>
      <SnFrame>{children}</SnFrame>
    </div>
  );
}
