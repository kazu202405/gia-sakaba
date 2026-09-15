// /clone/[slug]/core-os/audit ─ Core OS 棚卸し（健康診断）。
// AIが現在の Core OS を点検し、重複・矛盾・陳腐化・抽象すぎ・肥大を指摘＋直し方を提案。

import { EditorialHeader } from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { CoreOsNav } from "../_components/CoreOsNav";
import { AuditClient } from "./_components/AuditClient";

export const dynamic = "force-dynamic";

export default async function CoreOsAuditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await loadTenantOr404(slug);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        title="Core OS 棚卸し"
        description="数ヶ月に一度、AIが判断軸の脳を点検。重複・矛盾・陳腐化・抽象すぎを洗い出し、小さく鋭く保ちます。"
      />

      <CoreOsNav slug={slug} />

      <AuditClient slug={slug} />
    </div>
  );
}
