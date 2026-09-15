// マイページ（Phase 1：実DB化）。
// 仮登録（Tier 1）ユーザーが「自分の申込状況」と「同イベント参加者」を確認できる画面。
//
// データソース:
//   - applicants（自分の名前 / nickname / email）
//   - event_attendees ← seminars join（自分の申込済みイベント）
//   - event_peers view（同 seminar_id の他参加者の限定情報）
//
// 認証:
//   middleware の認証ガードは現状 /admin 配下のみ。
//   ここでは念のため getUser() が null なら /login にリダイレクトする。
//
// レンダリング戦略:
//   Server Component。初回 fetch のみで完結し、ローディング状態を持たない。
//   エラー時は専用バナー JSX を return。
//
// 本登録UI（profile-sheet.bak）と全メンバー一覧は Phase 2（5/26 後）の対象外。
//
// ビジュアルトーン:
//   GIAブランド（Navy基準＋Tealアクセント、Noto Serif JP見出し）。
//   Editorial格式と shadcn/Linear 風の機能性を併存させる。

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Clock,
  Inbox,
  MapPin,
  MessageCircle,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfilePreview } from "./_components/ProfilePreview";
import { buildProfilePreviewData } from "./_components/profileData";
import { MyReferralLinks } from "./_components/MyReferralLinks";
import { PublishSettingsCard } from "./_components/PublishSettingsCard";
import { ProfileStatusCard } from "./_components/ProfileStatusCard";
import {
  PROFILE_REQUIRED_FIELDS,
  computeProfileCompleteness,
  type ProfileRequiredField,
} from "@/lib/profile-completeness";

// 完成度カードの「あと残ってる項目」表示用ラベル（DBカラム名 → 日本語）
const PROFILE_FIELD_LABELS: Record<ProfileRequiredField, string> = {
  name: "お名前",
  name_furigana: "フリガナ",
  nickname: "ニックネーム",
  status_message: "ステータスメッセージ",
  photo_url: "プロフィール写真",
  role_title: "役職",
  job_title: "職種・専門",
  headline: "一言（何をしている人）",
  services_summary: "サービス内容",
  genre: "ジャンル",
  location: "拠点",
  story_origin: "始めたきっかけ",
  story_turning_point: "転機",
  story_now: "今の想い",
  story_future: "これからやりたいこと",
  want_to_connect_with: "つながりたい人",
  favorites: "好きなもの",
  current_hobby: "最近ハマってること",
  school_days_self: "学生時代の自分",
  personal_values: "大切にしていること",
  contact_line: "LINE",
  contact_instagram: "Instagram",
  contact_website: "Webサイト",
};

// ─── 型 ────────────────────────────────────────────────────────────

type AttendanceStatus = "pending" | "approved" | "rejected" | "cancelled";

interface MyApplicant {
  id: string;
  name: string;
  name_furigana: string | null;
  nickname: string | null;
  email: string | null;
}

interface MyAttendance {
  id: string;
  status: AttendanceStatus;
  applied_at: string;
  invite_code: string | null;
  seminar: {
    id: string;
    slug: string;
    title: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    line_group_url: string | null;
  } | null;
}

interface EventPeer {
  id: string;
  name: string;
  name_furigana: string | null;
  nickname: string | null;
  role_title: string | null;
  job_title: string | null;
  headline: string | null;
  seminar_id: string;
  attendance_status: AttendanceStatus;
  applied_at: string;
}

// ─── ステータス表示設定 ─────────────────────────────────────────────

const statusBadge: Record<
  AttendanceStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "主催者からの承認待ち",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "参加確定",
    className:
      "bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] border-[var(--gia-teal)]/30",
  },
  rejected: {
    label: "却下されました",
    className: "bg-gray-50 text-gray-400 border-gray-200",
  },
  cancelled: {
    label: "キャンセル",
    className: "bg-gray-50 text-gray-400 border-gray-200",
  },
};

// ─── ユーティリティ：日付・時刻フォーマット ─────────────────────────

function formatSeminarDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${weekdays[d.getDay()]})`;
}

/** "HH:MM:SS" → "HH:MM" */
function formatTime(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

/** "20:00" + "21:30" → "20:00 - 21:30" / 開始のみ "20:00" */
function formatTimeRange(start: string | null, end: string | null): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} - ${e}`;
  return s;
}

// ─── ページ本体 ────────────────────────────────────────────────────

export default async function MyPage() {
  const supabase = await createClient();

  // 1. 自分の auth user を取得（未ログインなら /login へ）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. データ取得を並列実行
  const [applicantRes, attendancesRes, peersRes] =
    await Promise.all([
      supabase
        .from("applicants")
        .select(
          "id, name, name_furigana, nickname, tier, plan, member_no, " +
            "photo_url, genre, location, " +
            "role_title, job_title, headline, services_summary, " +
            "story_origin, story_turning_point, story_now, story_future, " +
            "want_to_connect_with, " +
            "status_message, favorites, current_hobby, school_days_self, personal_values, " +
            "contact_line, contact_instagram, contact_website, " +
            "profile_published, name_public",
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("event_attendees")
        .select(
          `
        id, status, applied_at, invite_code,
        seminar:seminars(
          id, slug, title, date, start_time, end_time,
          location, line_group_url
        )
        `,
        )
        .eq("user_id", user.id)
        .order("applied_at", { ascending: false }),
      supabase
        .from("event_peers")
        .select(
          "id, name, name_furigana, nickname, role_title, job_title, headline, seminar_id, attendance_status, applied_at",
        )
        .neq("id", user.id),
    ]);

  // 3. fatal なエラー（applicants と attendances の両方失敗）はエラー画面
  const fatalError =
    applicantRes.error && attendancesRes.error
      ? `${applicantRes.error.message} / ${attendancesRes.error.message}`
      : null;

  if (fatalError) {
    return <ErrorState message={fatalError} />;
  }

  // Supabase の型推論が select 文の都合で GenericStringError と union になり、
  // applicantRes.data がトルージーでも id 等のプロパティが見えなくなるため、
  // ここで一度 Record にキャストして以降同じ参照で使い回す。
  const applicantRow =
    (applicantRes.data as Record<string, unknown> | null) ?? null;

  const me: MyApplicant = applicantRow
    ? {
        id: applicantRow.id as string,
        name: (applicantRow.name as string) ?? "",
        name_furigana:
          (applicantRow.name_furigana as string | null) ?? null,
        nickname: (applicantRow.nickname as string | null) ?? null,
        email: user.email ?? null,
      }
    : {
        id: user.id,
        name: "",
        name_furigana: null,
        nickname: null,
        email: user.email ?? null,
      };

  const attendances: MyAttendance[] = (attendancesRes.data ?? []).map(
    (r: unknown) => {
      const row = r as Record<string, unknown>;
      const seminar = Array.isArray(row.seminar)
        ? (row.seminar[0] ?? null)
        : (row.seminar ?? null);
      return {
        id: row.id as string,
        status: row.status as AttendanceStatus,
        applied_at: row.applied_at as string,
        invite_code: (row.invite_code as string | null) ?? null,
        seminar: seminar as MyAttendance["seminar"],
      };
    },
  );

  const peers: EventPeer[] = (peersRes.data ?? []) as EventPeer[];

  const previewData = buildProfilePreviewData(applicantRow);

  // ─── プロフィール完成度（ProfileStatusCard 用） ──────────────
  // applicantRow から 23項目を pluck して computeProfileCompleteness に渡す。
  // 未入力カラムは label に変換して missingFieldLabels として保持。
  const requiredPartial = PROFILE_REQUIRED_FIELDS.reduce(
    (acc, key) => {
      acc[key] = (applicantRow?.[key] as string | null | undefined) ?? null;
      return acc;
    },
    {} as Partial<Record<ProfileRequiredField, string | null | undefined>>,
  );
  const completeness = computeProfileCompleteness(requiredPartial);
  const missingFieldLabels = PROFILE_REQUIRED_FIELDS.filter((key) => {
    const v = requiredPartial[key];
    return !(typeof v === "string" && v.trim().length > 0);
  }).map((key) => PROFILE_FIELD_LABELS[key]);
  const currentTier = (applicantRow?.tier as string | null) ?? "tentative";
  const currentPlan = (applicantRow?.plan as string | null) ?? null;
  const currentMemberNo =
    (applicantRow?.member_no as number | null | undefined) ?? null;

  // ─── ウェルカム帯用のサマリー ──────────────────────────────
  // 表示する文言は「N件お申込中 + 直近セミナーまで残りX日」の事実ベースで組む。
  // 直近セミナー = pending/approved かつ 今日以降の seminar.date のうち最も近い1件。
  const displayName =
    me.nickname?.trim() || me.name?.trim() || "ゲスト";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingAttendances = attendances
    .filter(
      (a) =>
        (a.status === "pending" || a.status === "approved") &&
        a.seminar &&
        new Date(a.seminar.date).getTime() >= today.getTime(),
    )
    .sort(
      (a, b) =>
        new Date(a.seminar!.date).getTime() -
        new Date(b.seminar!.date).getTime(),
    );
  const upcomingCount = upcomingAttendances.length;
  const nextSeminar = upcomingAttendances[0]?.seminar ?? null;

  const heroSummary = (() => {
    if (upcomingCount === 0 || !nextSeminar) return "";
    const d = new Date(nextSeminar.date);
    const md = `${d.getMonth() + 1}/${d.getDate()}`;
    const daysUntil = Math.ceil(
      (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil === 0) {
      return `${upcomingCount}件のセミナーにお申込中。${md}は本日です。`;
    }
    return `${upcomingCount}件のセミナーにお申込中。${md}まで、あと${daysUntil}日。`;
  })();

  // ─── レンダリング ──────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      {/* ─── Welcome（控えめな挨拶。Navy帯はサイドバーと喧嘩するので置かない） ─── */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10">
        <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.34em] text-[var(--gia-teal)] uppercase mb-2.5">
          Members ─── Mypage
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
          いらっしゃい、{displayName}さん。
        </h1>
        {heroSummary && (
          <p className="text-[13px] text-gray-500 leading-[1.95]">
            {heroSummary}
          </p>
        )}
      </div>

      {/* ─── メインコンテンツ ────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 pb-16">
        {/* peers エラー時の軽量警告 */}
        {peersRes.error && (
          <div className="mb-8 flex items-start gap-2 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              他の参加者情報の取得に失敗しました：{peersRes.error.message}
            </span>
          </div>
        )}

        {/* ─── ステータス（tier × 完成度 × 動機作り） ─── */}
        <section className="mb-10">
          <ProfileStatusCard
            tier={currentTier}
            plan={currentPlan}
            memberNo={currentMemberNo}
            completeness={completeness}
            missingFieldLabels={missingFieldLabels}
          />
        </section>

        {/* ─── プロフィールセクション ─── */}
        <section className="mb-12">
          <SectionHeader
            eyebrow="Story"
            title="あなたのストーリー"
            right={
              <Link
                href="/members/app/mypage/edit"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-[var(--gia-navy)]/15 bg-white text-xs font-medium text-[var(--gia-navy)] hover:bg-white/70 hover:border-[var(--gia-navy)]/30 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                編集
              </Link>
            }
          />
          <ProfilePreview
            data={previewData}
            emptyHint={
              "プロフィールはまだ未入力です。\n「編集」から書き始めましょう。"
            }
          />
        </section>

        {/* 紹介設計セクションはテラこや一本化に伴い撤去（紹介コーチ廃止）。 */}

        {/* ─── 公開ページ（社長インタビュー・全会員が本人 opt-in で公開） ─── */}
        <section className="mb-12">
          <SectionHeader eyebrow="Public Page" title="公開ページ" />
          <PublishSettingsCard
            userId={me.id}
            initialPublished={
              (applicantRow?.profile_published as boolean | null) ?? false
            }
            initialNamePublic={
              (applicantRow?.name_public as boolean | null) ?? false
            }
            name={me.name}
            nickname={me.nickname ?? ""}
          />
        </section>

        {/* ─── 紹介リンク発行（paid 会員のみ） ─── */}
        {(applicantRow?.tier as string | null) === "paid" && (
          <section className="mb-12">
            <SectionHeader eyebrow="Referral Links" title="紹介リンク" />
            <MyReferralLinks userId={user.id} />
          </section>
        )}

        {/* ─── お申込み済みのイベント ─── */}
        <section>
          <SectionHeader
            eyebrow="Upcoming"
            title="お申込みのセミナー"
            right={
              attendances.length > 0 ? (
                <span className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.28em] text-gray-500 uppercase">
                  {String(attendances.length).padStart(2, "0")}{" "}
                  {attendances.length === 1 ? "Event" : "Events"}
                </span>
              ) : null
            }
          />

          {attendances.length === 0 ? (
            <EmptyAttendances />
          ) : (
            <div className="space-y-5">
              {attendances.map((att) => {
                if (!att.seminar) return null;
                const peersOfThis = peers.filter(
                  (p) =>
                    p.seminar_id === att.seminar!.id &&
                    (p.attendance_status === "pending" ||
                      p.attendance_status === "approved"),
                );
                return (
                  <AttendanceCard
                    key={att.id}
                    attendance={att}
                    peers={peersOfThis}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Phase 2 予告 ─── */}
        <section className="mt-14 pt-8 relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gia-gold)]/40 to-transparent" />
          <p className="text-[11.5px] text-gray-500 leading-[1.95] text-center font-[family-name:var(--font-mincho)] tracking-[0.04em]">
            本登録UI（プロフィール詳細入力）と全メンバー一覧は、
            <br className="sm:hidden" />
            5/26 セミナー後に順次追加予定です。
          </p>
        </section>
      </div>
    </div>
  );
}

// ─── サブコンポーネント：セクション見出し ───────────────────────────

function SectionHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.32em] text-[var(--gia-teal)] uppercase mb-1.5">
          {eyebrow}
        </p>
        <h2
          className="text-[var(--gia-navy)] tracking-[0.04em] font-medium"
          style={{
            fontFamily: "'Noto Serif JP', serif",
            fontSize: "clamp(17px, 2.2vw, 20px)",
          }}
        >
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

// ─── サブコンポーネント：申込カード ─────────────────────────────────

function AttendanceCard({
  attendance,
  peers,
}: {
  attendance: MyAttendance;
  peers: EventPeer[];
}) {
  const seminar = attendance.seminar!;
  const badge = statusBadge[attendance.status];
  const showLineButton =
    attendance.status === "approved" &&
    !!seminar.line_group_url &&
    seminar.line_group_url.trim().length > 0;

  return (
    <article className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04),0_8px_24px_-12px_rgba(15,31,51,0.06)] overflow-hidden">
      {/* 上端の極細tealアクセント */}
      <div className="h-px bg-gradient-to-r from-[var(--gia-teal)]/0 via-[var(--gia-teal)]/40 to-[var(--gia-teal)]/0" />

      {/* 上部：セミナー情報 */}
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h4
            className="text-[var(--gia-navy)] leading-snug tracking-[0.02em]"
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontSize: "clamp(17px, 2.2vw, 20px)",
              fontWeight: 500,
            }}
          >
            {seminar.title}
          </h4>
          <span
            className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold border tracking-[0.03em] ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <dl className="space-y-2 text-[13px] text-gray-600">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="w-4 h-4 text-[var(--gia-teal)] flex-shrink-0" />
            <span>{formatSeminarDate(seminar.date)}</span>
          </div>
          {(seminar.start_time || seminar.end_time) && (
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[var(--gia-teal)] flex-shrink-0" />
              <span>
                {formatTimeRange(seminar.start_time, seminar.end_time)}
              </span>
            </div>
          )}
          {seminar.location && (
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[var(--gia-teal)] flex-shrink-0 mt-0.5" />
              <span>{seminar.location}</span>
            </div>
          )}
        </dl>
      </div>

      {/* 下部：当日繋がる方々（=peers） */}
      <div className="px-6 sm:px-7 py-5 bg-[var(--gia-warm-gray)] border-t border-[var(--gia-navy)]/6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--gia-navy)]/70 uppercase">
            With You
          </p>
          {peers.length > 0 && (
            <span className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.18em] text-gray-400">
              {String(peers.length).padStart(2, "0")}
            </span>
          )}
        </div>

        {peers.length === 0 ? (
          <p className="text-xs text-gray-500 leading-[1.9] font-[family-name:var(--font-mincho)]">
            当日ご一緒する方々が、これから揃っていきます。
          </p>
        ) : (
          <ul className="space-y-2.5">
            {peers.map((p) => (
              <PeerRow key={p.id} peer={p} />
            ))}
          </ul>
        )}
      </div>

      {/* LINE グループボタン（approved + URL 有り の時のみ） */}
      {showLineButton && (
        <div className="px-6 sm:px-7 py-4 border-t border-[var(--gia-navy)]/6">
          <a
            href={seminar.line_group_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-navy)] hover:bg-[var(--gia-navy)]/90 text-white text-sm font-semibold py-3 px-5 transition-colors tracking-[0.02em]"
          >
            <MessageCircle className="w-4 h-4" />
            LINEグループに参加
          </a>
        </div>
      )}
    </article>
  );
}

// ─── サブコンポーネント：参加者1行 ─────────────────────────────────

function PeerRow({ peer }: { peer: EventPeer }) {
  const subInfo =
    peer.role_title?.trim() ||
    peer.job_title?.trim() ||
    peer.headline?.trim() ||
    null;

  const showNickname =
    peer.nickname &&
    peer.nickname.trim().length > 0 &&
    peer.nickname.trim() !== peer.name?.trim();

  const initial = (peer.name?.trim() || peer.nickname?.trim() || "?").charAt(0);

  return (
    <li className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gia-teal)]/15 to-[var(--gia-teal)]/5 border border-[var(--gia-teal)]/20 flex items-center justify-center text-[12px] font-semibold text-[var(--gia-teal)] flex-shrink-0">
        {initial}
      </div>
      <div className="min-w-0 flex-1 flex items-baseline flex-wrap gap-x-2 gap-y-0.5 text-sm">
        <span
          className="font-medium text-[var(--gia-navy)] tracking-[0.02em]"
          style={{ fontFamily: "'Noto Serif JP', serif" }}
        >
          {peer.name || "(名前未登録)"}
        </span>
        {showNickname && (
          <span className="text-[11px] text-gray-400">
            “{peer.nickname}”
          </span>
        )}
        {subInfo && (
          <span className="text-[11.5px] text-gray-500 truncate min-w-0">
            ／ {subInfo}
          </span>
        )}
      </div>
    </li>
  );
}

// ─── サブコンポーネント：空状態 ─────────────────────────────────────

function EmptyAttendances() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] py-14 px-6 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--gia-teal)]/8 mb-5">
        <Inbox
          className="w-6 h-6 text-[var(--gia-teal)]"
          strokeWidth={1.5}
        />
      </div>
      <p
        className="text-[15px] text-[var(--gia-navy)] mb-2 tracking-[0.03em]"
        style={{ fontFamily: "'Noto Serif JP', serif" }}
      >
        まだお申込みのセミナーはありません
      </p>
      <p className="text-xs text-gray-500 mb-6 leading-[1.9] font-[family-name:var(--font-mincho)]">
        これから出会う方々と、ここで揃いましょう。
      </p>
      <Link
        href="/join"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--gia-navy)] hover:bg-[var(--gia-navy)]/90 text-white text-sm font-semibold transition-colors tracking-[0.02em]"
      >
        セミナーに申込む
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ─── サブコンポーネント：エラー画面 ─────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10">
        <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.34em] text-[var(--gia-teal)] uppercase mb-2.5">
          Members ─── Mypage
        </p>
        <h1
          className="text-[var(--gia-navy)] tracking-[0.04em]"
          style={{
            fontFamily: "'Noto Serif JP', serif",
            fontSize: "clamp(20px, 2.6vw, 26px)",
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          データが取得できませんでした。
        </h1>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 pb-16">
        <div className="bg-white rounded-2xl border border-red-100 shadow-[0_1px_2px_rgba(15,31,51,0.04)] p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2
            className="text-[var(--gia-navy)] mb-3 tracking-[0.03em]"
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontSize: "17px",
              fontWeight: 500,
            }}
          >
            データ取得に失敗しました
          </h2>
          <p className="text-sm text-gray-600 mb-2 break-all">{message}</p>
          <p className="text-xs text-gray-400 mb-6">
            時間をおいて再度お試しください。
          </p>
          {/* Server Component なのでフルリロードによる再 fetch を意図的に使う。
              <Link> だと client side navigation になりデータが再取得されないため <a> を採用。 */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/members/app/mypage"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--gia-navy)] hover:bg-[var(--gia-navy)]/90 text-white text-sm font-semibold transition-colors tracking-[0.02em]"
          >
            <RefreshCw className="w-4 h-4" />
            再読み込み
          </a>
        </div>
      </div>
    </div>
  );
}
