// /clone/[slug]/settings の Server Actions。
// テナント情報（表示名 / slug）の更新。owner / admin のみ実行可。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9-]{3,20}$/;
// URL 衝突 / 予約語（/app/* 以下のディレクトリ名 + 一般予約）
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "clone",
  "founder",
  "login",
  "logout",
  "members",
  "members-admin",
  "mypage",
  "post",
  "profile",
  "services",
  "settings",
  "tasks",
  "tree",
  "worksheet",
  "_next",
  "public",
  "static",
  "new",
  "edit",
  "delete",
  "create",
  "update",
]);

type Role = "owner" | "admin" | "member" | "viewer";
type Result = { ok: boolean; error?: string };

async function loadEditableContext(
  tenantId: string,
): Promise<
  | { ok: true; userId: string; role: Role }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { data: member } = await supabase
    .from("ai_clone_tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return { ok: false, error: "このテナントの権限がありません" };
  const role = member.role as Role;
  if (role !== "owner" && role !== "admin") {
    return { ok: false, error: "編集権限がありません（owner / admin のみ）" };
  }
  return { ok: true, userId: user.id, role };
}

export async function updateTenantName(
  currentSlug: string,
  tenantId: string,
  rawName: string,
): Promise<Result> {
  const name = (rawName ?? "").trim();
  if (name.length === 0) {
    return { ok: false, error: "表示名は必須です" };
  }
  if (name.length > 50) {
    return { ok: false, error: "表示名は50文字以内で入力してください" };
  }

  const ctx = await loadEditableContext(tenantId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_clone_tenants")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${currentSlug}`, "layout");
  return { ok: true };
}

export async function updateTenantSlug(
  currentSlug: string,
  tenantId: string,
  rawSlug: string,
): Promise<{ ok: boolean; error?: string; newSlug?: string }> {
  const newSlug = (rawSlug ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(newSlug)) {
    return {
      ok: false,
      error: "slug は英小文字 / 数字 / ハイフンの3〜20文字で指定してください",
    };
  }
  if (RESERVED_SLUGS.has(newSlug)) {
    return { ok: false, error: "この slug は予約語のため使用できません" };
  }

  const ctx = await loadEditableContext(tenantId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  // 同じ slug への変更は no-op
  if (newSlug === currentSlug) {
    return { ok: true, newSlug };
  }

  const supabase = await createClient();

  // 重複チェック（unique 制約に当たる前に明示的に調べてエラーを分かりやすく）
  const { data: existing } = await supabase
    .from("ai_clone_tenants")
    .select("id")
    .eq("slug", newSlug)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "この slug は既に使われています" };
  }

  const { error } = await supabase
    .from("ai_clone_tenants")
    .update({ slug: newSlug, updated_at: new Date().toISOString() })
    .eq("id", tenantId);

  if (error) {
    // 競合で unique 違反が起きた場合のフォールバック
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, error: "この slug は既に使われています" };
    }
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  // 旧 slug / 新 slug 両方の path を invalidate
  revalidatePath(`/clone/${currentSlug}`, "layout");
  revalidatePath(`/clone/${newSlug}`, "layout");
  revalidatePath("/clone");
  return { ok: true, newSlug };
}

// 自分の Slack user_id を tenant_members に登録 / 更新 / 解除する。
// member 以上の全ロールが自分のレコードに対して実行可能。
// 空文字を渡すと連携解除（NULL 化）。
const SLACK_USER_ID_RE = /^U[A-Z0-9]{8,20}$/;

export async function updateMySlackUserId(
  currentSlug: string,
  tenantId: string,
  rawSlackUserId: string,
): Promise<Result> {
  const normalized = (rawSlackUserId ?? "").trim();

  // 空文字 = 連携解除
  if (normalized.length === 0) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "ログインが必要です" };

    const { data, error } = await supabase
      .from("ai_clone_tenant_members")
      .update({ slack_user_id: null })
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .select("user_id");

    if (error) {
      return { ok: false, error: `連携解除に失敗しました：${error.message}` };
    }
    if (!data || data.length === 0) {
      return {
        ok: false,
        error: "連携解除できませんでした（権限エラーまたは該当行なし）",
      };
    }
    revalidatePath(`/clone/${currentSlug}/settings`);
    return { ok: true };
  }

  // 形式チェック（U で始まる英大文字＋数字）
  if (!SLACK_USER_ID_RE.test(normalized)) {
    return {
      ok: false,
      error: "Slack user_id は U で始まる英大文字・数字（例: U01ABC2DEF3）で入力してください",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  // 自分が member であることを確認（他テナントへの書き込み防止）
  const { data: member } = await supabase
    .from("ai_clone_tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { ok: false, error: "このテナントの権限がありません" };

  // 重複チェック（UNIQUE 制約に当たる前に分かりやすいエラーを返す）
  const { data: conflict } = await supabase
    .from("ai_clone_tenant_members")
    .select("user_id, tenant_id")
    .eq("slack_user_id", normalized)
    .neq("user_id", user.id)
    .maybeSingle();
  if (conflict) {
    return {
      ok: false,
      error: "この Slack user_id は他のメンバーで既に使われています",
    };
  }

  const { data, error } = await supabase
    .from("ai_clone_tenant_members")
    .update({ slack_user_id: normalized })
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .select("user_id");

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return {
        ok: false,
        error: "この Slack user_id は他のメンバーで既に使われています",
      };
    }
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "保存できませんでした（権限エラーまたは該当行なし）",
    };
  }

  revalidatePath(`/clone/${currentSlug}/settings`);
  return { ok: true };
}

// 自分の LINE user_id を tenant_members に登録 / 更新 / 解除する。
// member 以上の全ロールが自分のレコードに対して実行可能。
// 空文字を渡すと連携解除（NULL 化）。
// LINE user_id は U で始まる32文字英数字（公式仕様: 33文字、先頭 U + 32 hex）。
const LINE_USER_ID_RE = /^U[0-9a-f]{32}$/;

export async function updateMyLineUserId(
  currentSlug: string,
  tenantId: string,
  rawLineUserId: string,
): Promise<Result> {
  const normalized = (rawLineUserId ?? "").trim();

  // 空文字 = 連携解除
  if (normalized.length === 0) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "ログインが必要です" };

    const { data, error } = await supabase
      .from("ai_clone_tenant_members")
      .update({ line_user_id: null })
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .select("user_id");

    if (error) {
      return { ok: false, error: `連携解除に失敗しました：${error.message}` };
    }
    if (!data || data.length === 0) {
      return {
        ok: false,
        error: "連携解除できませんでした（権限エラーまたは該当行なし）",
      };
    }
    revalidatePath(`/clone/${currentSlug}/settings`);
    return { ok: true };
  }

  // 形式チェック（U で始まる 32 文字 hex）
  if (!LINE_USER_ID_RE.test(normalized)) {
    return {
      ok: false,
      error:
        "LINE user_id は U で始まる33文字（U + 32文字の英小文字/数字）で入力してください",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  // 自分が member であることを確認
  const { data: member } = await supabase
    .from("ai_clone_tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { ok: false, error: "このテナントの権限がありません" };

  // 重複チェック
  const { data: conflict } = await supabase
    .from("ai_clone_tenant_members")
    .select("user_id, tenant_id")
    .eq("line_user_id", normalized)
    .neq("user_id", user.id)
    .maybeSingle();
  if (conflict) {
    return {
      ok: false,
      error: "この LINE user_id は他のメンバーで既に使われています",
    };
  }

  const { data, error } = await supabase
    .from("ai_clone_tenant_members")
    .update({ line_user_id: normalized })
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .select("user_id");

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return {
        ok: false,
        error: "この LINE user_id は他のメンバーで既に使われています",
      };
    }
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "保存できませんでした（権限エラーまたは該当行なし）",
    };
  }

  revalidatePath(`/clone/${currentSlug}/settings`);
  return { ok: true };
}

// 自分の Google Calendar ID を tenant_members に登録 / 更新 / 解除する。
// Service Account 共有方式：クライアントが自分のカレンダーを Service Account
// メアドに「予定の表示」権限で共有し、ここにカレンダーIDを貼る運用。
// メアド形式（〜@gmail.com / 〜@group.calendar.google.com / "primary"）を許容。
const GOOGLE_CALENDAR_ID_RE =
  /^(primary|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

export async function updateMyGoogleCalendarId(
  currentSlug: string,
  tenantId: string,
  rawCalendarId: string,
): Promise<Result> {
  const normalized = (rawCalendarId ?? "").trim();

  if (normalized.length === 0) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "ログインが必要です" };

    const { data, error } = await supabase
      .from("ai_clone_tenant_members")
      .update({ google_calendar_id: null })
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .select("user_id");

    if (error) {
      return { ok: false, error: `連携解除に失敗しました：${error.message}` };
    }
    if (!data || data.length === 0) {
      return {
        ok: false,
        error: "連携解除できませんでした（権限エラーまたは該当行なし）",
      };
    }
    revalidatePath(`/clone/${currentSlug}/settings`);
    return { ok: true };
  }

  if (!GOOGLE_CALENDAR_ID_RE.test(normalized)) {
    return {
      ok: false,
      error:
        "カレンダーIDはメアド形式（例: yourname@gmail.com）または \"primary\" で入力してください",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  // 自分が member であることを確認
  const { data: member } = await supabase
    .from("ai_clone_tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { ok: false, error: "このテナントの権限がありません" };

  const { data, error } = await supabase
    .from("ai_clone_tenant_members")
    .update({ google_calendar_id: normalized })
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .select("user_id");

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "保存できませんでした（権限エラーまたは該当行なし）",
    };
  }

  revalidatePath(`/clone/${currentSlug}/settings`);
  return { ok: true };
}

// 右腕AI が紹介コーチのワークシート（referral_worksheets）を読み込むかの ON/OFF。
// owner / admin のみ。紹介コーチ側 coach_link_enabled と対になる右腕側トグル。
export async function setReferralWorksheetLink(
  currentSlug: string,
  tenantId: string,
  enabled: boolean,
): Promise<Result> {
  const ctx = await loadEditableContext(tenantId);
  if (!ctx.ok) return ctx;

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_clone_tenants")
    .update({ referral_worksheet_link_enabled: enabled })
    .eq("id", tenantId);
  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${currentSlug}/settings`);
  return { ok: true };
}
