// /clone/[slug]/finance ─ 売上・経費トップ。デフォルトは売上タブ。

import { redirect } from "next/navigation";

export default async function FinancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/clone/${slug}/finance/revenue`);
}
