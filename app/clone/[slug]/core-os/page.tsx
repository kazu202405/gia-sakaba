// /clone/[slug]/core-os ─ Core OS のトップ。デフォルトで mission にリダイレクト。
// （7セクションの中で「最初に決めるべき」もの = ミッション理念をデフォルトに）

import { redirect } from "next/navigation";

export default async function CoreOsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/clone/${slug}/core-os/mission`);
}
