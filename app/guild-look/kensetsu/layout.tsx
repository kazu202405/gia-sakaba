import { Suspense } from "react";
import { FrameShell, KensetsuFrame, PageSkeleton } from "@/components/guild/look/kensetsu/frame";
import { KensetsuProvider } from "@/components/guild/look/kensetsu/store";

// 建設・不動産の酒場「相談する → 追跡 → 管理者が渡す」の全体モック（段階0・DBなし）。
// 仕様：contexts/projects/gia/sakaba_kensetsu_flow_spec.md。本物の /guild/<店> の画面は変えない。
// 状態は画面の中だけ（再読み込みで元に戻る）。?as=member / ?as=admin で見る人を切り替える。
export default function KensetsuMockLayout({ children }: { children: React.ReactNode }) {
  return (
    <KensetsuProvider>
      {/* ?as= を読むまでの間も、同じ外枠と仮の画面を出す */}
      <Suspense fallback={<FrameShell><PageSkeleton /></FrameShell>}>
        <KensetsuFrame>{children}</KensetsuFrame>
      </Suspense>
    </KensetsuProvider>
  );
}
