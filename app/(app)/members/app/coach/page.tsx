// 紹介コーチ chat ページ（プラン0「紹介コーチ」のサロン内実装）。
//
// 役割:
//   サロン会員（applicants にレコードがあるユーザー）が、
//   GIA共通の紹介ナレッジに基づいてコーチ AI に相談できる場所。
//   プラン0として AI Clone の手前に位置し、サロン¥990 の特典として包含する。
//
// データソース（Phase 1）:
//   - applicants（呼びかけ用の name / nickname 取得のみ）
//
// データソース（Phase 2 で追加）:
//   - Notion 紹介ナレッジ DB（v4.1セミナー由来の 5条件 / 行動分解 / 判断パターン）
//   - Supabase 経由で pgvector RAG
//   - OpenAI streaming（`/api/coach/chat`）
//
// 認証:
//   getUser() が null なら /login にリダイレクト（mypage と同じ方針）。
//
// レンダリング戦略:
//   Server Component で auth + initial data 取得 → Client Component (CoachChat) に渡す。
//
// 履歴方針（Phase 1）:
//   同一セッション中のみ React state で保持。リロード / 遷移で消える。
//   後で localStorage → Supabase の段階で格上げ予定。

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantForOwner } from "@/lib/ai-clone/supabase-db";
import { fetchCoachHistory } from "@/lib/coach/coach-history";
import { CoachChat } from "./_components/CoachChat";
import { isActiveMember } from "@/lib/membership/plans";

export const metadata = {
  title: "紹介コーチ | GIA Stories",
  description:
    "一般会員向け、紹介の悩みに伴走するAIコーチ。紹介の5条件・行動分解・判断パターンに基づいて相談できます。",
};

export default async function CoachPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: applicant } = await supabase
    .from("applicants")
    .select("name, nickname, plan, tier")
    .eq("id", user.id)
    .single();

  // 2026-08-10: 紹介コーチAIは会員（オンライン以上）の特典。
  // 以前は tier==='paid' だけを見ており、会員の段を online/real/invite/premium
  // に変えた時点で、購入した人が /upgrade に書いてある特典に入れなくなっていた。
  // 判定は lib/membership/plans.ts に集約している。
  if (!isActiveMember(applicant)) {
    redirect("/members/app/mypage");
  }

  // 呼びかけは nickname > name の優先度
  const callName = applicant?.nickname || applicant?.name || null;

  // 右腕AI（22DB）連携：owner テナントを持つ会員だけトグルを出す。
  // 持っていなければ linkAvailable=false（990円素コーチ確定）。
  const tenant = await resolveTenantForOwner(user.id);

  // 履歴方針:
  //   4,980円（owner テナント有）= Supabase に1本で永続。初期ロードで復元して渡す。
  //   990円（テナント無）        = 端末ローカル保存。クライアント側で復元。
  const persistMode: "server" | "local" = tenant ? "server" : "local";
  const initialHistory =
    tenant ? await fetchCoachHistory(supabase, tenant.id) : [];

  return (
    <CoachChat
      initialName={callName}
      linkAvailable={!!tenant}
      linkEnabled={tenant?.coachLinkEnabled ?? false}
      persistMode={persistMode}
      initialHistory={initialHistory}
      storageKey={`gia-coach:${user.id}`}
    />
  );
}
