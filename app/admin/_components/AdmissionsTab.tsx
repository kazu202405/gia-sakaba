"use client";

// 入会申請タブ。元の /admin/page.tsx の機能を Editorial 化して移植。
// 追加: notes インライン編集、CSV エクスポート。
//
// データソース: event_attendees ← seminars / applicants の join
// 操作:
//   - 承認/却下（楽観的更新）
//   - notes 編集（inline・Save時に UPDATE）
//   - CSV エクスポート（フィルタ後の表示行を出力）

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Mail,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  Download,
  Save,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AdmissionStatus,
  StatusBadge,
  EditorialCard,
  FilterStatCard,
  statusStyle,
  TierBadge,
  type Tier,
} from "./EditorialChrome";
import { formatDate } from "./EditorialFormat";

interface AttendeeRow {
  id: string;
  status: AdmissionStatus;
  applied_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  invite_code: string | null;
  notes: string | null;
  seminar: {
    id: string;
    slug: string;
    title: string;
    date: string;
    start_time: string | null;
    location: string | null;
  } | null;
  applicant: {
    id: string;
    name: string;
    name_furigana: string | null;
    nickname: string | null;
    email: string | null;
    referrer_name: string | null;
    referrer_id: string | null;
    tier: Tier;
  } | null;
}

interface AdmissionsTabProps {
  onCountsChange?: (counts: {
    pending: number;
    approved: number;
    rejected: number;
  }) => void;
}

export function AdmissionsTab({ onCountsChange }: AdmissionsTabProps) {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] =
    useState<AdmissionStatus | "all">("all");
  const [seminarFilter, setSeminarFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // notes 編集
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);

  // 初回ロード
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("event_attendees")
        .select(
          `
          id, status, applied_at, approved_at, rejected_at, invite_code, notes,
          seminar:seminars(id, slug, title, date, start_time, location),
          applicant:applicants!inner(id, name, name_furigana, nickname, email, referrer_name, referrer_id, tier)
        `
        )
        .order("applied_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setLoadError(error.message);
        setRows([]);
      } else {
        const normalized: AttendeeRow[] = (data ?? []).map((r: unknown) => {
          const row = r as Record<string, unknown>;
          const seminar = Array.isArray(row.seminar)
            ? (row.seminar[0] ?? null)
            : (row.seminar ?? null);
          const applicant = Array.isArray(row.applicant)
            ? (row.applicant[0] ?? null)
            : (row.applicant ?? null);
          return {
            id: row.id as string,
            status: row.status as AdmissionStatus,
            applied_at: row.applied_at as string,
            approved_at: (row.approved_at as string | null) ?? null,
            rejected_at: (row.rejected_at as string | null) ?? null,
            invite_code: (row.invite_code as string | null) ?? null,
            notes: (row.notes as string | null) ?? null,
            seminar: seminar as AttendeeRow["seminar"],
            applicant: applicant as AttendeeRow["applicant"],
          };
        });
        setRows(normalized);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // counts を親に通知（タブバッジ用）
  const counts = useMemo(() => {
    return {
      pending: rows.filter((r) => r.status === "pending").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    };
  }, [rows]);

  useEffect(() => {
    onCountsChange?.(counts);
  }, [counts, onCountsChange]);

  // セミナー別の選択肢
  const seminarOptions = useMemo(() => {
    const map = new Map<string, { id: string; title: string; date: string }>();
    rows.forEach((r) => {
      if (r.seminar) {
        map.set(r.seminar.id, {
          id: r.seminar.id,
          title: r.seminar.title,
          date: r.seminar.date,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    );
  }, [rows]);

  const filtered = rows.filter((r) => {
    const name = r.applicant?.name ?? "";
    const email = r.applicant?.email ?? "";
    const referrer = r.applicant?.referrer_name ?? "";
    const matchSearch =
      search.trim().length === 0 ||
      name.includes(search) ||
      email.includes(search) ||
      referrer.includes(search);
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchSeminar =
      seminarFilter === "all" || r.seminar?.id === seminarFilter;
    return matchSearch && matchStatus && matchSeminar;
  });

  // 承認
  const handleApprove = async (attendeeId: string) => {
    setActionError(null);
    setBusyId(attendeeId);
    const prev = rows;
    const nowIso = new Date().toISOString();
    setRows((cur) =>
      cur.map((r) =>
        r.id === attendeeId
          ? { ...r, status: "approved", approved_at: nowIso }
          : r
      )
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("event_attendees")
      .update({
        status: "approved",
        approved_at: nowIso,
        approved_by: user?.id ?? null,
      })
      .eq("id", attendeeId);
    if (error) {
      setRows(prev);
      setActionError(`承認に失敗しました：${error.message}`);
    }
    setBusyId(null);
  };

  // 却下
  const handleReject = async (attendeeId: string) => {
    setActionError(null);
    setBusyId(attendeeId);
    const prev = rows;
    const nowIso = new Date().toISOString();
    setRows((cur) =>
      cur.map((r) =>
        r.id === attendeeId
          ? { ...r, status: "rejected", rejected_at: nowIso }
          : r
      )
    );
    const { error } = await supabase
      .from("event_attendees")
      .update({
        status: "rejected",
        rejected_at: nowIso,
      })
      .eq("id", attendeeId);
    if (error) {
      setRows(prev);
      setActionError(`却下に失敗しました：${error.message}`);
    }
    setBusyId(null);
  };

  // notes 保存
  const handleSaveNotes = async (attendeeId: string) => {
    setSavingNotes(true);
    setActionError(null);
    const prev = rows;
    const newNotes = notesDraft.trim().length > 0 ? notesDraft : null;
    setRows((cur) =>
      cur.map((r) => (r.id === attendeeId ? { ...r, notes: newNotes } : r))
    );
    const { error } = await supabase
      .from("event_attendees")
      .update({ notes: newNotes })
      .eq("id", attendeeId);
    if (error) {
      setRows(prev);
      setActionError(`メモ保存に失敗しました：${error.message}`);
    } else {
      setEditingNotesId(null);
      setNotesDraft("");
    }
    setSavingNotes(false);
  };

  // CSV エクスポート（フィルタ後の表示行）
  const handleExportCsv = () => {
    const header = [
      "name",
      "furigana",
      "nickname",
      "email",
      "referrer",
      "seminar_date",
      "seminar_title",
      "status",
      "applied_at",
      "approved_at",
      "rejected_at",
      "invite_code",
      "notes",
    ];
    const escape = (v: string | null | undefined) =>
      v == null ? "" : `"${String(v).replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      lines.push(
        [
          escape(r.applicant?.name),
          escape(r.applicant?.name_furigana),
          escape(r.applicant?.nickname),
          escape(r.applicant?.email),
          escape(r.applicant?.referrer_name),
          escape(r.seminar?.date),
          escape(r.seminar?.title),
          escape(r.status),
          escape(r.applied_at),
          escape(r.approved_at),
          escape(r.rejected_at),
          escape(r.invite_code),
          escape(r.notes),
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
    a.download = `admissions_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* ロードエラー */}
      {loadError && (
        <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[#8a4538] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">データ取得エラー</p>
            <p className="mt-0.5 text-xs">{loadError}</p>
          </div>
        </div>
      )}

      {actionError && (
        <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[#8a4538] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* スタットカード（クリックでフィルタ切替） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <FilterStatCard
          label="全申込"
          count={rows.length}
          active={filterStatus === "all"}
          onClick={() => setFilterStatus("all")}
        />
        <FilterStatCard
          label="審査中"
          count={counts.pending}
          active={filterStatus === "pending"}
          onClick={() => setFilterStatus("pending")}
          dotColorClass={statusStyle.pending.dotBg}
        />
        <FilterStatCard
          label="承認済み"
          count={counts.approved}
          active={filterStatus === "approved"}
          onClick={() => setFilterStatus("approved")}
          dotColorClass={statusStyle.approved.dotBg}
        />
        <FilterStatCard
          label="却下"
          count={counts.rejected}
          active={filterStatus === "rejected"}
          onClick={() => setFilterStatus("rejected")}
          dotColorClass={statusStyle.rejected.dotBg}
        />
      </div>

      {/* 検索・CSV */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・メール・紹介者で検索..."
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

      {/* イベント別フィルター */}
      {seminarOptions.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={seminarFilter}
            onChange={(e) => setSeminarFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-md text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
          >
            <option value="all">すべての回</option>
            {seminarOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {formatDate(s.date)}　{s.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ロード中 */}
      {loading && (
        <EditorialCard className="text-center py-16">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">読み込み中...</p>
        </EditorialCard>
      )}

      {/* 申請リスト */}
      {!loading && (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isExpanded = expandedId === r.id;
            const name = r.applicant?.name ?? "（名前なし）";
            const furigana = r.applicant?.name_furigana ?? "";
            const nickname = r.applicant?.nickname ?? "";
            const email = r.applicant?.email ?? "";
            const referrer = r.applicant?.referrer_name ?? "";
            const tier: Tier = r.applicant?.tier ?? "tentative";
            const seminarTitle = r.seminar?.title ?? "—";
            const seminarDate = formatDate(r.seminar?.date ?? null);
            const isEditingNotes = editingNotesId === r.id;

            return (
              <EditorialCard key={r.id} variant="row" className="overflow-hidden">
                {/* メイン行 */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-[#f1f4f7] border border-[#d6dde5] rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-[#1c3550]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-base font-bold text-[#1c3550]">
                        {name}
                      </span>
                      {furigana && (
                        <span className="text-xs text-gray-400">
                          （{furigana}）
                        </span>
                      )}
                      <StatusBadge status={r.status} />
                      <TierBadge tier={tier} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        {seminarDate}　{seminarTitle}
                      </span>
                      {referrer && <span>紹介者: {referrer}</span>}
                      <span>申込: {formatDate(r.applied_at)}</span>
                    </div>
                  </div>
                </button>

                {/* 詳細展開 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 sm:px-5 py-4 sm:py-5 bg-gray-50/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-sm">
                      {email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 break-all">
                            {email}
                          </span>
                        </div>
                      )}
                      {nickname && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            呼び名: {nickname}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {seminarDate} / {seminarTitle}
                        </span>
                      </div>
                      {r.seminar?.location && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📍</span>
                          <span className="text-gray-600">
                            {r.seminar.location}
                          </span>
                        </div>
                      )}
                      {r.invite_code && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] tracking-[0.2em] text-gray-400">
                            INVITE
                          </span>
                          <span className="font-mono text-xs text-gray-600">
                            {r.invite_code}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* notes 編集 */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold">
                          メモ（主催者用）
                        </span>
                        {!isEditingNotes && (
                          <button
                            onClick={() => {
                              setEditingNotesId(r.id);
                              setNotesDraft(r.notes ?? "");
                            }}
                            className="text-xs text-[#c08a3e] hover:text-[#8a5a1c] font-semibold"
                          >
                            編集
                          </button>
                        )}
                      </div>
                      {isEditingNotes ? (
                        <div className="space-y-2">
                          <textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            rows={3}
                            placeholder="この方についてのメモ（紹介経路・所属・優先度など）"
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveNotes(r.id)}
                              disabled={savingNotes}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1c3550] text-white rounded-md text-xs font-bold hover:bg-[#102032] disabled:opacity-50"
                            >
                              {savingNotes ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              保存
                            </button>
                            <button
                              onClick={() => {
                                setEditingNotesId(null);
                                setNotesDraft("");
                              }}
                              disabled={savingNotes}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-xs font-bold hover:border-gray-300"
                            >
                              <X className="w-3 h-3" />
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[1.5rem]">
                          {r.notes || (
                            <span className="text-gray-400 italic">
                              （メモなし）
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {r.status === "pending" && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleApprove(r.id)}
                          disabled={busyId === r.id}
                          className="inline-flex items-center gap-2 px-5 py-2 bg-[#3d6651] text-white rounded-md text-sm font-bold hover:bg-[#2d5040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {busyId === r.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : null}
                          承認する
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          disabled={busyId === r.id}
                          className="inline-flex items-center gap-2 px-5 py-2 bg-white border border-[#d8c4be] text-[#8a4538] rounded-md text-sm font-bold hover:bg-[#f3e9e6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          却下する
                        </button>
                      </div>
                    )}

                    {r.status === "approved" && r.approved_at && (
                      <p className="text-sm text-[#3d6651]">
                        ✓ {formatDate(r.approved_at)} に承認済み
                      </p>
                    )}
                    {r.status === "rejected" && r.rejected_at && (
                      <p className="text-sm text-[#8a4538]">
                        ✗ {formatDate(r.rejected_at)} に却下
                      </p>
                    )}
                  </div>
                )}
              </EditorialCard>
            );
          })}

          {filtered.length === 0 && !loadError && (
            <EditorialCard className="text-center py-16">
              <p className="text-sm text-gray-400">
                該当する申請はありません
              </p>
            </EditorialCard>
          )}
        </div>
      )}
    </div>
  );
}
