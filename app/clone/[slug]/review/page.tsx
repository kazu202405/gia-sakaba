// /clone/[slug]/review ─ レビュートップ。判断履歴がレビューの中核なのでデフォルトはそこへ。

import { redirect } from "next/navigation";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/clone/${slug}/review/decisions`);
}
