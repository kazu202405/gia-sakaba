// メンバー一覧（Phase 2：実DB化 + ログイン会員に開放）。
// applicants から自分以外の全メンバーを取得し、検索フィルタは Client Component に委譲する。
//
// 認証ガード:
//   ログイン必須（未ログインは /login）。tier は問わない＝無料会員も一覧を閲覧できる。
//   一覧カードは基本情報（写真/名前/肩書/ジャンル/拠点）のみ＝常時公開の範囲。
//   個々のストーリー/人柄/連絡先は profile/[id] 側で相互開示ゲートにより制御する。
//
// 表示方針:
//   - tier='paid' が先頭、その後 updated_at desc
//   - 自分自身は除外（neq id）
//   - 法人/個人・ジャンル絞り込みは applicants の該当列が無いため一旦撤去
//
// 公開範囲の論点（network_app.md より）:
//   本来は「自分のイベントに参加した招待者のみ」が公開対象だが、
//   Phase 1 ではセミナー参加者同士の紹介を促す観点で applicants 全件を表示する。
//   将来的に event_attendees join で「自分の参加イベントに居た人だけ」に絞る可能性あり。

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  MembersList,
  type MemberItem,
} from "./_components/MembersList";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const userId = user.id;

  // member_profiles ビュー経由で会員を読む（applicants 直読みは RLS で自分の行しか
  // 取れないため。ビューは email/stripe 等の機密を除外済み・migration 0059）。
  const { data, error } = await supabase
    .from("member_profiles")
    .select(
      "id, name, nickname, tier, plan, member_no, photo_url, role_title, job_title, headline, services_summary, genre, location, updated_at, created_at",
    )
    .neq("id", userId);

  const members: MemberItem[] = ((data ?? []) as unknown[]).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      name: (row.name as string) ?? "",
      nickname: (row.nickname as string | null) ?? null,
      photo_url: (row.photo_url as string | null) ?? null,
      role_title: (row.role_title as string | null) ?? null,
      job_title: (row.job_title as string | null) ?? null,
      headline: (row.headline as string | null) ?? null,
      services_summary: (row.services_summary as string | null) ?? null,
      genre: (row.genre as string | null) ?? null,
      location: (row.location as string | null) ?? null,
      tier: (row.tier as string) ?? "tentative",
      plan: (row.plan as string | null) ?? null,
      member_no: (row.member_no as number | null) ?? null,
      created_at: (row.created_at as string | null) ?? null,
    };
  });

  // 並び順：有料を上に → 有料内は会員番号順(No.1が上) → 非有料は登録順(新しい人が上)
  const tierRank = (t: string) =>
    t === "paid" ? 2 : t === "registered" ? 1 : 0;
  members.sort((a, b) => {
    const r = tierRank(b.tier) - tierRank(a.tier);
    if (r !== 0) return r;
    if (a.tier === "paid" && b.tier === "paid") {
      return (
        (a.member_no ?? Number.MAX_SAFE_INTEGER) -
        (b.member_no ?? Number.MAX_SAFE_INTEGER)
      );
    }
    // 非有料：登録順（新しい人が上＝created_at 降順）
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });

  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      {/* ヘッダー（mypage と同じトーン） */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10">
        <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.34em] text-[var(--gia-teal)] uppercase mb-2.5">
          Members ─── Directory
        </p>
        <h1
          className="text-[var(--gia-navy)] tracking-[0.04em] mb-2"
          style={{
            fontFamily: "'Noto Serif JP', serif",
            fontSize: "clamp(20px, 2.6vw, 26px)",
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          メンバー
        </h1>
        <p className="text-[13px] text-gray-500 leading-[1.95]">
          会員の方々のプロフィールから、紹介してほしい方を見つけられます。
        </p>
      </div>

      <MembersList members={members} errorMessage={error?.message ?? null} />
    </div>
  );
}
