// /clone/[slug]/chat ─ 右腕AI Web チャット。
// Slack / LINE と同じ generateReply エンジンを叩く（/api/clone/chat 経由）。
// Slack/LINE を行き来せず、ここから質問・記録・コマンド（紹介連携オン/オフ等）ができる。

import { EditorialHeader } from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { CloneChat } from "./_components/CloneChat";

export const dynamic = "force-dynamic";

export default async function CloneChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await loadTenantOr404(slug); // 認可（member でなければ 404）

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col px-5 sm:px-6 py-6 lg:h-[calc(100dvh-1rem)]">
      <EditorialHeader
        eyebrow="CHAT"
        title="右腕AIチャット"
        description="Slack / LINE と同じ右腕AIに、ここからも話しかけられます。質問・記録・コマンドがそのまま使えます。"
      />
      <div className="mt-4 min-h-0 flex-1">
        <CloneChat slug={slug} />
      </div>
    </div>
  );
}
