import { Suspense } from "react";
import { PageSkeleton } from "@/components/guild/look/sns/parts";
import { SearchScreen } from "@/components/guild/look/sns/screens";

// 検索の条件（?q= ?region= ?industry=）を読むまでの間も、仮の画面を出す
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SearchScreen />
    </Suspense>
  );
}
