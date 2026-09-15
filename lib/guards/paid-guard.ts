// paid（サロン本会員）ガード。
// Server Component から呼んで、tier!=='paid' の場合は /upgrade、未ログインは /login にリダイレクトする。
//
// 使い方:
//   const { supabase, userId, applicant } = await requirePaid();
//
// 設計意図:
//   - 多重防御（サイドバーで非表示 + ページ側でも getUser + tier チェック）
//   - 安全側に倒す：applicants 取得エラーは /upgrade にリダイレクト
//   - URL 直叩きにも対応
//
// 関連メモリ:
//   - feedback_access_gate_pattern.md（サロンと AI Clone は2ゲート分離）

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface PaidApplicant {
  id: string;
  name: string;
  nickname: string | null;
  tier: string;
}

export interface PaidGuardResult {
  /** 認証＋ガード通過後の Supabase server client（再利用してデータ取得に使える） */
  supabase: Awaited<ReturnType<typeof createClient>>;
  /** 認証済みユーザーの auth.users.id */
  userId: string;
  /** 自分の applicants 行（最小限の列） */
  applicant: PaidApplicant;
}

export async function requirePaid(): Promise<PaidGuardResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("applicants")
    .select("id, name, nickname, tier")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    // 取れない時は安全側で /upgrade に倒す（fail-closed）
    redirect("/upgrade");
  }

  const row = data as Record<string, unknown>;
  const tier = (row.tier as string | null) ?? "tentative";

  if (tier !== "paid") {
    redirect("/upgrade");
  }

  return {
    supabase,
    userId: user.id,
    applicant: {
      id: row.id as string,
      name: (row.name as string) ?? "",
      nickname: (row.nickname as string | null) ?? null,
      tier,
    },
  };
}
