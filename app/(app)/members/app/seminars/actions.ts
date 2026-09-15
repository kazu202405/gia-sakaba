// セミナー（勉強会・懇親会）への参加申込 Server Action。
// 会員向けセミナー一覧（seminars/page.tsx）の申込ボタンから呼ぶ。
//
// 仕様:
//   - ログイン必須（未ログインは /login へ）。
//   - event_attendees に status='pending' で参加表明 INSERT。
//   - 既に行があれば（過去にキャンセル/却下含む）status を 'pending' に戻す。
//   - 成否はオブジェクトで返し、ボタン側で表示を更新する。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ApplyResult = { ok: true } | { ok: false; error: string };

export async function applyToSeminar(seminarId: string): Promise<ApplyResult> {
  if (!seminarId) return { ok: false, error: "セミナーが指定されていません。" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  // 既存の参加行があるか確認（再申込＝status を pending に戻す）
  const { data: existing } = await supabase
    .from("event_attendees")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("seminar_id", seminarId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "pending" || existing.status === "approved") {
      return { ok: true }; // 既に有効な申込あり（冪等）
    }
    const { error } = await supabase
      .from("event_attendees")
      .update({ status: "pending" })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("event_attendees").insert({
      user_id: user.id,
      seminar_id: seminarId,
      status: "pending",
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/members/app/seminars");
  revalidatePath("/members/app/mypage");
  return { ok: true };
}
