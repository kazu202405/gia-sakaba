// /upgrade ルートのレイアウト。
// 配下の page.tsx が client component（"use client"）のため、metadata はここから export する。
// ルート全体に作用させたいわけではなく、このディレクトリ配下のページタイトルを統一する目的。
//
// 2026-08-11: ヘッダーを出すようにした。
//   (form) レイアウトは意図的にナビを外している（ログイン・登録の離脱を
//   減らすため）が、/upgrade はヘッダーの「会員のご案内」から来るページで、
//   ナビが無いと戻る手段がない行き止まりになっていた。
//   申し込みそのものより「見て検討する」ページなので、サイト内を回遊できた方がよい。

import type { Metadata } from "next";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: { absolute: "会員のご案内 | 紹介設計研究所" },
};

export default function UpgradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
