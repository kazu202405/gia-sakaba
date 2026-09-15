"use client";

// ナビゲーション pending を可視化する小さなスピナー。
// Next.js 16 の `useLinkStatus()` を使い、囲んでいる `<Link>` の遷移中だけ表示する。
//
// 使い方:
//   <Link href={...}>
//     <Icon /> ラベル
//     <NavLinkPendingIndicator />
//   </Link>
//
// 要件:
//   * 必ず Link の中（descendant）に置く。Link の外で呼ぶと常に pending=false になる。
//   * Link 自体は Server / Client どちらでもOK。このコンポーネントが Client なので
//     親の Server Component から普通に <Link>...<NavLinkPendingIndicator /></Link> と書ける。

import { Loader2 } from "lucide-react";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  /** スピナー本体に当てる Tailwind クラス。サイズや色を上書きしたい時に。 */
  className?: string;
}

export function NavLinkPendingIndicator({ className }: Props) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <Loader2
      aria-label="読み込み中"
      className={cn(
        "ml-auto w-3.5 h-3.5 animate-spin text-current opacity-70",
        className,
      )}
    />
  );
}
