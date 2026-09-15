// Supabase 凍結防止 keep-alive エンドポイント。
//
// 背景:
//   Supabase 無料枠は 7 日間 DB アクセスがないと自動的にプロジェクトが pause される。
//   vercel.json の cron で 3 日ごとにこの GET を叩き、確実に凍結を防止する。
//
// 実装:
//   - 公開 read 可能な seminars テーブルから 1 行だけ SELECT すれば DB ヒット成立
//   - service_role_key 不要（seminars は public read RLS あり）
//   - レスポンスは ok / ts のみ。エラー時は HTTP 500 + error message
//
// cron 設定:
//   vercel.json の crons[]
//     path: "/api/keep-alive"
//     schedule: "0 0 *\/3 * *"   ← 3日ごと 0:00 UTC（日本時間 9:00）

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.from("seminars").select("id").limit(1);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
