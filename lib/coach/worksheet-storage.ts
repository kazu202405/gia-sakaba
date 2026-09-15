// 紹介設計ワークシートの永続化ヘルパー。
// クライアント / サーバーどちらの SupabaseClient でも使えるように、
// SupabaseClient を引数で受け取る関数として実装する。
//
// テーブル: referral_worksheets (user_id PK, data jsonb, updated_at)
// マイグレーション: supabase/migrations/0009_add_referral_worksheets.sql
// JSONB キー: lib/coach/worksheet-schema.ts の field.id (ws01_01〜ws03_05)

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorksheetData } from "./worksheet-schema";

/** 自分のワークシートを取得。未登録なら空オブジェクトを返す。 */
export async function loadWorksheet(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorksheetData> {
  const { data, error } = await supabase
    .from("referral_worksheets")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // 取得失敗時は空で返してフォーム自体は使えるようにする。
    // 保存時にも同じエラーが出るので、その時に UI に通知される。
    console.error("[worksheet-storage] loadWorksheet error:", error);
    return {};
  }
  return ((data?.data as WorksheetData | undefined) ?? {}) as WorksheetData;
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

/** ワークシート全体を upsert で保存（部分保存ではなく丸ごと書き換え）。 */
export async function saveWorksheet(
  supabase: SupabaseClient,
  userId: string,
  worksheetData: WorksheetData,
): Promise<SaveResult> {
  const { error } = await supabase
    .from("referral_worksheets")
    .upsert(
      {
        user_id: userId,
        data: worksheetData,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** ワークシートの1項目だけ更新する（load→該当キー差し替え→全体save）。
 *  コーチchat が「磨いた改善案」を保存するのに使う。 */
export async function updateWorksheetField(
  supabase: SupabaseClient,
  userId: string,
  fieldId: string,
  value: string,
): Promise<SaveResult> {
  const current = await loadWorksheet(supabase, userId);
  const next: WorksheetData = { ...current, [fieldId]: value };
  return saveWorksheet(supabase, userId, next);
}
