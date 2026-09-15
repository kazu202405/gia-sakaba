"use client";

// 未保存の変更があるときに、ページ離脱（リロード/タブ閉じ/戻る）を引き止める。
// active = 未保存(dirty) のときだけ beforeunload を張る。
// ※ Next.js App Router のクライアント内遷移は標準APIで確実にブロックできないため、
//   ここではブラウザのネイティブ離脱（リロード/閉じる/履歴戻る）を対象にする。

import { useEffect } from "react";

export function useUnsavedWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 一部ブラウザは returnValue のセットを要求する
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}
