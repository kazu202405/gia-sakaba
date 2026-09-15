// 過去の勉強会（会員向け）。
// 過去回（date<今日）のうち「録画(YouTube) または 公開資料がある」回を表示。
//   - 録画: seminars.recording_url を埋め込み再生
//   - 資料: seminar_materials（公開済み）。ファイルは private バケットを service_role の
//           署名URL（1時間）で配信、URL資料は外部リンク。
// 動画ファイルは自前で持たず YouTube 任せ＝最軽量。
// 認証: 未ログインは /login へ。会員でなければ /plans へ（講義録画は
//       オンライン会員以上の特典。特典に書いてあるものは必ずゲートする）。

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Inbox,
  CalendarClock,
  FileText,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isActiveMember } from "@/lib/membership/plans";

export const dynamic = "force-dynamic";

type EventType = "seminar" | "social" | "workshop" | "other";

interface ArchiveRow {
  id: string;
  title: string;
  date: string;
  description: string | null;
  recording_url: string | null;
  event_type: EventType;
}

interface RawMaterial {
  id: string;
  seminar_id: string;
  kind: "file" | "url";
  title: string;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
  url: string | null;
}

interface MaterialItem {
  id: string;
  kind: "file" | "url";
  title: string;
  description: string | null;
  href: string;
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

/** YouTube の watch?v= / youtu.be / shorts URL から埋め込み用 URL を作る。失敗時は null。 */
function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.slice(1);
    } else if (u.pathname.startsWith("/embed/")) {
      id = u.pathname.split("/embed/")[1] ?? "";
    } else if (u.pathname.startsWith("/shorts/")) {
      id = u.pathname.split("/shorts/")[1] ?? "";
    } else {
      id = u.searchParams.get("v") ?? "";
    }
    id = id.split("/")[0].split("?")[0];
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
}

export default async function SeminarArchivePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 講義録画は会員（オンライン以上）の特典。/plans と /upgrade に
  // 「オンライン ¥4,980 ＝ Company Note ＋ 講義録画」と書いてあるのに、
  // ここはログインさえしていれば誰でも見られる状態だった＝無料会員に
  // 特典が開放されていた。判定は lib/membership/plans.ts に集約している。
  const { data: applicant } = await supabase
    .from("applicants")
    .select("plan, tier")
    .eq("id", user.id)
    .single();

  if (!isActiveMember(applicant)) {
    // 会員でない人はプランの説明へ。マイページに飛ばすと
    // 「なぜ見られないのか」が分からないまま終わる。
    redirect("/plans");
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("seminars")
    .select("id, title, date, description, recording_url, event_type")
    .lt("date", todayStr)
    .order("date", { ascending: false });

  const allPast = (data ?? []) as ArchiveRow[];

  // 公開資料を取得（RLS: authenticated は is_published のみ閲覧可）
  const materialsBySeminar = new Map<string, MaterialItem[]>();
  const seminarIds = allPast.map((s) => s.id);
  if (seminarIds.length > 0) {
    const { data: matData } = await supabase
      .from("seminar_materials")
      .select(
        "id, seminar_id, kind, title, description, file_path, file_name, url",
      )
      .in("seminar_id", seminarIds)
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    // ファイルは会員限定のため service_role で署名URL（1時間）を発行
    let admin: ReturnType<typeof createAdminClient> | null = null;
    for (const row of (matData ?? []) as RawMaterial[]) {
      let href = row.url ?? "";
      if (row.kind === "file" && row.file_path) {
        try {
          if (!admin) admin = createAdminClient();
          const { data: signed } = await admin.storage
            .from("seminar-materials")
            .createSignedUrl(row.file_path, 60 * 60);
          href = signed?.signedUrl ?? "";
        } catch {
          href = "";
        }
      }
      const arr = materialsBySeminar.get(row.seminar_id) ?? [];
      arr.push({
        id: row.id,
        kind: row.kind,
        title: row.title,
        description: row.description,
        href,
      });
      materialsBySeminar.set(row.seminar_id, arr);
    }
  }

  // 録画 or 公開資料がある回だけ表示
  const rows = allPast.filter(
    (s) => s.recording_url || (materialsBySeminar.get(s.id)?.length ?? 0) > 0,
  );

  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10">
        <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.34em] text-[var(--gia-teal)] uppercase mb-2.5">
          Members ─── Library
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
          過去の勉強会
        </h1>
        <p className="text-[13px] text-gray-500 leading-[1.95]">
          参加できなかった回も、ここから録画と資料で学べます。
        </p>

        <Link
          href="/members/app/seminars"
          className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-medium text-[var(--gia-teal)] hover:underline"
        >
          <CalendarClock className="w-4 h-4" />
          開催予定のセミナーを見る
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 pb-16">
        {error ? (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            過去の勉強会の取得に失敗しました：{error.message}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {rows.map((s) => {
              const embed = s.recording_url
                ? toYouTubeEmbed(s.recording_url)
                : null;
              const mats = materialsBySeminar.get(s.id) ?? [];
              return (
                <article
                  key={s.id}
                  className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04),0_8px_24px_-12px_rgba(15,31,51,0.06)] overflow-hidden"
                >
                  {embed ? (
                    <div className="relative w-full aspect-video bg-black">
                      <iframe
                        src={embed}
                        title={s.title}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    s.recording_url && (
                      <a
                        href={s.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-6 py-4 bg-[var(--gia-navy)] text-white text-sm font-medium text-center hover:bg-[var(--gia-navy)]/90 transition-colors"
                      >
                        録画を見る（外部リンク）
                      </a>
                    )
                  )}

                  <div className="p-6 sm:p-7">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] text-[10.5px] font-bold mb-2 tracking-[0.04em]">
                      {eventTypeLabel[s.event_type] ?? "イベント"}
                    </span>
                    <h2
                      className="text-[var(--gia-navy)] leading-snug tracking-[0.02em] mb-3"
                      style={{
                        fontFamily: "'Noto Serif JP', serif",
                        fontSize: "clamp(17px, 2.2vw, 20px)",
                        fontWeight: 500,
                      }}
                    >
                      {s.title}
                    </h2>
                    <div className="flex items-center gap-2.5 text-[13px] text-gray-500 mb-3">
                      <CalendarDays className="w-4 h-4 text-[var(--gia-teal)] flex-shrink-0" />
                      <span>{formatSeminarDate(s.date)}</span>
                    </div>
                    {s.description && (
                      <p className="text-[13px] text-gray-500 leading-[1.9] whitespace-pre-line">
                        {s.description}
                      </p>
                    )}

                    {/* 資料 */}
                    {mats.length > 0 && (
                      <div className="mt-5 pt-5 border-t border-[var(--gia-navy)]/6">
                        <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.28em] text-[var(--gia-navy)]/60 uppercase mb-3">
                          Materials
                        </p>
                        <ul className="space-y-2">
                          {mats.map((m) => (
                            <li key={m.id}>
                              <a
                                href={m.href || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-[var(--gia-navy)]/10 hover:border-[var(--gia-teal)]/40 hover:bg-[var(--gia-teal)]/[0.03] transition-colors ${
                                  m.href ? "" : "pointer-events-none opacity-50"
                                }`}
                              >
                                <span className="mt-0.5 text-[var(--gia-teal)] flex-shrink-0">
                                  {m.kind === "file" ? (
                                    <FileText className="w-4 h-4" />
                                  ) : (
                                    <LinkIcon className="w-4 h-4" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-medium text-[var(--gia-navy)]">
                                    {m.title}
                                  </span>
                                  {m.description && (
                                    <span className="block text-xs text-gray-500 leading-[1.7]">
                                      {m.description}
                                    </span>
                                  )}
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-1" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
        まだ過去の勉強会の動画はありません
      </p>
      <p className="text-xs text-gray-500 leading-[1.9] font-[family-name:var(--font-mincho)]">
        開催した回の録画・資料が、順次ここに追加されます。
      </p>
    </div>
  );
}
