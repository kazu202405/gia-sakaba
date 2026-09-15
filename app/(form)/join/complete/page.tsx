"use client";

// 仮登録（Tier 1）完了画面。
// セミナー申込のお礼 + 申込セミナー詳細 + LINE グループ招待 + 本登録誘導。
//
// Run 2（2026-04-27）: Supabase 接続化
// - URL クエリ ?seminar=<slug> から slug を取得
// - その slug で seminars テーブルを SELECT し、申込セミナーをカード表示
// - slug が無い／見つからない場合は generic な「お申込ありがとうございます」のみ表示
// - lib/seminars.ts への依存を解除（自前の formatSeminarDate を持つ）
// - useSearchParams + Supabase fetch のため client component 化
//
// metadata は client component なので親 layout 側に持たせる方針（既存 (main)/layout.tsx の親 metadata を継承）。

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  MessageCircle,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SeminarDetail {
  id: string;
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  line_group_url: string | null;
}

// ─── ユーティリティ：日付・時刻フォーマット ─────────────────────────
// lib/seminars.ts への依存解除のため自前で持つ
function formatSeminarDate(date: string): string {
  const d = new Date(date);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const wd = weekdays[d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${wd})`;
}

/** "HH:MM:SS" → "HH:MM" */
function formatTime(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

/** "20:00" + "21:30" → "20:00 - 21:30" / 開始のみ "20:00" */
function formatTimeRange(
  start: string | null,
  end: string | null
): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} - ${e}`;
  return s;
}

// ─── ページ本体 ─────────────────────────────────────────────────────

export default function JoinCompletePage() {
  return (
    <Suspense fallback={<CompletePageFallback />}>
      <JoinCompleteInner />
    </Suspense>
  );
}

function CompletePageFallback() {
  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--gia-deck-sub)]" />
      </div>
    </div>
  );
}

function JoinCompleteInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("seminar");

  const supabase = useMemo(() => createClient(), []);

  const [seminar, setSeminar] = useState<SeminarDetail | null>(null);
  // slug が無ければそもそも fetch しない＝最初から非ローディング
  const [loading, setLoading] = useState<boolean>(!!slug);

  useEffect(() => {
    if (!slug) return; // slug 無しは初期 state のままで終わり（setState を effect 内で呼ばない）
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("seminars")
        .select(
          "id, slug, title, date, start_time, end_time, location, description, line_group_url"
        )
        .eq("slug", slug)
        .single();
      if (cancelled) return;
      if (error || !data) {
        // 見つからなければ generic 表示にフォールバック
        console.warn("[/join/complete] seminar fetch failed:", error);
        setSeminar(null);
      } else {
        setSeminar(data as SeminarDetail);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, supabase]);

  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        {/* 完了見出し */}
        <header className="text-center mb-12">
          <ChapterTag>WELCOME</ChapterTag>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--gia-deck-gold)]/10 text-[var(--gia-deck-gold)] mt-6 mb-5 border border-[var(--gia-deck-gold)]/30">
            <CheckCircle2 className="w-7 h-7" strokeWidth={1.75} />
          </div>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4]">
            お申込ありがとうございます
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            登録いただいた内容で、仮登録が完了しました。
            <br className="hidden sm:block" />
            当日のご参加をお待ちしております。
          </p>
        </header>

        {/* セミナー fetch 中：ローディング表示（slug がある場合のみ） */}
        {loading && (
          <div className="mb-6 flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--gia-deck-sub)]" />
          </div>
        )}

        {/* 申込セミナーカード（取得成功時のみ表示・deck card.n を踏襲：左罫線 gold + 番号タグ） */}
        {!loading && seminar && (
          <section
            className="relative bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] p-7 sm:p-9 mb-6"
            style={{
              borderLeft: "3px solid var(--gia-deck-gold)",
            }}
          >
            {/* 上部の小タグ：「YOUR EVENT」 */}
            <div className="flex items-center gap-3 mb-5">
              <span
                aria-hidden
                className="inline-block w-5 h-px bg-[var(--gia-deck-gold)]"
              />
              <span className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em]">
                YOUR EVENT
              </span>
            </div>

            <h2 className="font-serif text-xl sm:text-[22px] font-bold text-[var(--gia-deck-navy)] leading-[1.5] mb-5 tracking-[0.03em]">
              {seminar.title}
            </h2>

            <div className="space-y-3 text-sm text-[var(--gia-deck-ink)]">
              <InfoRow icon={<Calendar className="w-4 h-4" />}>
                {formatSeminarDate(seminar.date)}
              </InfoRow>
              {(seminar.start_time || seminar.end_time) && (
                <InfoRow icon={<Clock className="w-4 h-4" />}>
                  {formatTimeRange(seminar.start_time, seminar.end_time)}
                </InfoRow>
              )}
              {seminar.location && (
                <InfoRow icon={<MapPin className="w-4 h-4" />}>
                  {seminar.location}
                </InfoRow>
              )}
            </div>

            {seminar.description && (
              <p className="text-sm text-[var(--gia-deck-sub)] leading-[1.9] mt-6 pt-5 border-t border-[var(--gia-deck-line)]">
                {seminar.description}
              </p>
            )}

            {/* LINE グループ招待ボタン（URL があれば実リンク、無ければ準備中表示） */}
            {seminar.line_group_url ? (
              <a
                href={seminar.line_group_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-3.5 px-5 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200"
              >
                <MessageCircle className="w-4 h-4" />
                LINEグループに参加する
              </a>
            ) : (
              <p className="mt-7 text-center text-[12px] text-[var(--gia-deck-sub)]">
                LINEグループは準備中です。後日ご案内いたします。
              </p>
            )}
          </section>
        )}

        {/* slug 無し or 見つからない場合の generic フォールバック */}
        {!loading && !seminar && (
          <section
            className="relative bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] p-7 sm:p-9 mb-6"
            style={{
              borderLeft: "3px solid var(--gia-deck-gold)",
            }}
          >
            <p className="text-sm text-[var(--gia-deck-ink)] leading-[1.9]">
              ご登録いただいたメールアドレス宛に、後日詳細をご案内いたします。
            </p>
          </section>
        )}

        {/* マイページへの誘導 */}
        <section className="bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] p-7 sm:p-9 mb-6">
          <SectionLabel>NEXT STEP</SectionLabel>
          <h3 className="font-serif text-lg font-bold text-[var(--gia-deck-navy)] leading-[1.5] mt-2 mb-5 tracking-[0.03em]">
            マイページで申込状況をご確認ください
          </h3>

          {/* 注記アラート（gold 淡背景） */}
          <div className="rounded-xl bg-[var(--gia-deck-gold)]/8 border border-[var(--gia-deck-gold)]/30 px-4 py-3.5 mb-6">
            <p className="text-[13px] text-[var(--gia-deck-ink)] leading-[1.85]">
              マイページで申込状況の確認や、同じ会に申込んだ他の方の名前を確認できます。
              <br />
              本登録UI（プロフィール詳細）と全メンバー一覧は、5/26 セミナー後に順次追加予定です。
            </p>
          </div>

          <Link
            href="/members/app/mypage"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-4 px-6 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200"
          >
            <LayoutDashboard className="w-4 h-4" />
            マイページで申込を確認
          </Link>
        </section>

        {/* トップに戻る */}
        <div className="text-center mt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--gia-deck-sub)] hover:text-[var(--gia-deck-navy)] transition-colors underline underline-offset-4 decoration-[var(--gia-deck-line)]"
          >
            トップに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-[var(--gia-deck-gold)] flex-shrink-0">
        {icon}
      </span>
      <span className="text-[var(--gia-deck-ink)]">{children}</span>
    </div>
  );
}

function ChapterTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
      <span
        aria-hidden
        className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]"
      />
      <span>{children}</span>
      <span
        aria-hidden
        className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em]">
      {children}
    </div>
  );
}
