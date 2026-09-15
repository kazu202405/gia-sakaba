// セミナー一覧（会員向け）。
// admin/seminars で管理している seminars のうち、募集中（is_active=true）かつ
// 今日以降の開催回を一覧表示し、その場で参加申込（event_attendees INSERT）できる。
//
// データソース:
//   - seminars（is_active=true, date>=今日）
//   - event_attendees（自分の申込状況：申込済み/参加確定の出し分け）
//
// 認証: 未ログインは /login へ。
// アーカイブ（過去回の録画）は次フェーズ（seminars に録画カラム追加が必要）。

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Inbox,
  Check,
  PlayCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ApplyButton } from "./_components/ApplyButton";

export const dynamic = "force-dynamic";

type EventType = "seminar" | "social" | "workshop" | "other";
type AttendanceStatus = "pending" | "approved" | "rejected" | "cancelled";

interface SeminarRow {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  capacity: number | null;
  event_type: EventType;
}

const eventTypeLabel: Record<EventType, string> = {
  seminar: "セミナー",
  social: "懇親会",
  workshop: "ワークショップ",
  other: "イベント",
};

function formatSeminarDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${weekdays[d.getDay()]})`;
}

function formatTime(time: string | null): string {
  return time ? time.slice(0, 5) : "";
}

function formatTimeRange(start: string | null, end: string | null): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} - ${e}`;
  return s;
}

export default async function SeminarsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 今日（ローカル）を YYYY-MM-DD で。date>=今日 の募集中セミナーを取得。
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [seminarsRes, attendancesRes] = await Promise.all([
    supabase
      .from("seminars")
      .select(
        "id, title, date, start_time, end_time, location, description, capacity, event_type",
      )
      .eq("is_active", true)
      .gte("date", todayStr)
      .order("date", { ascending: true }),
    supabase
      .from("event_attendees")
      .select("seminar_id, status")
      .eq("user_id", user.id),
  ]);

  const seminars = (seminarsRes.data ?? []) as SeminarRow[];
  const statusBySeminar = new Map<string, AttendanceStatus>();
  for (const a of (attendancesRes.data ?? []) as {
    seminar_id: string;
    status: AttendanceStatus;
  }[]) {
    statusBySeminar.set(a.seminar_id, a.status);
  }

  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      {/* ヘッダー */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10">
        <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.34em] text-[var(--gia-teal)] uppercase mb-2.5">
          Members ─── Seminars
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
          開催予定のセミナー・勉強会
        </h1>
        <p className="text-[13px] text-gray-500 leading-[1.95]">
          参加したい回の「参加を申し込む」から申込できます。
        </p>

        {/* 過去の勉強会への導線 */}
        <Link
          href="/members/app/seminars/archive"
          className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-medium text-[var(--gia-teal)] hover:underline"
        >
          <PlayCircle className="w-4 h-4" />
          過去の勉強会（録画）を見る
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 pb-16">
        {seminarsRes.error ? (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            セミナーの取得に失敗しました：{seminarsRes.error.message}
          </div>
        ) : seminars.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">
            {seminars.map((s) => {
              const status = statusBySeminar.get(s.id) ?? null;
              const applied = status === "pending" || status === "approved";
              return (
                <article
                  key={s.id}
                  className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04),0_8px_24px_-12px_rgba(15,31,51,0.06)] overflow-hidden"
                >
                  <div className="h-px bg-gradient-to-r from-[var(--gia-teal)]/0 via-[var(--gia-teal)]/40 to-[var(--gia-teal)]/0" />
                  <div className="p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] text-[10.5px] font-bold mb-2 tracking-[0.04em]">
                          {eventTypeLabel[s.event_type] ?? "イベント"}
                        </span>
                        <h2
                          className="text-[var(--gia-navy)] leading-snug tracking-[0.02em]"
                          style={{
                            fontFamily: "'Noto Serif JP', serif",
                            fontSize: "clamp(17px, 2.2vw, 20px)",
                            fontWeight: 500,
                          }}
                        >
                          {s.title}
                        </h2>
                      </div>
                    </div>

                    <dl className="space-y-2 text-[13px] text-gray-600 mb-5">
                      <div className="flex items-center gap-2.5">
                        <CalendarDays className="w-4 h-4 text-[var(--gia-teal)] flex-shrink-0" />
                        <span>{formatSeminarDate(s.date)}</span>
                      </div>
                      {(s.start_time || s.end_time) && (
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-[var(--gia-teal)] flex-shrink-0" />
                          <span>
                            {formatTimeRange(s.start_time, s.end_time)}
                          </span>
                        </div>
                      )}
                      {s.location && (
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-[var(--gia-teal)] flex-shrink-0 mt-0.5" />
                          <span>{s.location}</span>
                        </div>
                      )}
                      {typeof s.capacity === "number" && s.capacity > 0 && (
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-[var(--gia-teal)] flex-shrink-0" />
                          <span>定員 {s.capacity} 名</span>
                        </div>
                      )}
                    </dl>

                    {s.description && (
                      <p className="text-[13px] text-gray-500 leading-[1.9] mb-5 whitespace-pre-line">
                        {s.description}
                      </p>
                    )}

                    <div className="flex items-center justify-end pt-4 border-t border-[var(--gia-navy)]/6">
                      {applied ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] text-sm font-semibold border border-[var(--gia-teal)]/30">
                          <Check className="w-4 h-4" />
                          {status === "approved"
                            ? "参加確定"
                            : "申込済み（承認待ち）"}
                        </span>
                      ) : (
                        <ApplyButton seminarId={s.id} />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] py-14 px-6 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--gia-teal)]/8 mb-5">
        <Inbox className="w-6 h-6 text-[var(--gia-teal)]" strokeWidth={1.5} />
      </div>
      <p
        className="text-[15px] text-[var(--gia-navy)] mb-2 tracking-[0.03em]"
        style={{ fontFamily: "'Noto Serif JP', serif" }}
      >
        いま募集中のセミナーはありません
      </p>
      <p className="text-xs text-gray-500 leading-[1.9] font-[family-name:var(--font-mincho)]">
        次回の開催が決まりしだい、ここに表示されます。
      </p>
    </div>
  );
}
