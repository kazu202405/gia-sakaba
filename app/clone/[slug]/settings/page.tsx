// /clone/[slug]/settings ─ テナント設定（表示名 / slug / プラン情報 / Slack連携）。
// owner / admin のみ編集可（表示名・slug）。member / viewer は read-only。
// Slack 連携は member 以上全員が自分の連携を編集可（個人単位）。
// メンバー管理（招待・role変更）は Phase 3 で別タブとして追加予定。

import {
  EditorialHeader,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { TenantSettingsForm } from "./_components/TenantSettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant, role, userId } = await loadTenantOr404(slug);

  const canEdit = role === "owner" || role === "admin";

  // 自分の Slack user_id / LINE user_id / Google Calendar ID を取得（未登録なら null）
  const supabase = await createClient();
  const { data: memberRow } = await supabase
    .from("ai_clone_tenant_members")
    .select("slack_user_id, line_user_id, google_calendar_id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", userId)
    .maybeSingle();
  const currentSlackUserId = (memberRow?.slack_user_id as string | null) ?? null;
  const currentLineUserId = (memberRow?.line_user_id as string | null) ?? null;
  const currentGoogleCalendarId =
    (memberRow?.google_calendar_id as string | null) ?? null;

  // 右腕AI が紹介コーチのワークシートを読み込むかのフラグ（未設定/null は ON 扱い）
  const { data: tenantFlags } = await supabase
    .from("ai_clone_tenants")
    .select("referral_worksheet_link_enabled")
    .eq("id", tenant.id)
    .maybeSingle();
  const referralWorksheetLinkEnabled =
    (tenantFlags?.referral_worksheet_link_enabled as boolean | null) ?? true;

  // Service Account のメアドを env から取り出して UI で表示する（共有先として案内）
  const serviceAccountEmail = extractServiceAccountEmail();

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6 max-w-3xl">
      <EditorialHeader
        eyebrow="SETTINGS"
        title="テナント設定"
        description="表示名 / URL（slug）/ 契約プラン / Slack 連携。メンバー管理は Phase 3 で追加予定。"
      />

      <TenantSettingsForm
        tenantId={tenant.id}
        currentSlug={tenant.slug}
        currentName={tenant.name}
        currentPlan={tenant.plan}
        currentSlackUserId={currentSlackUserId}
        currentLineUserId={currentLineUserId}
        currentGoogleCalendarId={currentGoogleCalendarId}
        serviceAccountEmail={serviceAccountEmail}
        referralWorksheetLinkEnabled={referralWorksheetLinkEnabled}
        canEdit={canEdit}
        role={role}
      />
    </div>
  );
}

// Service Account の client_email を env (base64 JSON) から取り出す。
// クライアントがカレンダーを共有する宛先として settings UI で表示する。
// 失敗時は null を返す（UI 側で「設定者にお問い合わせください」とフォールバック）。
function extractServiceAccountEmail(): string | null {
  const saB64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  if (!saB64) return null;
  try {
    const json = JSON.parse(Buffer.from(saB64, "base64").toString("utf-8"));
    const email = json.client_email;
    return typeof email === "string" && email.includes("@") ? email : null;
  } catch {
    return null;
  }
}
