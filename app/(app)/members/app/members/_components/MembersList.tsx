"use client";

// メンバー一覧の検索/絞り込み UI（Client Component）。
// 表示データそのものは Server Component で applicants から取得済みで、
// ここではクライアント側フィルタのみ行う。
//
// 設計判断:
//   - 検索は name / nickname / role_title / job_title / headline / services_summary
//     / genre / location の部分一致（2026-05-11: genre / location 追加）
//   - 写真は applicants.photo_url（Supabase Storage profile-photos バケット）

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Search, Tag } from "lucide-react";

export interface MemberItem {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  role_title: string | null;
  job_title: string | null;
  headline: string | null;
  services_summary: string | null;
  genre: string | null;
  location: string | null;
  tier: string;
  plan: string | null;
  member_no: number | null;
  created_at: string | null;
}

interface MembersListProps {
  members: MemberItem[];
  errorMessage: string | null;
}

export function MembersList({ members, errorMessage }: MembersListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const haystack = [
        m.name,
        m.nickname,
        m.role_title,
        m.job_title,
        m.headline,
        m.services_summary,
        m.genre,
        m.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, query]);

  return (
    <>
      {/* 検索バー */}
      <div className="sticky top-0 z-10 bg-[var(--gia-warm-gray)]/85 backdrop-blur-sm border-b border-[var(--gia-navy)]/8">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 py-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="名前・肩書き・ジャンル・拠点で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[var(--gia-navy)]/15 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--gia-navy)]/30 focus:border-transparent"
            />
          </div>
          <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.28em] text-gray-500 uppercase mt-3">
            {String(filtered.length).padStart(2, "0")}{" "}
            {filtered.length === 1 ? "Member" : "Members"}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {errorMessage && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            メンバー情報の取得に失敗しました：{errorMessage}
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState hasQuery={query.trim().length > 0} />
        ) : (
          <ul className="space-y-3">
            {filtered.map((member) => (
              <li key={member.id}>
                <MemberCard member={member} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function MemberCard({ member }: { member: MemberItem }) {
  const displayName = member.nickname?.trim() || member.name || "—";
  const subInfo =
    member.role_title?.trim() ||
    member.job_title?.trim() ||
    member.headline?.trim() ||
    "";
  // plan で本会員(pro)/サロン会員(salon)を出し分け。未課金はバッジなし。
  const planBadge =
    member.plan === "pro"
      ? "本会員"
      : member.tier === "paid"
        ? "一般会員"
        : null;
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <Link
      href={`/members/app/profile/${member.id}`}
      className="group flex items-start gap-4 bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(15,31,51,0.12)] hover:border-[var(--gia-navy)]/15 transition-all p-5"
    >
      {/* 写真 or イニシャル円 */}
      {member.photo_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={member.photo_url}
          alt={`${displayName} のプロフィール写真`}
          className="w-12 h-12 rounded-full object-cover bg-[var(--gia-teal)]/[0.04] border border-[var(--gia-teal)]/15 flex-shrink-0"
        />
      ) : (
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] font-bold text-base border border-[var(--gia-teal)]/15 flex-shrink-0">
          {initial}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3
            className="text-[15px] font-medium text-[var(--gia-navy)] truncate group-hover:text-[var(--gia-teal)] transition-colors"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            {displayName}
          </h3>
          {planBadge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] border border-[var(--gia-teal)]/30 tracking-[0.03em]">
              {planBadge}
            </span>
          )}
          {member.member_no != null && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--gia-navy)]/[0.06] text-[var(--gia-navy)] border border-[var(--gia-navy)]/15 tracking-[0.03em]">
              No.{member.member_no}
            </span>
          )}
        </div>
        {subInfo && (
          <p className="text-xs text-gray-500 leading-[1.85] truncate">
            {subInfo}
          </p>
        )}
        {member.headline && member.headline.trim() !== subInfo && (
          <p className="text-xs text-gray-400 leading-[1.85] mt-1 truncate">
            {member.headline}
          </p>
        )}
        {/* ジャンル / 拠点（入力済みのみ） */}
        {(member.genre || member.location) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {member.genre && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                <Tag className="w-2.5 h-2.5 text-[var(--gia-teal)]/70" />
                {member.genre}
              </span>
            )}
            {member.location && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                <MapPin className="w-2.5 h-2.5 text-[var(--gia-teal)]/70" />
                {member.location}
              </span>
            )}
          </div>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--gia-teal)] transition-colors flex-shrink-0 mt-1" />
    </Link>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-gray-500 leading-[1.95] font-[family-name:var(--font-mincho)]">
        {hasQuery
          ? "該当するメンバーが見つかりません。検索条件を変えてお試しください。"
          : "メンバーがまだ登録されていません。"}
      </p>
    </div>
  );
}
