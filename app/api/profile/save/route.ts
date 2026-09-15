// 本人専用：自分の applicants プロフィールを保存する。
//
// 動作:
//   1. 認証（auth.getUser）必須。未ログインは 401。
//   2. body から PROFILE_WRITABLE_FIELDS のホワイトリストだけ取り出して UPDATE。
//      tier / id / referrer_id 等の権限境界を跨ぐカラムは弾く。
//   3. 完成度（0-100）を算出して返すだけ（表示用）。
//
// 「合格ライン（全項目埋め → tentative→registered 自動昇格）」は廃止した。
//   理由: 会員になる条件をプロフィール全項目埋めに縛るのは記入コストが高すぎ、
//   ほとんどの人が到達できず離脱していた。代わりに profile/[id] の相互開示ゲート
//   （自分が書いた項目だけ相手のも見える）を動機装置とする。tier は課金区分にのみ使う。
//   completeness は admin 表示 / プログレスバーの視覚用途に残す。
//
// レスポンス:
//   { ok: true, completeness: number }
//
// 失敗時の方針:
//   - 本体の UPDATE 失敗 → 500。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROFILE_REQUIRED_FIELDS,
  computeProfileCompleteness,
} from "@/lib/profile-completeness";

// クライアントから書き込みを許可するカラム（mypage/edit の入力UI 23項目）。
// PROFILE_REQUIRED_FIELDS と同一だが、将来 required から外す任意項目が出ても
// 書き込みは許容したいケースがあるため、別リストとして定義する。
// 2026-05-11: migration 0017 で photo_url / genre / location を追加（23項目化）。
const PROFILE_WRITABLE_FIELDS = [
  "name",
  "name_furigana",
  "nickname",
  "status_message",
  "photo_url",
  "role_title",
  "job_title",
  "headline",
  "services_summary",
  "genre",
  "location",
  "story_origin",
  "story_turning_point",
  "story_now",
  "story_future",
  "want_to_connect_with",
  "favorites",
  "current_hobby",
  "school_days_self",
  "personal_values",
  "contact_line",
  "contact_instagram",
  "contact_website",
] as const;

type WritableField = (typeof PROFILE_WRITABLE_FIELDS)[number];

// boolean 型で書き込みを許可するカラム（社長インタビュー公開ページ・migration 0075）。
// 文字列項目とは正規化の作法が違う（trim/null 化ではなく true/false 化）ので別リスト。
//   - profile_published: 公開ページの ON/OFF（本人 opt-in・デフォルト false）
//   - name_public       : 実名公開の可否（本人 opt-in・デフォルト false）
// これらは 0018 の特権カラムガードの対象外なので本人が自己 UPDATE できる。
// ここに追加しないと edit/mypage から送っても whitelist で黙って捨てられる。
const PROFILE_WRITABLE_BOOLEAN_FIELDS = [
  "profile_published",
  "name_public",
] as const;

type WritableBooleanField = (typeof PROFILE_WRITABLE_BOOLEAN_FIELDS)[number];

// 空文字 → null 正規化。trim も同時に行う。
function normalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "ログインが必要です" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 },
    );
  }

  // ホワイトリストで payload を構築（未知のキーは無視 = tier 等を弾く）
  const payload: Partial<
    Record<WritableField, string | null> & Record<WritableBooleanField, boolean>
  > = {};
  for (const field of PROFILE_WRITABLE_FIELDS) {
    if (field in body) {
      payload[field] = normalize(body[field]);
    }
  }
  // boolean 項目（公開フラグ）は true/false のみ受け付ける。それ以外の型は無視。
  for (const field of PROFILE_WRITABLE_BOOLEAN_FIELDS) {
    if (field in body && typeof body[field] === "boolean") {
      payload[field] = body[field] as boolean;
    }
  }

  // name は NOT NULL。空にしようとした場合は弾く。
  if ("name" in payload && payload.name === null) {
    return NextResponse.json(
      { error: "お名前は必須です" },
      { status: 400 },
    );
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: "更新対象のフィールドがありません" },
      { status: 400 },
    );
  }

  // 1) 本体 UPDATE + 完成度判定用に必要カラムを再取得
  const selectCols = [
    "tier",
    ...PROFILE_REQUIRED_FIELDS,
  ].join(", ");

  const { data: updated, error: uErr } = await supabase
    .from("applicants")
    .update(payload)
    .eq("id", user.id)
    .select(selectCols)
    .single();

  if (uErr || !updated) {
    return NextResponse.json(
      { error: `保存に失敗しました：${uErr?.message ?? "unknown error"}` },
      { status: 500 },
    );
  }

  // 2) 完成度算出（表示用。昇格判定は行わない）
  const updatedRow = updated as unknown as Record<string, unknown>;
  const completeness = computeProfileCompleteness(
    updatedRow as Partial<
      Record<(typeof PROFILE_REQUIRED_FIELDS)[number], string | null | undefined>
    >,
  );

  return NextResponse.json({
    ok: true,
    completeness,
  });
}
