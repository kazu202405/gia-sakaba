"use client";

// アクティビティログタブ。
//
// 2系統のソースを統合タイムラインで表示する：
//   1. event_attendees の applied_at / approved_at / rejected_at / cancelled_at
//      （申込・承認・却下・キャンセル）
//   2. activity_log テーブル（2026-05-11 0012 で新設）
//      ─ tier 変更などの「申請に紐付かない主催者操作」
//
// 表示は「アクティビティ1件」単位。各イベントに actor / 対象会員 /
// 詳細（tier 変更なら old→new、reason）を持たせる。

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  UserPlus,
  CheckCircle2,
  XCircle,
  Ban,
  ArrowRightLeft,
  StickyNote,
  Send,
  RotateCcw,
  CreditCard,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditorialCard, tierStyle, type Tier } from "./EditorialChrome";
import { formatDateTime } from "./EditorialFormat";

type ActivityKind =
  | "applied"
  | "approved"
  | "rejected"
  | "cancelled"
  | "tier_change"
  | "admin_notes_update"
  | "invitation_create"
  | "invitation_revoke"
  | "invitation_restore"
  | "subscription_created"
  | "subscription_status_change"
  | "subscription_canceled"
  | "payment_failed";

interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: string;
  applicantName: string;
  // セミナー関連（applied/approved/rejected/cancelled の時のみ）
  seminarTitle: string | null;
  seminarDate: string | null;
  approverName: string | null; // approved の時のみ
  // activity_log 由来のイベント用
  actorName: string | null; // 実行者（主催者 / member）
  tierChange: { from: Tier; to: Tier } | null;
  reason: string | null;
  // invitation 系
  inviteCode: string | null;
  issuedBy: "admin" | "member" | null;
  // stripe 系
  newSubStatus: string | null;
  paymentAmount: number | null;
  paymentCurrency: string | null;
}

const kindStyle: Record<
  ActivityKind,
  {
    label: string;
    Icon: typeof UserPlus;
    color: string;
    bg: string;
    border: string;
  }
> = {
  applied: {
    label: "申込",
    Icon: UserPlus,
    color: "text-[#1c3550]",
    bg: "bg-[#f1f4f7]",
    border: "border-[#d6dde5]",
  },
  approved: {
    label: "承認",
    Icon: CheckCircle2,
    color: "text-[#3d6651]",
    bg: "bg-[#e9efe9]",
    border: "border-[#c5d3c8]",
  },
  rejected: {
    label: "却下",
    Icon: XCircle,
    color: "text-[#8a4538]",
    bg: "bg-[#f3e9e6]",
    border: "border-[#d8c4be]",
  },
  cancelled: {
    label: "キャンセル",
    Icon: Ban,
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
  tier_change: {
    label: "tier 変更",
    Icon: ArrowRightLeft,
    color: "text-[#8a5a1c]",
    bg: "bg-[#fbf3e3]",
    border: "border-[#e6d3a3]",
  },
  admin_notes_update: {
    label: "メモ更新",
    Icon: StickyNote,
    color: "text-[#1c3550]",
    bg: "bg-[#f1f4f7]",
    border: "border-[#d6dde5]",
  },
  invitation_create: {
    label: "招待発行",
    Icon: Send,
    color: "text-[#8a5a1c]",
    bg: "bg-[#fbf3e3]",
    border: "border-[#e6d3a3]",
  },
  invitation_revoke: {
    label: "招待取消",
    Icon: Ban,
    color: "text-[#8a4538]",
    bg: "bg-[#f3e9e6]",
    border: "border-[#d8c4be]",
  },
  invitation_restore: {
    label: "招待復活",
    Icon: RotateCcw,
    color: "text-[#3d6651]",
    bg: "bg-[#e9efe9]",
    border: "border-[#c5d3c8]",
  },
  subscription_created: {
    label: "サブスク開始",
    Icon: CreditCard,
    color: "text-[#3d6651]",
    bg: "bg-[#e9efe9]",
    border: "border-[#c5d3c8]",
  },
  subscription_status_change: {
    label: "サブスク状態変化",
    Icon: Activity,
    color: "text-[#1c3550]",
    bg: "bg-[#f1f4f7]",
    border: "border-[#d6dde5]",
  },
  subscription_canceled: {
    label: "サブスク解約",
    Icon: XCircle,
    color: "text-[#8a4538]",
    bg: "bg-[#f3e9e6]",
    border: "border-[#d8c4be]",
  },
  payment_failed: {
    label: "請求失敗",
    Icon: AlertTriangle,
    color: "text-[#8a4538]",
    bg: "bg-[#f3e9e6]",
    border: "border-[#d8c4be]",
  },
};

export function ActivityTab() {
  const supabase = useMemo(() => createClient(), []);

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityKind | "all">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      // 1) event_attendees から申込系イベント
      const [attendeesRes, logsRes] = await Promise.all([
        supabase
          .from("event_attendees")
          .select(
            `
            id, applied_at, approved_at, rejected_at, cancelled_at, approved_by,
            seminar:seminars(id, title, date),
            applicant:applicants!inner(id, name)
            `,
          ),
        supabase
          .from("activity_log")
          .select("id, actor_id, subject_type, subject_id, action, details, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;
      if (attendeesRes.error) {
        setError(attendeesRes.error.message);
        setLoading(false);
        return;
      }
      // activity_log は無くてもタブ自体は壊さない（マイグレーション未適用環境への配慮）
      if (logsRes.error) {
        console.warn(
          "[ActivityTab] activity_log 取得失敗（migration未適用？）:",
          logsRes.error.message,
        );
      }

      const data = attendeesRes.data ?? [];
      const logs = logsRes.data ?? [];

      // 関係する applicant / invitation id を集めて一括取得
      const ids = new Set<string>();
      const invitationIds = new Set<string>();
      data.forEach((r: unknown) => {
        const row = r as Record<string, unknown>;
        const aid = row.approved_by as string | null;
        if (aid) ids.add(aid);
      });
      logs.forEach((l: Record<string, unknown>) => {
        const actor = l.actor_id as string | null;
        const subjectType = l.subject_type as string | null;
        const subjectId = l.subject_id as string | null;
        if (actor) ids.add(actor);
        if (subjectType === "applicant" && subjectId) ids.add(subjectId);
        if (subjectType === "invitation" && subjectId) invitationIds.add(subjectId);
      });

      // applicant 名のバッチ取得
      let nameMap = new Map<string, string>();
      if (ids.size > 0) {
        const { data: people } = await supabase
          .from("applicants")
          .select("id, name")
          .in("id", Array.from(ids));
        nameMap = new Map(
          (people ?? []).map(
            (p: { id: string; name: string }) => [p.id, p.name] as const,
          ),
        );
      }

      // invitation メタ情報のバッチ取得（admin RLS で全件 SELECT 可）
      // details に code が含まれない過去ログ向けの fallback
      const invitationMap = new Map<string, { code: string }>();
      if (invitationIds.size > 0) {
        const { data: invs } = await supabase
          .from("invitations")
          .select("id, code")
          .in("id", Array.from(invitationIds));
        (invs ?? []).forEach((i: { id: string; code: string }) => {
          invitationMap.set(i.id, { code: i.code });
        });
      }

      const list: ActivityEvent[] = [];

      // event_attendees → 申込系イベント
      data.forEach((r: unknown) => {
        const row = r as Record<string, unknown>;
        const id = row.id as string;
        const seminar = Array.isArray(row.seminar)
          ? (row.seminar[0] ?? null)
          : (row.seminar ?? null);
        const applicant = Array.isArray(row.applicant)
          ? (row.applicant[0] ?? null)
          : (row.applicant ?? null);
        const applicantName =
          (applicant as { name?: string } | null)?.name ?? "（名前なし）";
        const seminarTitle =
          (seminar as { title?: string } | null)?.title ?? null;
        const seminarDate =
          (seminar as { date?: string } | null)?.date ?? null;
        const approverId = row.approved_by as string | null;
        const approverName = approverId
          ? (nameMap.get(approverId) ?? null)
          : null;

        const push = (kind: ActivityKind, at: string | null) => {
          if (!at) return;
          list.push({
            id: `${id}-${kind}`,
            kind,
            at,
            applicantName,
            seminarTitle,
            seminarDate,
            approverName: kind === "approved" ? approverName : null,
            actorName: null,
            tierChange: null,
            reason: null,
            inviteCode: null,
            issuedBy: null,
            newSubStatus: null,
            paymentAmount: null,
            paymentCurrency: null,
          });
        };
        push("applied", row.applied_at as string | null);
        push("approved", row.approved_at as string | null);
        push("rejected", row.rejected_at as string | null);
        push("cancelled", row.cancelled_at as string | null);
      });

      // activity_log → 各種 action 振り分け
      const emptyExtras = {
        seminarTitle: null,
        seminarDate: null,
        approverName: null,
        tierChange: null,
        reason: null,
        inviteCode: null,
        issuedBy: null,
        newSubStatus: null,
        paymentAmount: null,
        paymentCurrency: null,
      } as const;

      logs.forEach((l: Record<string, unknown>) => {
        const action = l.action as string;
        const subjectType = l.subject_type as string;
        const subjectId = l.subject_id as string;
        const actorId = l.actor_id as string | null;
        const details = (l.details as Record<string, unknown>) ?? {};
        const createdAt = l.created_at as string;

        // ── applicant 系（tier 変更・メモ更新・サブスク系） ──
        if (subjectType === "applicant") {
          const applicantName = nameMap.get(subjectId) ?? "（名前なし）";
          const actorName = actorId ? (nameMap.get(actorId) ?? null) : null;

          if (action === "tier_change") {
            list.push({
              id: `log-${l.id}`,
              kind: "tier_change",
              at: createdAt,
              applicantName,
              ...emptyExtras,
              actorName,
              tierChange: {
                from: (details.old_tier as Tier) ?? "tentative",
                to: (details.new_tier as Tier) ?? "tentative",
              },
              reason: (details.reason as string | null) ?? null,
            });
            return;
          }

          if (action === "admin_notes_update") {
            list.push({
              id: `log-${l.id}`,
              kind: "admin_notes_update",
              at: createdAt,
              applicantName,
              ...emptyExtras,
              actorName,
            });
            return;
          }

          if (action === "subscription_created") {
            const tc = details.tier_change as
              | { from?: string; to?: string }
              | undefined;
            list.push({
              id: `log-${l.id}`,
              kind: "subscription_created",
              at: createdAt,
              applicantName,
              ...emptyExtras,
              actorName,
              tierChange: tc?.from && tc?.to
                ? { from: tc.from as Tier, to: tc.to as Tier }
                : null,
            });
            return;
          }

          if (action === "subscription_status_change") {
            list.push({
              id: `log-${l.id}`,
              kind: "subscription_status_change",
              at: createdAt,
              applicantName,
              ...emptyExtras,
              actorName,
              newSubStatus: (details.new_status as string | null) ?? null,
            });
            return;
          }

          if (action === "subscription_canceled") {
            const tc = details.tier_change as
              | { from?: string; to?: string }
              | undefined;
            list.push({
              id: `log-${l.id}`,
              kind: "subscription_canceled",
              at: createdAt,
              applicantName,
              ...emptyExtras,
              actorName,
              tierChange: tc?.from && tc?.to
                ? { from: tc.from as Tier, to: tc.to as Tier }
                : null,
            });
            return;
          }

          if (action === "payment_failed") {
            list.push({
              id: `log-${l.id}`,
              kind: "payment_failed",
              at: createdAt,
              applicantName,
              ...emptyExtras,
              actorName,
              paymentAmount:
                typeof details.amount_due === "number"
                  ? details.amount_due
                  : null,
              paymentCurrency:
                (details.currency as string | null) ?? null,
            });
            return;
          }
        }

        // ── invitation 系（admin / member の発行・取消・復活） ──
        if (subjectType === "invitation") {
          const inviteCode =
            (details.code as string | null) ??
            invitationMap.get(subjectId)?.code ??
            null;
          const issuedBy =
            (details.issued_by as "admin" | "member" | null | undefined) ?? null;
          const actorName = actorId ? (nameMap.get(actorId) ?? null) : null;
          // invitations 系の applicantName 欄は「発行者」を入れる
          const displayActor = actorName ?? (issuedBy === "admin" ? "主催者" : "—");

          if (
            action === "invitation_create" ||
            action === "invitation_revoke" ||
            action === "invitation_restore"
          ) {
            list.push({
              id: `log-${l.id}`,
              kind: action as ActivityKind,
              at: createdAt,
              applicantName: displayActor,
              ...emptyExtras,
              actorName,
              inviteCode,
              issuedBy,
            });
            return;
          }
        }
      });

      list.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
      setEvents(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filtered = events.filter(
    (e) => filter === "all" || e.kind === filter
  );

  return (
    <div>
      {error && (
        <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[#8a4538] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">取得エラー</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            "all",
            "applied",
            "approved",
            "rejected",
            "cancelled",
            "tier_change",
            "admin_notes_update",
            "invitation_create",
            "invitation_revoke",
            "invitation_restore",
            "subscription_created",
            "subscription_status_change",
            "subscription_canceled",
            "payment_failed",
          ] as const
        ).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === k
                ? "bg-[#1c3550] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {k === "all" ? "すべて" : kindStyle[k].label}
          </button>
        ))}
      </div>

      {loading && (
        <EditorialCard className="text-center py-16">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">読み込み中...</p>
        </EditorialCard>
      )}

      {!loading && (
        <EditorialCard>
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-gray-400">
                該当するアクティビティはありません
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((e) => {
                const s = kindStyle[e.kind];
                const Icon = s.Icon;
                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 px-4 sm:px-5 py-3"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${s.bg} ${s.border}`}
                    >
                      <Icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${s.color}`}>
                          {s.label}
                        </span>
                        <span className="text-sm text-[#1c3550] font-semibold">
                          {e.applicantName}
                        </span>
                        {e.seminarTitle && (
                          <span className="text-xs text-gray-500">
                            → {e.seminarTitle}
                          </span>
                        )}
                        {/* tier 変更 / サブスク tier 連動 */}
                        {e.tierChange && (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <TierPill tier={e.tierChange.from} />
                            <span className="text-gray-400">→</span>
                            <TierPill tier={e.tierChange.to} />
                          </span>
                        )}
                        {/* invitation 系: コード表示 + 発行元バッジ */}
                        {e.inviteCode && (
                          <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#fbf3e3] text-[#8a5a1c] border border-[#e6d3a3]">
                            {e.inviteCode}
                          </code>
                        )}
                        {e.issuedBy && (
                          <span className="text-[10px] tracking-[0.18em] uppercase text-gray-400">
                            {e.issuedBy === "admin" ? "by Admin" : "by Member"}
                          </span>
                        )}
                        {/* サブスク状態変化 */}
                        {e.newSubStatus && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                            status: {e.newSubStatus}
                          </span>
                        )}
                        {/* 請求失敗の金額 */}
                        {e.paymentAmount !== null && (
                          <span className="text-xs text-[#8a4538]">
                            {(e.paymentCurrency ?? "").toUpperCase()}{" "}
                            {(e.paymentAmount / 100).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-gray-400">
                        <span>{formatDateTime(e.at)}</span>
                        {e.approverName && (
                          <span>承認者: {e.approverName}</span>
                        )}
                        {e.actorName && (
                          <span>主催者: {e.actorName}</span>
                        )}
                        {e.reason && (
                          <span className="text-gray-500">
                            理由: {e.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </EditorialCard>
      )}
    </div>
  );
}

// tier 表示用の小型 pill（タイムライン内で旧→新を示すため通常の TierBadge より細身）。
function TierPill({ tier }: { tier: Tier }) {
  const t = tierStyle[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${t.bg} ${t.border} ${t.text}`}
    >
      <span className={`w-1 h-1 rounded-full ${t.dotBg}`} />
      {t.label}
    </span>
  );
}
