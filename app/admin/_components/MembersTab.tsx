"use client";

// 全会員一覧タブ。
// applicants テーブルを起点に、紹介者・参加歴・tier を一覧化する。
// 申請ベースではなく「人」起点の閲覧画面。
//
// 集計:
//   - tier 別カウント（tentative / registered / paid）
//   - 各会員の参加履歴件数（event_attendees status='approved'）
//   - 紹介者名（referrer_name → 自由入力）
//
// CSV エクスポートも対応。

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Search,
  Loader2,
  Download,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  EditorialCard,
  FilterStatCard,
  tierStyle,
  type Tier,
} from "./EditorialChrome";
import { formatDate } from "./EditorialFormat";
import {
  computeProfileCompleteness,
  PROFILE_REQUIRED_FIELDS,
  type ProfileRequiredField,
} from "@/lib/profile-completeness";
import { MemberDetailExpansion } from "./MemberDetailExpansion";

type SortKey = "name" | "tier" | "attended" | "created";
type SortDir = "asc" | "desc";

// 会員の段の表示名。内部キー（online/real/...）は決済と紐づくので変えない。
// 表示名だけ後から変えられるようにここに置く。
// 株アプリ側の MEMBERSHIP_LABELS（app.py）と同じ内容にそろえること。
const PLAN_LABELS: Record<string, string> = {
  online: "オンライン",
  real: "リアル",
  invite: "ご招待",
  premium: "プレミアム",
  terakoya: "テラこや(旧)",
  salon: "サロン(旧)",
  pro: "本会員(旧)",
};

// tier の優先順位（paid > registered > tentative）
const tierRank: Record<Tier, number> = {
  tentative: 0,
  registered: 1,
  paid: 2,
};

export interface MemberRow {
  id: string;
  name: string;
  name_furigana: string | null;
  nickname: string | null;
  email: string | null;
  referrer_name: string | null;
  referrer_id: string | null;
  tier: Tier;
  // 会員の段（online/real/invite/premium、および過去の契約）。
  // tier とは別物。決済の webhook は plan だけを書き、tier は触らない
  // （tier='paid' にすると紹介リンク等コーチ機能が誤って開くため。migration 0076）。
  // ここを見ないと、有料会員が何人いるのか管理画面から分からない。
  plan: string | null;
  // 会員番号（有料会員で自動採番。管理画面で手動編集可）
  member_no: number | null;
  // 退会日時（null=在籍中 / 日時=退会中）
  withdrawn_at: string | null;
  job_title: string | null;
  headline: string | null;
  created_at: string;
  attended_count: number; // status='approved' の参加履歴件数
  applied_count: number; // すべての申込件数
  // Stripe
  stripe_customer_id: string | null;
  subscription_status: string | null;
  // 管理者メモ
  admin_notes: string | null;
  // 最終アクティビティ（最も新しい event_attendees.applied_at）
  last_applied_at: string | null;
  // プロフィール完成度（0-100、PROFILE_REQUIRED_FIELDS のうち入力済みカラム比率）
  completeness: number;
}

export function MembersTab() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");
  const [referrerFilter, setReferrerFilter] = useState<string>("all"); // "all" / "__none__" / 紹介者名
  const [dateFilter, setDateFilter] =
    useState<"all" | "this_month" | "30d" | "90d" | "this_year" | "custom">(
      "all",
    );
  const [dateCustomDays, setDateCustomDays] = useState<string>("7"); // string で持って空欄も許容
  const [activityFilter, setActivityFilter] =
    useState<"all" | "attended" | "applied_only" | "custom">("all");
  const [activityCustomMin, setActivityCustomMin] = useState<string>("3");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // 列ヘッダークリックで toggle。同じ列なら方向反転、違う列ならデフォルト方向。
  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // 名前は asc、それ以外は desc がデフォルト
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);

      // 1. applicants 全件
      // 完成度算出のため PROFILE_REQUIRED_FIELDS の全23カラムも取得する。
      // Supabase の型推論を効かせるため固定文字列で書く（動的連結だとパーサーが壊れる）。
      // 2026-05-11 photo_url / genre / location / status_message / favorites /
      //  current_hobby / school_days_self / personal_values / contact_line /
      //  contact_instagram / contact_website を追加（既存 select 漏れ + 0017 新規）
      const { data: applicants, error: aErr } = await supabase
        .from("applicants")
        .select(
          "id, name, name_furigana, nickname, email, referrer_name, referrer_id, tier, plan, member_no, withdrawn_at, job_title, headline, created_at, stripe_customer_id, subscription_status, admin_notes, role_title, services_summary, story_origin, story_turning_point, story_now, story_future, want_to_connect_with, status_message, photo_url, genre, location, favorites, current_hobby, school_days_self, personal_values, contact_line, contact_instagram, contact_website",
        )
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (aErr) {
        setLoadError(aErr.message);
        setRows([]);
        setLoading(false);
        return;
      }

      // 2. 各 applicant の参加件数 + 最終 applied_at
      const { data: attendees, error: bErr } = await supabase
        .from("event_attendees")
        .select("user_id, status, applied_at");

      if (cancelled) return;
      if (bErr) {
        setLoadError(bErr.message);
        setRows([]);
        setLoading(false);
        return;
      }

      const attCount = new Map<
        string,
        { applied: number; approved: number; lastAppliedAt: string | null }
      >();
      (attendees ?? []).forEach(
        (a: { user_id: string; status: string; applied_at: string | null }) => {
          const cur = attCount.get(a.user_id) ?? {
            applied: 0,
            approved: 0,
            lastAppliedAt: null,
          };
          cur.applied += 1;
          if (a.status === "approved") cur.approved += 1;
          if (
            a.applied_at &&
            (!cur.lastAppliedAt || a.applied_at > cur.lastAppliedAt)
          ) {
            cur.lastAppliedAt = a.applied_at;
          }
          attCount.set(a.user_id, cur);
        },
      );

      const merged: MemberRow[] = (applicants ?? []).map(
        (p: Record<string, unknown>) => {
          const c = attCount.get(p.id as string) ?? {
            applied: 0,
            approved: 0,
            lastAppliedAt: null,
          };
          // 完成度算出（PROFILE_REQUIRED_FIELDS のカラムから）
          const profilePartial: Partial<
            Record<ProfileRequiredField, string | null>
          > = {};
          for (const f of PROFILE_REQUIRED_FIELDS) {
            profilePartial[f] = (p[f] as string | null | undefined) ?? null;
          }
          const completeness = computeProfileCompleteness(profilePartial);
          return {
            id: p.id as string,
            name: (p.name as string) ?? "",
            name_furigana: (p.name_furigana as string | null) ?? null,
            nickname: (p.nickname as string | null) ?? null,
            email: (p.email as string | null) ?? null,
            referrer_name: (p.referrer_name as string | null) ?? null,
            referrer_id: (p.referrer_id as string | null) ?? null,
            tier: (p.tier as Tier) ?? "tentative",
            plan: (p.plan as string | null) ?? null,
            member_no: (p.member_no as number | null) ?? null,
            withdrawn_at: (p.withdrawn_at as string | null) ?? null,
            job_title: (p.job_title as string | null) ?? null,
            headline: (p.headline as string | null) ?? null,
            created_at: p.created_at as string,
            attended_count: c.approved,
            applied_count: c.applied,
            stripe_customer_id:
              (p.stripe_customer_id as string | null) ?? null,
            subscription_status:
              (p.subscription_status as string | null) ?? null,
            admin_notes: (p.admin_notes as string | null) ?? null,
            last_applied_at: c.lastAppliedAt,
            completeness,
          };
        },
      );
      setRows(merged);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const counts = useMemo(() => {
    return {
      total: rows.length,
      tentative: rows.filter((r) => r.tier === "tentative").length,
      registered: rows.filter((r) => r.tier === "registered").length,
      paid: rows.filter((r) => r.tier === "paid").length,
    };
  }, [rows]);

  // 会員の段ごとの人数。tier とは別に数える必要がある。
  // webhook は plan だけを書いて tier を触らないので、tier 別カウントは
  // 有料会員が何人いてもずっと 0 のままになる（実際にそうなっていた）。
  const planCounts = useMemo(() => {
    const count = (p: string) => rows.filter((r) => r.plan === p).length;
    return {
      online: count("online"),
      real: count("real"),
      invite: count("invite"),
      premium: count("premium"),
      // 過去の契約。新規では付与しないが、在籍者がいるので見えるようにする
      legacy: rows.filter(
        (r) => r.plan && ["terakoya", "salon", "pro"].includes(r.plan),
      ).length,
      // 課金している合計（＝ここが売上に直結する数字）
      paying: rows.filter((r) => r.plan && r.plan.length > 0).length,
    };
  }, [rows]);

  // 紹介者フィルタの選択肢（rows から空でない referrer_name を集計）
  const referrerOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const n = r.referrer_name?.trim();
      if (n && n.length > 0) set.add(n);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim();
    const now = new Date();
    const arr = rows.filter((r) => {
      const matchSearch =
        q.length === 0 ||
        r.name.includes(q) ||
        (r.name_furigana ?? "").includes(q) ||
        (r.email ?? "").includes(q) ||
        (r.referrer_name ?? "").includes(q);
      const matchTier = tierFilter === "all" || r.tier === tierFilter;

      // 紹介者
      const refName = r.referrer_name?.trim() ?? "";
      const matchReferrer =
        referrerFilter === "all" ||
        (referrerFilter === "__none__" && refName.length === 0) ||
        refName === referrerFilter;

      // 登録時期
      let matchDate = true;
      if (dateFilter !== "all") {
        const created = new Date(r.created_at);
        if (Number.isNaN(created.getTime())) {
          matchDate = false;
        } else if (dateFilter === "30d") {
          matchDate = (now.getTime() - created.getTime()) / 86400000 <= 30;
        } else if (dateFilter === "90d") {
          matchDate = (now.getTime() - created.getTime()) / 86400000 <= 90;
        } else if (dateFilter === "this_month") {
          matchDate =
            created.getFullYear() === now.getFullYear() &&
            created.getMonth() === now.getMonth();
        } else if (dateFilter === "this_year") {
          matchDate = created.getFullYear() === now.getFullYear();
        } else if (dateFilter === "custom") {
          const days = Number.parseInt(dateCustomDays, 10);
          if (Number.isNaN(days) || days <= 0) {
            matchDate = true; // 未入力時は絞り込まない
          } else {
            matchDate = (now.getTime() - created.getTime()) / 86400000 <= days;
          }
        }
      }

      // 参加状況
      let matchActivity = true;
      if (activityFilter === "attended") {
        matchActivity = r.attended_count >= 1;
      } else if (activityFilter === "applied_only") {
        matchActivity = r.attended_count === 0 && r.applied_count >= 1;
      } else if (activityFilter === "custom") {
        const min = Number.parseInt(activityCustomMin, 10);
        if (Number.isNaN(min) || min < 0) {
          matchActivity = true;
        } else {
          matchActivity = r.attended_count >= min;
        }
      }

      return (
        matchSearch &&
        matchTier &&
        matchReferrer &&
        matchDate &&
        matchActivity
      );
    });
    // ソート
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "ja") * dir;
        case "tier":
          return (tierRank[a.tier] - tierRank[b.tier]) * dir;
        case "attended":
          return (a.attended_count - b.attended_count) * dir;
        case "created":
        default:
          return a.created_at < b.created_at
            ? -1 * dir
            : a.created_at > b.created_at
              ? 1 * dir
              : 0;
      }
    });
    return arr;
  }, [
    rows,
    search,
    tierFilter,
    referrerFilter,
    dateFilter,
    dateCustomDays,
    activityFilter,
    activityCustomMin,
    sortKey,
    sortDir,
  ]);

  // 適用中フィルタ（チップ表示用）
  const dateLabelMap: Record<typeof dateFilter, string> = {
    all: "",
    this_month: "今月",
    "30d": "過去30日",
    "90d": "過去90日",
    this_year: "今年",
    custom: dateCustomDays ? `${dateCustomDays}日以内` : "カスタム",
  };
  const activityLabelMap: Record<typeof activityFilter, string> = {
    all: "",
    attended: "1回以上参加",
    applied_only: "申込のみ・未参加",
    custom: activityCustomMin ? `${activityCustomMin}回以上参加` : "カスタム",
  };
  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (referrerFilter !== "all") {
    activeFilters.push({
      key: "紹介者",
      label: referrerFilter === "__none__" ? "未指定" : referrerFilter,
      clear: () => setReferrerFilter("all"),
    });
  }
  if (dateFilter !== "all") {
    activeFilters.push({
      key: "登録時期",
      label: dateLabelMap[dateFilter],
      clear: () => setDateFilter("all"),
    });
  }
  if (activityFilter !== "all") {
    activeFilters.push({
      key: "参加状況",
      label: activityLabelMap[activityFilter],
      clear: () => setActivityFilter("all"),
    });
  }
  const clearAllFilters = () => {
    setReferrerFilter("all");
    setDateFilter("all");
    setActivityFilter("all");
  };

  const handleExportCsv = () => {
    const header = [
      "name",
      "furigana",
      "nickname",
      "email",
      "referrer",
      "tier",
      // 会員の段。名簿として使うとき、誰が課金中かはこの列でしか分からない
      "plan",
      "job_title",
      "headline",
      "applied_count",
      "attended_count",
      "registered_at",
    ];
    const escape = (v: string | number | null | undefined) =>
      v == null ? "" : `"${String(v).replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      lines.push(
        [
          escape(r.name),
          escape(r.name_furigana),
          escape(r.nickname),
          escape(r.email),
          escape(r.referrer_name),
          escape(r.tier),
          escape(r.plan),
          escape(r.job_title),
          escape(r.headline),
          escape(r.applied_count),
          escape(r.attended_count),
          escape(r.created_at),
        ].join(",")
      );
    });
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `members_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {loadError && (
        <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[#8a4538] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">データ取得エラー</p>
            <p className="mt-0.5 text-xs">{loadError}</p>
          </div>
        </div>
      )}

      {/* スタットカード（クリックで tier フィルタ切替） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <FilterStatCard
          label="全会員"
          count={counts.total}
          active={tierFilter === "all"}
          onClick={() => setTierFilter("all")}
        />
        <FilterStatCard
          label="仮会員"
          count={counts.tentative}
          active={tierFilter === "tentative"}
          onClick={() => setTierFilter("tentative")}
          dotColorClass={tierStyle.tentative.dotBg}
        />
        <FilterStatCard
          label="無料会員"
          count={counts.registered}
          active={tierFilter === "registered"}
          onClick={() => setTierFilter("registered")}
          dotColorClass={tierStyle.registered.dotBg}
        />
        <FilterStatCard
          label="有料会員"
          count={counts.paid}
          active={tierFilter === "paid"}
          onClick={() => setTierFilter("paid")}
          dotColorClass={tierStyle.paid.dotBg}
        />
      </div>

      {/* 会員の段（plan）別の人数。
          上の tier 別カウントとは別物。決済の webhook は plan だけを書いて
          tier を触らないため、tier で数えると有料会員がいても 0 のままになる。
          売上に直結するのはこちらの数字。 */}
      <div className="mb-6 rounded-xl border border-[#e6e9ee] bg-white p-4">
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-serif text-[10px] font-bold tracking-[0.18em] text-[#1c3550] uppercase">
            会員の段
          </p>
          <p className="text-[11px] text-gray-500">
            課金中 合計{" "}
            <span className="font-bold text-[#1c3550]">{planCounts.paying}</span> 名
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { key: "online", label: "オンライン", note: "¥4,980", n: planCounts.online },
            { key: "real", label: "リアル", note: "¥7,980", n: planCounts.real },
            { key: "invite", label: "ご招待", note: "¥11,000", n: planCounts.invite },
            { key: "premium", label: "プレミアム", note: "¥33,000", n: planCounts.premium },
            { key: "legacy", label: "旧プラン", note: "新規付与なし", n: planCounts.legacy },
          ].map((p) => (
            <div
              key={p.key}
              className="rounded-lg border border-[#eef1f5] bg-[#fbfcfd] px-3 py-2.5"
            >
              <p className="text-[10.5px] text-gray-500 leading-tight">{p.label}</p>
              <p className="text-[18px] font-bold text-[#1c3550] leading-tight mt-0.5">
                {p.n}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">{p.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 検索・CSV */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・フリガナ・メール・紹介者で検索..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
          />
        </div>
        <button
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-[#c08a3e] hover:text-[#8a5a1c] transition-all disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {/* フィルタバー：紹介者 / 登録時期 / 参加状況 */}
      <div className="bg-white border border-gray-200 rounded-md px-3 py-2.5 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] tracking-[0.22em] text-gray-500 uppercase font-semibold pr-1">
            Filters
          </span>
          <FilterSelect
            value={referrerFilter}
            onChange={setReferrerFilter}
            active={referrerFilter !== "all"}
          >
            <option value="all">紹介者：すべて</option>
            <option value="__none__">紹介者：未指定</option>
            {referrerOptions.map((name) => (
              <option key={name} value={name}>
                紹介者：{name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            value={dateFilter}
            onChange={(v) => setDateFilter(v as typeof dateFilter)}
            active={dateFilter !== "all"}
          >
            <option value="all">登録時期：全期間</option>
            <option value="this_month">登録時期：今月</option>
            <option value="30d">登録時期：過去30日</option>
            <option value="90d">登録時期：過去90日</option>
            <option value="this_year">登録時期：今年</option>
            <option value="custom">登録時期：カスタム（日数指定）</option>
          </FilterSelect>
          {dateFilter === "custom" && (
            <NumericInline
              prefix="登録から"
              suffix="日以内"
              value={dateCustomDays}
              onChange={setDateCustomDays}
              min={1}
              max={3650}
            />
          )}
          <FilterSelect
            value={activityFilter}
            onChange={(v) => setActivityFilter(v as typeof activityFilter)}
            active={activityFilter !== "all"}
          >
            <option value="all">参加状況：すべて</option>
            <option value="attended">参加状況：1回以上参加</option>
            <option value="applied_only">参加状況：申込のみ・未参加</option>
            <option value="custom">参加状況：カスタム（回数指定）</option>
          </FilterSelect>
          {activityFilter === "custom" && (
            <NumericInline
              prefix="参加"
              suffix="回以上"
              value={activityCustomMin}
              onChange={setActivityCustomMin}
              min={0}
              max={999}
            />
          )}
          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-[#8a5a1c] hover:bg-[#fbf3e3] px-2 py-1 rounded-md transition-colors"
            >
              <X className="w-3 h-3" />
              クリア
            </button>
          )}
        </div>
      </div>

      {/* 適用中フィルタのチップ */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {activeFilters.map((f) => (
            <span
              key={`${f.key}-${f.label}`}
              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-[11px] font-bold bg-[#1c3550] text-white"
            >
              <span className="text-[9px] tracking-[0.18em] opacity-70 uppercase">
                {f.key}
              </span>
              <span>{f.label}</span>
              <button
                type="button"
                onClick={f.clear}
                aria-label={`${f.key}フィルタを解除`}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <span className="inline-flex items-center text-[11px] text-gray-500 px-2">
            {filtered.length} / {rows.length} 人
          </span>
        </div>
      )}

      {loading && (
        <EditorialCard className="text-center py-16">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">読み込み中...</p>
        </EditorialCard>
      )}

      {!loading && (
        <>
          {filtered.length === 0 ? (
            <EditorialCard className="text-center py-16">
              <p className="text-sm text-gray-400">
                該当する会員はいません
              </p>
            </EditorialCard>
          ) : (
            <div className="bg-white border border-gray-200 rounded-md overflow-hidden relative">
              {/* 上辺ゴールド線（Editorial アクセント） */}
              <div
                aria-hidden
                className="absolute top-0 left-0 h-[2px] w-16 bg-[#c08a3e] z-10"
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1c3550]">
                      <SortHeader
                        label="Name"
                        sortKey="name"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onClick={toggleSort}
                        className="w-[28%]"
                      />
                      <SortHeader
                        label="Tier"
                        sortKey="tier"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onClick={toggleSort}
                        className="w-[12%]"
                      />
                      <th className="px-4 py-3 text-left font-serif text-[10px] font-bold tracking-[0.18em] text-[#1c3550] uppercase w-[18%]">
                        Referrer
                      </th>
                      <SortHeader
                        label="Attended"
                        sortKey="attended"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onClick={toggleSort}
                        className="w-[12%] text-right"
                        align="right"
                      />
                      <SortHeader
                        label="Joined"
                        sortKey="created"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onClick={toggleSort}
                        className="w-[14%]"
                      />
                      <th className="px-4 py-3 text-left font-serif text-[10px] font-bold tracking-[0.18em] text-[#1c3550] uppercase w-[16%]">
                        Email
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const isExpanded = expandedId === r.id;
                      const t = tierStyle[r.tier];
                      return (
                        <Fragment key={r.id}>
                          <tr
                            onClick={() =>
                              setExpandedId(isExpanded ? null : r.id)
                            }
                            className={`border-b border-gray-100 transition-colors cursor-pointer ${
                              isExpanded ? "bg-gray-50/70" : "hover:bg-gray-50/50"
                            }`}
                          >
                            <td className="px-4 py-3 align-middle">
                              <div className="font-bold text-[#1c3550]">
                                {r.name || "（名前なし）"}
                              </div>
                              {r.name_furigana && (
                                <div className="text-[11px] text-gray-400">
                                  {r.name_furigana}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <div className="flex flex-wrap items-center gap-1">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${t.bg} ${t.border} ${t.text}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${t.dotBg}`}
                                  />
                                  {t.label}
                                </span>
                                {/* 会員の段。tier のバッジとは別に出す。
                                    決済は plan にしか書かないので、これが
                                    無いと誰が何を買ったのか一覧で分からない。 */}
                                {r.plan && (
                                  <span
                                    title={`plan=${r.plan}`}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold bg-[#eef5f1] border-[#bcd9c9] text-[#1b4332]"
                                  >
                                    {PLAN_LABELS[r.plan] ?? r.plan}
                                  </span>
                                )}
                                {/* 退会中バッジ */}
                                {r.withdrawn_at && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold bg-gray-100 border-gray-300 text-gray-500">
                                    退会
                                  </span>
                                )}
                                {/* 会員番号 */}
                                {r.member_no != null && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-[#fbf7ef] border-[#e6d3a3] text-[#8a5a1c] tabular-nums">
                                    No.{r.member_no}
                                  </span>
                                )}
                                {/* Stripe サブスクが要対応状態の時だけ警告チップ */}
                                {r.subscription_status &&
                                  ["past_due", "unpaid", "incomplete"].includes(
                                    r.subscription_status,
                                  ) && (
                                    <span
                                      title={r.subscription_status}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-[#f3e9e6] border-[#d8c4be] text-[#8a4538]"
                                    >
                                      ⚠
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-middle text-gray-700">
                              {r.referrer_name || (
                                <span className="text-gray-400 italic">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-middle text-right tabular-nums text-gray-700">
                              {r.attended_count}
                              <span className="text-gray-300 mx-1">/</span>
                              {r.applied_count}
                            </td>
                            <td className="px-4 py-3 align-middle tabular-nums text-gray-500">
                              {formatDate(r.created_at)}
                            </td>
                            <td className="px-4 py-3 align-middle text-gray-500 truncate max-w-0">
                              {r.email || (
                                <span className="text-gray-400 italic">—</span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50/40 border-b border-gray-100">
                              <td colSpan={6} className="px-4 py-4">
                                <MemberDetailExpansion
                                  member={r}
                                  onUpdate={(patch) => {
                                    setRows((cur) =>
                                      cur.map((row) =>
                                        row.id === r.id
                                          ? { ...row, ...patch }
                                          : row,
                                      ),
                                    );
                                  }}
                                  onDelete={() => {
                                    setRows((cur) =>
                                      cur.filter((row) => row.id !== r.id),
                                    );
                                    setExpandedId(null);
                                  }}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 「○日以内」「参加○回以上」のように、prefix と suffix を伴う数値入力。
// セレクトの「カスタム」モード選択時にインラインで現れる。
function NumericInline({
  prefix,
  suffix,
  value,
  onChange,
  min,
  max,
}: {
  prefix: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#1c3550] bg-[#fafbfc] text-[13px] text-[#1c3550]">
      <span className="text-xs text-gray-500">{prefix}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 text-center bg-transparent border-0 outline-none font-semibold tabular-nums focus:bg-white focus:ring-1 focus:ring-[#1c3550] rounded-sm"
      />
      <span className="text-xs text-gray-500">{suffix}</span>
    </span>
  );
}

// フィルタ用 select（active時に navy 縁取り、ChevronDown 自前矢印）
function FilterSelect({
  value,
  onChange,
  active,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pl-3 pr-8 py-1.5 text-[13px] font-medium rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent transition-colors ${
          active
            ? "border-[#1c3550] bg-[#fafbfc] text-[#1c3550]"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
        }`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${active ? "text-[#1c3550]" : "text-gray-400"}`}
      />
    </div>
  );
}

// 列ヘッダー（クリックでソート、現在のソート列は方向矢印を表示）
function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onClick,
  className = "",
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onClick: (key: SortKey) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const isActive = currentKey === sortKey;
  const Icon = !isActive
    ? ChevronsUpDown
    : currentDir === "asc"
      ? ChevronUp
      : ChevronDown;
  return (
    <th
      className={`px-4 py-3 font-serif text-[10px] font-bold tracking-[0.18em] text-[#1c3550] uppercase select-none ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1.5 hover:text-[#c08a3e] transition-colors ${
          align === "right" ? "ml-auto" : ""
        }`}
      >
        <span>{label}</span>
        <Icon
          className={`w-3 h-3 ${isActive ? "text-[#c08a3e]" : "text-gray-300"}`}
        />
      </button>
    </th>
  );
}
