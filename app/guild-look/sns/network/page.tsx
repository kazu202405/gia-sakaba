import { Suspense } from "react";
import { NetworkScreen } from "@/components/guild/look/sns/network-screens";
import { PageSkeleton } from "@/components/guild/look/sns/parts";

// 開くタブ（?tab=）を読むまでの間も、仮の画面を出す
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NetworkScreen />
    </Suspense>
  );
}
