"use client";

// 招待コード管理タブ。
//
// 2026-05-11 改修（migration 0015 適用後）：
//   - invitations テーブルに「事前発行・取消・期限・使用回数上限」を持たせる
//   - admin はこのタブから新規発行・コピー・取消を行える
//   - /join?invite=<code> 申込時に AFTER INSERT トリガで used_count が自動加算される
//   - 表示は2セクション：
//       (1) 発行済み招待（invitations 由来）
//       (2) 実利用集計（event_attendees.invite_code 由来：seminars.slug fallback 等の
//           legacy 流入も拾えるよう従来の view は残す）

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Send,
  Copy,
  Check,
  Plus,
  X,
  Ban,
  RotateCcw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  EditorialCard,
  StatusBadge,
  AdmissionStatus,
} from "./EditorialChrome";
import { formatDate } from "./EditorialFormat";

// ─── 型定義 ─────────────────────────────────────────────────────────

interface InvitationRow {
  id: string;
  code: string;
  seminar_id: string | null;
  invited_name: string | null;
  invited_email: string | null;
  notes: string | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  seminar: { id: string; title: string; date: string } | null;
  /**
   * fetch 時にスナップショットした表示用ステータス。
   * render 中に Date.now() を呼ばないために行に焼き込む（react-hooks/purity 対応）。
   */
  _display: { label: string; tone: "ok" | "warn" | "bad" };
}

function computeExpiryDisplay(
  args: {
    is_active: boolean;
    expires_at: string | null;
    max_uses: number | null;
    used_count: number;
  },
  nowMs: number
): { label: string; tone: "ok" | "warn" | "bad" } {
  if (!args.is_active) return { label: "取消済み", tone: "bad" };
  if (
    args.expires_at !== null &&
    new Date(args.expires_at).getTime() < nowMs
  ) {
    return { label: "期限切れ", tone: "bad" };
  }
  if (args.max_uses !== null && args.used_count >= args.max_uses) {
    return { label: "上限到達", tone: "bad" };
  }
  if (args.max_uses !== null) {
    return {
      label: `${args.used_count}/${args.max_uses} 利用`,
      tone: "ok",
    };
  }
  return { label: `${args.used_count} 利用 (無制限)`, tone: "ok" };
}

interface SeminarLite {
  id: string;
  title: string;
  date: string;
  is_active: boolean;
}

interface InviteUsage {
  code: string;
  totalUsed: number;
  attendees: {
    id: string;
    applicantName: string;
    seminarTitle: string | null;
    seminarDate: string | null;
    status: AdmissionStatus;
    appliedAt: string;
  }[];
  firstUsedAt: string;
  lastUsedAt: string;
}

// ─── 招待コード生成（8文字 base36 lowercase） ─────────────────────────
// 36^8 ≒ 2.8兆通り。衝突時は呼び出し側で再生成する。
function generateCode(): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// ─── 本体 ──────────────────────────────────────────────────────────

export function InvitesTab() {
  const supabase = useMemo(() => createClient(), []);

  // 発行済み招待
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);

  // 実利用集計（event_attendees.invite_code）
  const [usages, setUsages] = useState<InviteUsage[]>([]);
  const [usagesLoading, setUsagesLoading] = useState(true);

  // セミナー一覧（発行モーダル用 select）
  const [seminars, setSeminars] = useState<SeminarLite[]>([]);

  const [error, setError] = useState<string | null>(null);

  // 検索 / 展開 / コピー
  const [search, setSearch] = useState("");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 新規発行モーダル
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    seminarId: "" as string,
    invitedName: "",
    invitedEmail: "",
    notes: "",
    maxUses: "" as string, // 空文字 = 無制限
    expiresAt: "" as string, // 空文字 = 無期限。datetime-local の値
  });

  // 行操作
  const [busyId, setBusyId] = useState<string | null>(null);

  // ─── 初期ロード ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [invRes, attRes, semRes] = await Promise.all([
        supabase
          .from("invitations")
          .select(
            `
            id, code, seminar_id, invited_name, invited_email, notes,
            max_uses, used_count, expires_at, is_active, created_at,
            seminar:seminars(id, title, date)
          `
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("event_attendees")
          .select(
            `
            id, status, applied_at, invite_code,
            seminar:seminars(id, title, date),
            applicant:applicants!inner(id, name)
          `
          )
          .not("invite_code", "is", null)
          .order("applied_at", { ascending: false }),
        supabase
          .from("seminars")
          .select("id, title, date, is_active")
          .order("date", { ascending: false }),
      ]);
      if (cancelled) return;

      if (invRes.error) {
        setError(invRes.error.message);
      }
      if (attRes.error) {
        // 集計だけ失敗してもメイン機能は動かしたいので別行で扱う
        console.error("[InvitesTab] usages fetch failed:", attRes.error);
      }
      if (semRes.error) {
        console.error("[InvitesTab] seminars fetch failed:", semRes.error);
      }

      // invitations 整形（seminar が array で返るケースに備える）
      const fetchNow = Date.now();
      const invs: InvitationRow[] = (invRes.data ?? []).map((r: unknown) => {
        const row = r as Record<string, unknown>;
        const sem = Array.isArray(row.seminar)
          ? (row.seminar[0] ?? null)
          : (row.seminar ?? null);
        const is_active = (row.is_active as boolean) ?? true;
        const expires_at = (row.expires_at as string | null) ?? null;
        const max_uses = (row.max_uses as number | null) ?? null;
        const used_count = (row.used_count as number) ?? 0;
        return {
          id: row.id as string,
          code: row.code as string,
          seminar_id: (row.seminar_id as string | null) ?? null,
          invited_name: (row.invited_name as string | null) ?? null,
          invited_email: (row.invited_email as string | null) ?? null,
          notes: (row.notes as string | null) ?? null,
          max_uses,
          used_count,
          expires_at,
          is_active,
          created_at: row.created_at as string,
          seminar: sem as InvitationRow["seminar"],
          _display: computeExpiryDisplay(
            { is_active, expires_at, max_uses, used_count },
            fetchNow
          ),
        };
      });
      setInvitations(invs);
      setInvitationsLoading(false);

      // 実利用集計
      const byCode = new Map<string, InviteUsage>();
      (attRes.data ?? []).forEach((r: unknown) => {
        const row = r as Record<string, unknown>;
        const code = (row.invite_code as string | null)?.trim();
        if (!code) return;
        const seminar = Array.isArray(row.seminar)
          ? (row.seminar[0] ?? null)
          : (row.seminar ?? null);
        const applicant = Array.isArray(row.applicant)
          ? (row.applicant[0] ?? null)
          : (row.applicant ?? null);
        const appliedAt = row.applied_at as string;

        const cur = byCode.get(code) ?? {
          code,
          totalUsed: 0,
          attendees: [],
          firstUsedAt: appliedAt,
          lastUsedAt: appliedAt,
        };

        cur.totalUsed += 1;
        cur.attendees.push({
          id: row.id as string,
          applicantName:
            (applicant as { name?: string } | null)?.name ?? "（名前なし）",
          seminarTitle:
            (seminar as { title?: string } | null)?.title ?? null,
          seminarDate:
            (seminar as { date?: string } | null)?.date ?? null,
          status: row.status as AdmissionStatus,
          appliedAt,
        });
        if (appliedAt < cur.firstUsedAt) cur.firstUsedAt = appliedAt;
        if (appliedAt > cur.lastUsedAt) cur.lastUsedAt = appliedAt;

        byCode.set(code, cur);
      });
      setUsages(
        Array.from(byCode.values()).sort((a, b) => b.totalUsed - a.totalUsed)
      );
      setUsagesLoading(false);

      // seminars
      setSeminars((semRes.data ?? []) as SeminarLite[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // ─── 招待を発行 ─────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreateBusy(true);
    setCreateError(null);

    // datetime-local（"YYYY-MM-DDTHH:MM"）→ ISO で送る
    let expiresIso: string | null = null;
    if (draft.expiresAt.trim().length > 0) {
      const d = new Date(draft.expiresAt);
      if (Number.isNaN(d.getTime())) {
        setCreateError("有効期限の日付が不正です");
        setCreateBusy(false);
        return;
      }
      expiresIso = d.toISOString();
    }

    let maxUsesNum: number | null = null;
    if (draft.maxUses.trim().length > 0) {
      const n = Number(draft.maxUses);
      if (!Number.isInteger(n) || n < 1) {
        setCreateError("使用回数の上限は1以上の整数で指定してください");
        setCreateBusy(false);
        return;
      }
      maxUsesNum = n;
    }

    const { data: userRes } = await supabase.auth.getUser();
    const actorId = userRes.user?.id ?? null;

    // unique 衝突に備えて最大3回まで code を生成し直す
    let lastErr: { code?: string; message: string } | null = null;
    let inserted: InvitationRow | null = null;
    for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
      const code = generateCode();
      const payload = {
        code,
        seminar_id: draft.seminarId || null,
        invited_name: draft.invitedName.trim() || null,
        invited_email: draft.invitedEmail.trim() || null,
        notes: draft.notes.trim() || null,
        max_uses: maxUsesNum,
        expires_at: expiresIso,
        created_by: actorId,
      };
      const { data, error: e1 } = await supabase
        .from("invitations")
        .insert(payload)
        .select(
          `
          id, code, seminar_id, invited_name, invited_email, notes,
          max_uses, used_count, expires_at, is_active, created_at,
          seminar:seminars(id, title, date)
        `
        )
        .single();

      if (e1) {
        lastErr = { code: e1.code, message: e1.message };
        if (e1.code === "23505") {
          // unique violation → 再生成して retry
          continue;
        }
        break;
      }
      // 整形
      const row = data as unknown as Record<string, unknown>;
      const sem = Array.isArray(row.seminar)
        ? (row.seminar[0] ?? null)
        : (row.seminar ?? null);
      const is_active = (row.is_active as boolean) ?? true;
      const expires_at = (row.expires_at as string | null) ?? null;
      const max_uses = (row.max_uses as number | null) ?? null;
      const used_count = (row.used_count as number) ?? 0;
      inserted = {
        id: row.id as string,
        code: row.code as string,
        seminar_id: (row.seminar_id as string | null) ?? null,
        invited_name: (row.invited_name as string | null) ?? null,
        invited_email: (row.invited_email as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        max_uses,
        used_count,
        expires_at,
        is_active,
        created_at: row.created_at as string,
        seminar: sem as InvitationRow["seminar"],
        _display: computeExpiryDisplay(
          { is_active, expires_at, max_uses, used_count },
          Date.now()
        ),
      };
    }

    if (!inserted) {
      setCreateError(
        lastErr?.message ?? "招待の発行に失敗しました（不明なエラー）"
      );
      setCreateBusy(false);
      return;
    }

    setInvitations((prev) => [inserted!, ...prev]);
    setCreateOpen(false);
    setCreateBusy(false);
    setDraft({
      seminarId: "",
      invitedName: "",
      invitedEmail: "",
      notes: "",
      maxUses: "",
      expiresAt: "",
    });
    // 発行直後はコピーガイドを兼ねて該当行を展開
    setExpandedCode(inserted.code);

    // activity_log: 監査ログ（admin は activity_log_admin_all で INSERT 可）
    // 失敗してもメイン UI は影響を受けないので fire-and-forget
    void supabase.from("activity_log").insert({
      actor_id: actorId,
      subject_type: "invitation",
      subject_id: inserted.id,
      action: "invitation_create",
      details: {
        code: inserted.code,
        seminar_id: inserted.seminar_id,
        invited_name: inserted.invited_name,
        invited_email: inserted.invited_email,
        max_uses: inserted.max_uses,
        expires_at: inserted.expires_at,
        issued_by: "admin",
      },
    });
  };

  // ─── 取消／復活 ────────────────────────────────────────────────
  const handleToggleActive = async (inv: InvitationRow) => {
    setBusyId(inv.id);
    const next = !inv.is_active;
    const optimisticNow = Date.now();
    // 楽観的更新
    setInvitations((prev) =>
      prev.map((r) =>
        r.id === inv.id
          ? {
              ...r,
              is_active: next,
              _display: computeExpiryDisplay(
                {
                  is_active: next,
                  expires_at: r.expires_at,
                  max_uses: r.max_uses,
                  used_count: r.used_count,
                },
                optimisticNow
              ),
            }
          : r
      )
    );
    const { error: e1 } = await supabase
      .from("invitations")
      .update({ is_active: next })
      .eq("id", inv.id);
    if (!e1) {
      // activity_log: 取消/復活の監査ログ。失敗しても UI は影響を受けない fire-and-forget
      const { data: userRes } = await supabase.auth.getUser();
      void supabase.from("activity_log").insert({
        actor_id: userRes.user?.id ?? null,
        subject_type: "invitation",
        subject_id: inv.id,
        action: next ? "invitation_restore" : "invitation_revoke",
        details: {
          code: inv.code,
          issued_by: "admin",
        },
      });
    }
    if (e1) {
      // ロールバック
      setInvitations((prev) =>
        prev.map((r) =>
          r.id === inv.id
            ? {
                ...r,
                is_active: inv.is_active,
                _display: computeExpiryDisplay(
                  {
                    is_active: inv.is_active,
                    expires_at: r.expires_at,
                    max_uses: r.max_uses,
                    used_count: r.used_count,
                  },
                  Date.now()
                ),
              }
            : r
        )
      );
      setError(`更新に失敗しました：${e1.message}`);
    }
    setBusyId(null);
  };

  // ─── URL コピー ──────────────────────────────────────────────────
  const handleCopy = async (code: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join?invite=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      // クリップボードAPIが使えない環境では何もしない
    }
  };

  const filteredInvitations = invitations.filter((inv) => {
    if (search.trim().length === 0) return true;
    const q = search.trim().toLowerCase();
    return (
      inv.code.toLowerCase().includes(q) ||
      (inv.invited_name ?? "").toLowerCase().includes(q) ||
      (inv.invited_email ?? "").toLowerCase().includes(q) ||
      (inv.seminar?.title ?? "").toLowerCase().includes(q)
    );
  });

  // 発行済み code 一覧（実利用集計から差し引いて「未管理 (legacy)」だけを出す）
  const managedCodes = new Set(invitations.map((i) => i.code));
  const legacyUsages = usages.filter((u) => !managedCodes.has(u.code));

  // ─── 描画 ─────────────────────────────────────────────────────
  return (
    <div>
      {/* 説明 */}
      <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-md border border-[#e6d3a3] bg-[#fbf3e3] text-[#8a5a1c] text-sm">
        <Send className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold">招待コード</p>
          <p className="mt-0.5 text-xs leading-relaxed">
            個別に発行 / 取消 / 期限・使用上限 / セミナー紐付けが可能。
            <br />
            発行コード経由 (<code>?invite=&lt;code&gt;</code>) の申込は自動で
            <code> used_count </code>に加算されます。
            セミナーの <code>slug</code> を直接踏んできた申込
            （legacy 流入）は下部の「発行外の利用」に集計しています。
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[#8a4538] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">取得エラー</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* ツールバー */}
      <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="コード・宛先名・セミナーで絞り込み..."
          className="w-full max-w-sm px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#1c3550] text-white text-sm font-semibold hover:bg-[#132540] transition-colors"
        >
          <Plus className="w-4 h-4" />
          招待を発行
        </button>
      </div>

      {/* セクション1: 発行済み招待 */}
      <section className="mb-10">
        <h2 className="text-[11px] tracking-[0.3em] text-gray-500 uppercase font-semibold mb-3">
          発行済み招待
        </h2>

        {invitationsLoading && (
          <EditorialCard className="text-center py-16">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">読み込み中...</p>
          </EditorialCard>
        )}

        {!invitationsLoading && filteredInvitations.length === 0 && (
          <EditorialCard className="text-center py-12">
            <p className="text-sm text-gray-400">
              {invitations.length === 0
                ? "まだ招待は発行されていません"
                : "条件に一致する招待はありません"}
            </p>
          </EditorialCard>
        )}

        {!invitationsLoading && filteredInvitations.length > 0 && (
          <div className="space-y-3">
            {filteredInvitations.map((inv) => {
              const isExpanded = expandedCode === inv.code;
              const isCopied = copiedCode === inv.code;
              const exp = inv._display;
              const expToneCls =
                exp.tone === "ok"
                  ? "text-[#3d6651] bg-[#e9efe9] border-[#c5d3c8]"
                  : exp.tone === "warn"
                    ? "text-[#8a5a1c] bg-[#fbf3e3] border-[#e6d3a3]"
                    : "text-[#8a4538] bg-[#f3e9e6] border-[#d8c4be]";
              return (
                <EditorialCard
                  key={inv.id}
                  variant="row"
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
                    <button
                      onClick={() =>
                        setExpandedCode(isExpanded ? null : inv.code)
                      }
                      className="flex-1 min-w-0 flex flex-wrap items-center gap-3 text-left hover:opacity-80 transition-opacity"
                    >
                      <span className="text-[10px] tracking-[0.25em] text-[#c08a3e] font-semibold flex-shrink-0">
                        INVITE
                      </span>
                      <span className="font-mono text-sm font-bold text-[#1c3550] break-all">
                        {inv.code}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${expToneCls}`}
                      >
                        {exp.label}
                      </span>
                      {inv.invited_name && (
                        <span className="text-xs text-gray-600">
                          宛先: {inv.invited_name}
                        </span>
                      )}
                      {inv.seminar && (
                        <span className="text-xs text-gray-500">
                          {formatDate(inv.seminar.date)} / {inv.seminar.title}
                        </span>
                      )}
                      {!inv.seminar_id && (
                        <span className="text-xs text-gray-400">
                          汎用 (セミナー未指定)
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleCopy(inv.code)}
                        disabled={!inv.is_active}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-[#1c3550] hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-[#3d6651]" />
                            <span className="text-[#3d6651]">コピー済</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            URL
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleToggleActive(inv)}
                        disabled={busyId === inv.id}
                        title={inv.is_active ? "取消" : "復活"}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-[#8a4538] hover:bg-gray-100 disabled:opacity-40"
                      >
                        {busyId === inv.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : inv.is_active ? (
                          <>
                            <Ban className="w-3 h-3" />
                            取消
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            復活
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 sm:px-5 py-4 bg-gray-50/40 space-y-3">
                      {/* URL 表示 */}
                      <div>
                        <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold block mb-1">
                          招待URL
                        </span>
                        <code className="block break-all text-xs bg-white border border-gray-200 rounded px-3 py-2 text-[#1c3550]">
                          {typeof window !== "undefined"
                            ? `${window.location.origin}/join?invite=${inv.code}`
                            : `/join?invite=${inv.code}`}
                        </code>
                      </div>

                      {/* メタ情報 */}
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div>
                          <dt className="text-gray-500">発行日</dt>
                          <dd className="text-[#1c3550]">
                            {formatDate(inv.created_at)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">有効期限</dt>
                          <dd className="text-[#1c3550]">
                            {inv.expires_at
                              ? formatDate(inv.expires_at)
                              : "無期限"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">使用回数</dt>
                          <dd className="text-[#1c3550]">
                            {inv.used_count}
                            {inv.max_uses !== null
                              ? ` / 上限 ${inv.max_uses}`
                              : " / 無制限"}
                          </dd>
                        </div>
                        {inv.invited_email && (
                          <div>
                            <dt className="text-gray-500">宛先メール</dt>
                            <dd className="text-[#1c3550] break-all">
                              {inv.invited_email}
                            </dd>
                          </div>
                        )}
                        {inv.notes && (
                          <div className="sm:col-span-2">
                            <dt className="text-gray-500">メモ</dt>
                            <dd className="text-[#1c3550] whitespace-pre-wrap">
                              {inv.notes}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </EditorialCard>
              );
            })}
          </div>
        )}
      </section>

      {/* セクション2: 発行外の利用（legacy / seminars.slug fallback） */}
      <section>
        <h2 className="text-[11px] tracking-[0.3em] text-gray-500 uppercase font-semibold mb-3">
          発行外の利用（slug 直踏み / legacy）
        </h2>

        {usagesLoading && (
          <EditorialCard className="text-center py-12">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">読み込み中...</p>
          </EditorialCard>
        )}

        {!usagesLoading && legacyUsages.length === 0 && (
          <EditorialCard className="text-center py-10">
            <p className="text-sm text-gray-400">
              発行外の招待コード経由の申込はありません
            </p>
          </EditorialCard>
        )}

        {!usagesLoading && legacyUsages.length > 0 && (
          <div className="space-y-3">
            {legacyUsages.map((u) => {
              const isExpanded = expandedCode === u.code;
              const isCopied = copiedCode === u.code;
              return (
                <EditorialCard
                  key={u.code}
                  variant="row"
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <button
                      onClick={() =>
                        setExpandedCode(isExpanded ? null : u.code)
                      }
                      className="flex-1 min-w-0 flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                    >
                      <span className="text-[10px] tracking-[0.25em] text-gray-400 font-semibold flex-shrink-0">
                        LEGACY
                      </span>
                      <span className="font-mono text-sm font-bold text-[#1c3550] truncate">
                        {u.code}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {u.totalUsed}件 利用 / 最終: {formatDate(u.lastUsedAt)}
                      </span>
                    </button>
                    <button
                      onClick={() => handleCopy(u.code)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-[#1c3550] hover:bg-gray-100 flex-shrink-0"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-[#3d6651]" />
                          <span className="text-[#3d6651]">コピー済</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          URL
                        </>
                      )}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 sm:px-5 py-4 bg-gray-50/40">
                      <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold block mb-3">
                        この招待で申込のあった人
                      </span>
                      <ul className="space-y-2">
                        {u.attendees.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span className="text-[#1c3550] font-semibold">
                              {a.applicantName}
                            </span>
                            <StatusBadge status={a.status} />
                            <span className="text-xs text-gray-500 truncate">
                              {a.seminarDate
                                ? formatDate(a.seminarDate)
                                : "—"}
                              {a.seminarTitle ? `　${a.seminarTitle}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </EditorialCard>
              );
            })}
          </div>
        )}
      </section>

      {/* 発行モーダル */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (!createBusy) setCreateOpen(false);
          }}
        >
          <div
            className="bg-white rounded-md shadow-xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <p className="text-[10px] tracking-[0.3em] text-[#c08a3e] font-semibold">
                  NEW INVITE
                </p>
                <h3 className="font-serif text-lg font-bold text-[#1c3550] mt-0.5">
                  招待を発行
                </h3>
              </div>
              <button
                onClick={() => !createBusy && setCreateOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
                disabled={createBusy}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* セミナー */}
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">
                  セミナー紐付け（任意）
                </label>
                <select
                  value={draft.seminarId}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, seminarId: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
                >
                  <option value="">— 汎用（どのセミナーにも使える）</option>
                  {seminars.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} / {formatDate(s.date)}
                      {!s.is_active ? "（停止中）" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 宛先名・メール */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5">
                    宛先名（メモ・任意）
                  </label>
                  <input
                    type="text"
                    value={draft.invitedName}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, invitedName: e.target.value }))
                    }
                    placeholder="例：佐藤さん"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5">
                    宛先メール（メモ・任意）
                  </label>
                  <input
                    type="email"
                    value={draft.invitedEmail}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, invitedEmail: e.target.value }))
                    }
                    placeholder="例：sato@example.com"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
                  />
                </div>
              </div>

              {/* 上限・期限 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5">
                    使用上限（任意）
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={draft.maxUses}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, maxUses: e.target.value }))
                    }
                    placeholder="空欄＝無制限"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    1 = 一発限り。3 = 3人まで使える。
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5">
                    有効期限（任意）
                  </label>
                  <input
                    type="datetime-local"
                    value={draft.expiresAt}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, expiresAt: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    空欄＝無期限。
                  </p>
                </div>
              </div>

              {/* メモ */}
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">
                  メモ（任意）
                </label>
                <textarea
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                  placeholder="どんな経路で出すか、何のコミュニティ向けか、など"
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent resize-y"
                />
              </div>

              {createError && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[#8a4538] text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={createBusy}
                className="px-4 py-2 text-sm text-gray-600 hover:text-[#1c3550] disabled:opacity-40"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createBusy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#1c3550] text-white text-sm font-semibold hover:bg-[#132540] disabled:opacity-40"
              >
                {createBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    発行中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    発行する
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
