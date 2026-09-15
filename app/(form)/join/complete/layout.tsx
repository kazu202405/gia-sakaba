// /join/complete ルートのレイアウト。
// 配下の page.tsx が client component（"use client"）のため、metadata はここから export する。
// Run 2 で page.tsx を Supabase fetch のため client 化したことに伴う移管。

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "申込完了 | 紹介設計研究所" },
};

export default function JoinCompleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
