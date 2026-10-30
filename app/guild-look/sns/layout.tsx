import { SnFrame } from "@/components/guild/look/sns/frame";

// 建設・不動産の酒場の作り直し（人脈ネットワークSNS）の見本（DBなし）。
// 仕様：contexts/projects/gia/sakaba_kensetsu_sns_spec_v0.1.md。本物の /guild/<店> の画面は変えない。
// 状態は画面の中だけ（再読み込みで元に戻る）。上のつまみで色とホームの形を切り替える。
export default function SnsMockLayout({ children }: { children: React.ReactNode }) {
  return <SnFrame>{children}</SnFrame>;
}
