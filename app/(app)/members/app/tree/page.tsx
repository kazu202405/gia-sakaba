// 紹介ツリー（Phase 2：実DB化 + admin 専用）。
// applicants.referrer_id を辿って紹介系統を可視化する。
//
// 公開範囲（network_app.md より）:
//   「人脈の線・裏の関係性は主催者だけが見られる」
//   → admin 専用。一般 paid メンバーは自分のチェーンを /profile/[id] で見られるため、
//     全体ツリーはここに集約する。
//
// 認証ガード:
//   - 未ログイン → /login
//   - admin 以外 → /members/app/mypage（dead UI を見せない）
//
// 構造:
//   referrer_id IS NULL のメンバーを root 候補とし、再帰的に children を描画する。
//   ループ防止のため Set で訪問済み id を管理。

import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface TreeNode {
  id: string;
  name: string;
  nickname: string | null;
  role_title: string | null;
  tier: string;
  referrer_id: string | null;
  children: TreeNode[];
}

export default async function TreePage() {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // admin チェック
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    redirect("/members/app/mypage");
  }

  // 全 applicants をフェッチ
  const { data, error } = await supabase
    .from("applicants")
    .select("id, name, nickname, role_title, tier, referrer_id")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--gia-warm-gray)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-6 sm:p-8">
          <h2 className="text-base font-bold text-gray-900 mb-2">
            読み込みエラー
          </h2>
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
      </div>
    );
  }

  // ツリー構築
  const rows = ((data ?? []) as unknown[]).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      name: (row.name as string) ?? "",
      nickname: (row.nickname as string | null) ?? null,
      role_title: (row.role_title as string | null) ?? null,
      tier: (row.tier as string) ?? "tentative",
      referrer_id: (row.referrer_id as string | null) ?? null,
    };
  });

  const byId = new Map<string, TreeNode>();
  rows.forEach((r) => {
    byId.set(r.id, { ...r, children: [] });
  });

  // 親子の紐付け（自己参照は無視、未知の referrer_id は root 化）
  const roots: TreeNode[] = [];
  const seen = new Set<string>();
  byId.forEach((node) => {
    if (
      node.referrer_id &&
      node.referrer_id !== node.id &&
      byId.has(node.referrer_id)
    ) {
      byId.get(node.referrer_id)!.children.push(node);
      seen.add(node.id);
    }
  });
  byId.forEach((node) => {
    if (!seen.has(node.id)) roots.push(node);
  });

  // 統計
  const totalCount = rows.length;
  const maxDepth = roots.length === 0 ? 0 : Math.max(...roots.map(depthOf));
  const referredCount = rows.filter(
    (r) => r.referrer_id && byId.has(r.referrer_id),
  ).length;
  const referredRatio =
    totalCount > 0 ? Math.round((referredCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      {/* ヘッダー */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10">
        <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.34em] text-[var(--gia-teal)] uppercase mb-2.5">
          Members ─── Referral Tree
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
          紹介ツリー
        </h1>
        <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-2">
          <Shield className="w-3.5 h-3.5 text-[var(--gia-gold)]" />
          <span>主催者専用ビュー</span>
        </div>
        <p className="text-[13px] text-gray-500 leading-[1.95]">
          誰が誰を紹介したか、関係性の全体像をご確認いただけます。
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 pb-16 space-y-8">
        {/* 統計 */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="メンバー数" value={String(totalCount)} />
          <Stat label="最大深度" value={String(maxDepth)} />
          <Stat label="紹介経由" value={`${referredRatio}%`} accent />
        </div>

        {/* ツリー */}
        <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] p-6 sm:p-8">
          {roots.length === 0 ? (
            <p className="text-sm text-gray-500 leading-[1.95] text-center py-10 font-[family-name:var(--font-mincho)]">
              メンバーがまだ登録されていません。
            </p>
          ) : (
            <ul className="space-y-2">
              {roots.map((node) => (
                <TreeNodeRow key={node.id} node={node} depth={0} />
              ))}
            </ul>
          )}
        </div>

        {/* 凡例 */}
        <div className="flex flex-wrap items-center gap-5 text-[11px] text-gray-400 px-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--gia-navy)] border-2 border-[var(--gia-navy)]/30" />
            <span>紹介起点</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--gia-teal)] border-2 border-[var(--gia-teal)]/30" />
            <span>紹介で参加</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-[var(--gia-teal)]" />
            <span>本会員</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ヘルパ：ツリー最大深度 ─────────────────────────────────

function depthOf(node: TreeNode): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(depthOf));
}

// ─── サブコンポーネント：ノード1行（再帰） ───────────────────

function TreeNodeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const displayName = node.nickname?.trim() || node.name || "—";
  const sub = node.role_title?.trim() || "";
  const isRoot = depth === 0;
  const isPaid = node.tier === "paid";

  return (
    <li className="relative">
      <div className="flex items-start gap-3 py-1.5">
        {/* ドット */}
        <div className="relative flex flex-col items-center flex-shrink-0 mt-1.5">
          <div
            className={`w-2.5 h-2.5 rounded-full border-2 ${
              isRoot
                ? "bg-[var(--gia-navy)] border-[var(--gia-navy)]/30"
                : "bg-[var(--gia-teal)] border-[var(--gia-teal)]/30"
            }`}
          />
        </div>

        {/* カード */}
        <Link
          href={`/members/app/profile/${node.id}`}
          className="group inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-[var(--gia-navy)]/8 hover:border-[var(--gia-teal)]/40 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] font-bold text-xs border border-[var(--gia-teal)]/15 flex-shrink-0">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-medium text-[var(--gia-navy)] group-hover:text-[var(--gia-teal)] transition-colors truncate"
              style={{ fontFamily: "'Noto Serif JP', serif" }}
            >
              {displayName}
            </p>
            {sub && (
              <p className="text-[11px] text-gray-500 truncate">{sub}</p>
            )}
          </div>
          {isPaid && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] border border-[var(--gia-teal)]/30 text-[9px] font-bold tracking-[0.03em] flex-shrink-0">
              本
            </span>
          )}
        </Link>
      </div>

      {/* 子ノード */}
      {node.children.length > 0 && (
        <ul className="ml-[5px] pl-5 border-l-2 border-[var(--gia-teal)]/20 space-y-0">
          {node.children.map((child) => (
            <TreeNodeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── サブコンポーネント：統計タイル ───────────────────

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] p-4 text-center">
      <p
        className={`text-2xl font-medium ${
          accent ? "text-[var(--gia-gold)]" : "text-[var(--gia-navy)]"
        }`}
        style={{ fontFamily: "'Noto Serif JP', serif" }}
      >
        {value}
      </p>
      <p className="text-[10px] text-gray-500 mt-1 tracking-[0.18em] uppercase">
        {label}
      </p>
    </div>
  );
}
