"use client";

// 全会員タブの詳細展開エリア。
// MembersTab の各行を開いた時に表示される。
//
// セクション構成:
//   1. プロフィール詳細（連絡先・呼び名・ヘッドライン）+ 完成度バー
//   2. アクティビティ（登録日・最終申込日・参加履歴）
//   3. Stripe / Subscription（customer dashboard リンク、status、portal 発行）
//   4. 管理者メモ（applicants.admin_notes 編集）
//   5. 主催者操作（手動 tier 上書き → /api/admin/tier）

import { useMemo, useState } from "react";
import Link from "next/link";

// 会員の段の表示名。MembersTab の PLAN_LABELS と同じ内容にそろえる。
const ADMIN_PLAN_LABELS: Record<string, string> = {
  online: "オンライン",
  real: "リアル",
  invite: "ご招待",
  premium: "プレミアム",
  terakoya: "テラこや(旧)",
  salon: "サロン(旧)",
  pro: "本会員(旧)",
};
import {
  Mail,
  Calendar,
  CreditCard,
  ExternalLink,
  Link2,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Brain,
  Hash,
  UserMinus,
  UserCheck,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tierStyle, type Tier } from "./EditorialChrome";
import { formatDate, formatDateTime } from "./EditorialFormat";
import { completenessColorClass } from "@/lib/profile-completeness";
import { grantAiCloneToMember } from "../_actions/grant-ai-clone";
import type { MemberRow } from "./MembersTab";
import { uiAlert, uiConfirm } from "@/lib/ui-dialog";

interface MemberDetailExpansionProps {
  member: MemberRow;
  // 行レベルの楽観的更新用。tier 変更・memo 保存後にこれ経由で MembersTab 側を更新する。
  onUpdate: (patch: Partial<MemberRow>) => void;
  // 削除完了時：一覧から行を取り除く。
  onDelete: () => void;
}

// Subscription status の表示スタイル。Stripe の status をそのまま反映している。
const subStatusStyle: Record<
  string,
  { label: string; tone: "ok" | "warn" | "danger" | "neutral" }
> = {
  active: { label: "Active", tone: "ok" },
  trialing: { label: "Trialing", tone: "ok" },
  past_due: { label: "Past due", tone: "warn" },
  unpaid: { label: "Unpaid", tone: "danger" },
  canceled: { label: "Canceled", tone: "neutral" },
  incomplete: { label: "Incomplete", tone: "warn" },
  incomplete_expired: { label: "Expired", tone: "neutral" },
  paused: { label: "Paused", tone: "warn" },
};

function SubscriptionBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold bg-gray-50 border-gray-200 text-gray-500">
        未契約
      </span>
    );
  }
  const meta = subStatusStyle[status] ?? {
    label: status,
    tone: "neutral" as const,
  };
  const toneClass =
    meta.tone === "ok"
      ? "bg-[#e9efe9] border-[#c5d3c8] text-[#3d6651]"
      : meta.tone === "warn"
        ? "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c]"
        : meta.tone === "danger"
          ? "bg-[#f3e9e6] border-[#d8c4be] text-[#8a4538]"
          : "bg-gray-50 border-gray-200 text-gray-500";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${toneClass}`}
    >
      {meta.label}
    </span>
  );
}

export function MemberDetailExpansion({
  member,
  onUpdate,
  onDelete,
}: MemberDetailExpansionProps) {
  const supabase = useMemo(() => createClient(), []);

  // メモ編集
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string>(member.admin_notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  // tier 上書き
  const [tierEditing, setTierEditing] = useState(false);
  const [tierDraft, setTierDraft] = useState<Tier>(member.tier);
  const [tierReason, setTierReason] = useState<string>("");
  const [tierSaving, setTierSaving] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);

  // 会員の段 手動付与
  const [planDraft, setPlanDraft] = useState<string>(member.plan ?? "");
  const [planReason, setPlanReason] = useState("");
  const [planSaving, setPlanSaving] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planDone, setPlanDone] = useState(false);

  async function handleSavePlan(force = false) {
    setPlanSaving(true);
    setPlanError(null);
    setPlanDone(false);
    try {
      const res = await fetch("/api/admin/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          applicantId: member.id,
          plan: planDraft || null,
          reason: planReason || null,
          force,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409 && data?.needsConfirm) {
        // 課金中の人。何が起きるかを伝えてから、もう一度だけ実行させる。
        const ok = await uiConfirm({
          title: "課金中の会員です",
          message: data.message,
          okLabel: "続行する",
          danger: true,
        });
        if (ok) {
          setPlanSaving(false);
          return handleSavePlan(true);
        }
        setPlanSaving(false);
        return;
      }
      if (!res.ok) {
        setPlanError(data?.error ?? `保存に失敗しました（${res.status}）`);
        setPlanSaving(false);
        return;
      }
      setPlanDone(true);
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "通信に失敗しました");
    }
    setPlanSaving(false);
  }

  // 右腕AI 付与
  const [aiGranting, setAiGranting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGrant, setAiGrant] = useState<{
    slug: string;
    already: boolean;
  } | null>(null);

  // Portal URL 発行
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalCopied, setPortalCopied] = useState(false);

  // 会員番号 編集
  const [memberNoEditing, setMemberNoEditing] = useState(false);
  const [memberNoDraft, setMemberNoDraft] = useState<string>(
    member.member_no != null ? String(member.member_no) : "",
  );
  const [memberNoSaving, setMemberNoSaving] = useState(false);
  const [memberNoError, setMemberNoError] = useState<string | null>(null);

  // 退会 / 再入会
  const [withdrawPending, setWithdrawPending] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawNotice, setWithdrawNotice] = useState<string | null>(null);

  // 削除（会員名タイプで確認）
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isWithdrawn = !!member.withdrawn_at;
  // 削除確認で入力させる文字列（名前が無ければ「削除」）
  const confirmTarget =
    (member.name || member.nickname || member.email || "").trim() || "削除";

  const completenessTone = completenessColorClass(member.completeness);
  const customerDashboardUrl = member.stripe_customer_id
    ? `https://dashboard.stripe.com/customers/${member.stripe_customer_id}`
    : null;

  // メモ保存
  const handleSaveNotes = async () => {
    setNotesSaving(true);
    setNotesError(null);
    const newValue = notesDraft.trim().length > 0 ? notesDraft : null;
    const { error } = await supabase
      .from("applicants")
      .update({ admin_notes: newValue })
      .eq("id", member.id);
    if (error) {
      setNotesError(`保存失敗：${error.message}`);
      setNotesSaving(false);
      return;
    }
    onUpdate({ admin_notes: newValue });
    setNotesEditing(false);
    setNotesSaving(false);
  };

  // tier 上書き（API 経由 → activity_log に記録）
  const handleSaveTier = async () => {
    if (tierDraft === member.tier) {
      setTierEditing(false);
      return;
    }
    setTierSaving(true);
    setTierError(null);
    const res = await fetch("/api/admin/tier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicantId: member.id,
        tier: tierDraft,
        reason: tierReason.trim().length > 0 ? tierReason : null,
      }),
    });
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setTierError(error ?? "tier 変更に失敗しました");
      setTierSaving(false);
      return;
    }
    onUpdate({ tier: tierDraft });
    setTierEditing(false);
    setTierReason("");
    setTierSaving(false);
  };

  // 右腕AI（AI Clone テナント）をこの会員に手動付与
  const handleGrantAiClone = async () => {
    setAiGranting(true);
    setAiError(null);
    const res = await grantAiCloneToMember({
      userId: member.id,
      name: member.name || member.nickname || null,
    });
    if (!res.ok) {
      setAiError(res.error);
      setAiGranting(false);
      return;
    }
    setAiGrant({ slug: res.slug, already: res.alreadyExisted });
    setAiGranting(false);
  };

  // 会員番号を保存（admin は特権列ガードを通過できるので client 更新で可）
  const handleSaveMemberNo = async () => {
    setMemberNoSaving(true);
    setMemberNoError(null);
    const trimmed = memberNoDraft.trim();
    let value: number | null;
    if (trimmed === "") {
      value = null;
    } else {
      const n = Number(trimmed);
      if (!Number.isInteger(n) || n < 0) {
        setMemberNoError("0以上の整数、または空欄（未採番）で入力してください");
        setMemberNoSaving(false);
        return;
      }
      value = n;
      // 重複は禁止せず警告のみ（管理者判断で続行できる）
      const { data: dup } = await supabase
        .from("applicants")
        .select("id")
        .eq("member_no", value)
        .neq("id", member.id)
        .limit(1);
      if (dup && dup.length > 0) {
        const ok = await uiConfirm({
          title: "会員番号が重複しています",
          message: `会員番号 ${value} は既に他の会員が使用中です。それでも設定しますか？`,
          okLabel: "このまま設定する",
          danger: true,
        });
        if (!ok) {
          setMemberNoSaving(false);
          return;
        }
      }
    }
    const { error } = await supabase
      .from("applicants")
      .update({ member_no: value })
      .eq("id", member.id);
    if (error) {
      setMemberNoError(`保存失敗：${error.message}`);
      setMemberNoSaving(false);
      return;
    }
    onUpdate({ member_no: value });
    setMemberNoEditing(false);
    setMemberNoSaving(false);
  };

  // 退会 / 再入会（API 経由。退会時は Stripe 解約 + activity_log 記録）
  const handleToggleWithdraw = async () => {
    const withdraw = !isWithdrawn;
    if (withdraw) {
      const ok = await uiConfirm({
        title: "この会員を退会にします",
        message: "稼働中の Stripe サブスクがあれば解約されます。",
        okLabel: "退会にする",
        danger: true,
      });
      if (!ok) return;
    }
    setWithdrawPending(true);
    setWithdrawError(null);
    setWithdrawNotice(null);
    const res = await fetch("/api/admin/member/withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ applicantId: member.id, withdraw }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      withdrawn_at?: string | null;
      warning?: string | null;
      error?: string;
    } | null;
    if (!res.ok || !data?.ok) {
      setWithdrawError(data?.error ?? "処理に失敗しました");
      setWithdrawPending(false);
      return;
    }
    onUpdate({ withdrawn_at: data.withdrawn_at ?? null });
    if (data.warning) setWithdrawNotice(data.warning);
    setWithdrawPending(false);
  };

  // 削除（レコード + 認証 + 関連。確認テキスト一致時のみ）
  const handleDelete = async () => {
    setDeletePending(true);
    setDeleteError(null);
    const res = await fetch("/api/admin/member/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ applicantId: member.id }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      warning?: string | null;
      error?: string;
    } | null;
    if (!res.ok || !data?.ok) {
      setDeleteError(data?.error ?? "削除に失敗しました");
      setDeletePending(false);
      return;
    }
    // warning があってもレコードは消えているので一覧からは除去する
    if (data.warning) void uiAlert({ message: data.warning, danger: true });
    onDelete();
  };

  // Portal URL を発行
  const handleIssuePortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    setPortalUrl(null);
    setPortalCopied(false);
    const res = await fetch("/api/admin/stripe/portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ applicantId: member.id }),
    });
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setPortalError(error ?? "Portal URL の発行に失敗しました");
      setPortalLoading(false);
      return;
    }
    const { url } = (await res.json()) as { url: string };
    setPortalUrl(url);
    setPortalLoading(false);
  };

  return (
    <div className="space-y-5 text-sm">
      {/* 1. プロフィール詳細 + 完成度 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold">
            Profile
          </span>
          <CompletenessBar percent={member.completeness} tone={completenessTone} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {member.email && (
            <Field icon={<Mail className="w-4 h-4 text-gray-400" />}>
              <span className="break-all">{member.email}</span>
            </Field>
          )}
          {member.nickname && (
            <Field label="NICKNAME">{member.nickname}</Field>
          )}
          {member.job_title && <Field label="JOB">{member.job_title}</Field>}
          {member.headline && (
            <Field label="HEADLINE" wide>
              {member.headline}
            </Field>
          )}
          {!member.nickname &&
            !member.job_title &&
            !member.headline &&
            !member.email && (
              <span className="text-gray-400 italic">
                プロフィール未入力
              </span>
            )}
        </div>
      </section>

      {/* 2. アクティビティ */}
      <section>
        <div className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold mb-2">
          Activity
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Field icon={<Calendar className="w-4 h-4 text-gray-400" />}>
            <span className="text-gray-500 mr-1">登録:</span>
            <span>{formatDate(member.created_at)}</span>
          </Field>
          <Field icon={<Calendar className="w-4 h-4 text-gray-400" />}>
            <span className="text-gray-500 mr-1">最終申込:</span>
            <span>
              {member.last_applied_at
                ? formatDateTime(member.last_applied_at)
                : "—"}
            </span>
          </Field>
          <Field>
            <span className="text-gray-500 mr-1">参加実績:</span>
            <span className="tabular-nums">
              {member.attended_count} 回 / 申込 {member.applied_count}
            </span>
          </Field>
        </div>
      </section>

      {/* 3. Stripe / Subscription */}
      <section className="bg-white border border-gray-200 rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#1c3550]" />
            <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold">
              Stripe
            </span>
            <SubscriptionBadge status={member.subscription_status} />
          </div>
          {customerDashboardUrl && (
            <a
              href={customerDashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#1c3550] hover:text-[#c08a3e] font-semibold"
            >
              Stripe Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {!member.stripe_customer_id ? (
          <p className="text-xs text-gray-400 italic">
            Stripe Customer は未作成（未課金）
          </p>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">
              <span className="text-[10px] tracking-[0.2em] text-gray-400 uppercase mr-2">
                Customer
              </span>
              <span className="font-mono">{member.stripe_customer_id}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleIssuePortal}
                disabled={portalLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs font-bold text-[#1c3550] hover:border-[#c08a3e] hover:text-[#8a5a1c] disabled:opacity-50"
              >
                {portalLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Link2 className="w-3 h-3" />
                )}
                Customer Portal URL を発行
              </button>
              {portalUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(portalUrl);
                      setPortalCopied(true);
                      setTimeout(() => setPortalCopied(false), 2000);
                    } catch {
                      // クリップボード失敗時は静かに無視
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    portalCopied
                      ? "bg-[#3d6651] text-white"
                      : "bg-[#1c3550] text-white hover:bg-[#102032]"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {portalCopied ? "コピーしました" : "URL をコピー"}
                </button>
              )}
            </div>

            {portalUrl && (
              <p className="text-[11px] text-gray-500 break-all">
                {portalUrl}
                <span className="block text-[10px] text-gray-400 mt-0.5">
                  ※ 短時間で失効します。発行直後に LINE/メールで送ってください
                </span>
              </p>
            )}
            {portalError && (
              <p className="text-[11px] text-[#8a4538] flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {portalError}
              </p>
            )}
          </div>
        )}
      </section>

      {/* 4. 管理者メモ */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold">
            管理者メモ
          </span>
          {!notesEditing && (
            <button
              type="button"
              onClick={() => {
                setNotesDraft(member.admin_notes ?? "");
                setNotesEditing(true);
                setNotesError(null);
              }}
              className="text-xs text-[#c08a3e] hover:text-[#8a5a1c] font-semibold"
            >
              編集
            </button>
          )}
        </div>
        {notesEditing ? (
          <div className="space-y-2">
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={3}
              placeholder="この会員についてのメモ（属性・優先度・対応履歴など）"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1c3550] text-white rounded-md text-xs font-bold hover:bg-[#102032] disabled:opacity-50"
              >
                {notesSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotesEditing(false);
                  setNotesError(null);
                }}
                disabled={notesSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-xs font-bold hover:border-gray-300"
              >
                <X className="w-3 h-3" />
                キャンセル
              </button>
            </div>
            {notesError && (
              <p className="text-[11px] text-[#8a4538]">{notesError}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[1.5rem]">
            {member.admin_notes || (
              <span className="text-gray-400 italic">（メモなし）</span>
            )}
          </p>
        )}
      </section>

      {/* 5. 主催者操作：手動 tier 上書き */}
      <section className="bg-[#fdfaf3] border border-[#e6d3a3] rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#8a5a1c]" />
            <span className="text-[10px] tracking-[0.25em] text-[#8a5a1c] uppercase font-semibold">
              主催者操作
            </span>
          </div>
          {!tierEditing && (
            <button
              type="button"
              onClick={() => {
                setTierDraft(member.tier);
                setTierReason("");
                setTierEditing(true);
                setTierError(null);
              }}
              className="text-xs text-[#8a5a1c] hover:text-[#c08a3e] font-semibold"
            >
              tier を変更
            </button>
          )}
        </div>

        {tierEditing ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600">変更先:</span>
              {(["tentative", "registered", "paid"] as Tier[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTierDraft(t)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors ${
                    tierDraft === t
                      ? `${tierStyle[t].bg} ${tierStyle[t].border} ${tierStyle[t].text}`
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${tierStyle[t].dotBg}`}
                  />
                  {tierStyle[t].label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={tierReason}
              onChange={(e) => setTierReason(e.target.value)}
              placeholder="変更理由（任意・履歴に残ります）"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveTier}
                disabled={tierSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1c3550] text-white rounded-md text-xs font-bold hover:bg-[#102032] disabled:opacity-50"
              >
                {tierSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                変更を確定
              </button>
              <button
                type="button"
                onClick={() => {
                  setTierEditing(false);
                  setTierError(null);
                }}
                disabled={tierSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-xs font-bold hover:border-gray-300"
              >
                <X className="w-3 h-3" />
                キャンセル
              </button>
            </div>
            {tierError && (
              <p className="text-[11px] text-[#8a4538] flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {tierError}
              </p>
            )}
            <p className="text-[10px] text-gray-500">
              ⚠️ Stripe サブスク状態とは独立して動きます。整合性に注意してください。
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-600">
            現在: <strong>{tierStyle[member.tier].label}</strong>{" "}
            <span className="text-gray-400">
              （変更は activity_log に記録されます）
            </span>
          </p>
        )}

        {/* 会員の段の手動付与。
            デモ用アカウント・知人への無料開放・決済トラブルの暫定対応に使う。
            plan だけを書き、tier と subscription_status は触らない。
            株アプリの会員判定は plan を見るので、これだけで Company Note の
            会員機能が開く。 */}
        <div className="mt-4 pt-4 border-t border-[#e6d3a3]/60">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-[#8a5a1c] flex-shrink-0" />
            <span className="text-xs text-gray-700">会員の段（手動付与）</span>
          </div>
          <p className="text-[11px] text-gray-600 mb-2.5">
            現在:{" "}
            <strong>
              {member.plan
                ? (ADMIN_PLAN_LABELS[member.plan] ?? member.plan)
                : "なし（無料会員）"}
            </strong>
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            {([
              { v: "", label: "なし" },
              { v: "online", label: "オンライン" },
              { v: "real", label: "リアル" },
              { v: "invite", label: "ご招待" },
              { v: "premium", label: "プレミアム" },
            ] as const).map((p) => (
              <button
                key={p.v || "none"}
                type="button"
                onClick={() => setPlanDraft(p.v)}
                className={`px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors ${
                  planDraft === p.v
                    ? "bg-[#eef5f1] border-[#bcd9c9] text-[#1b4332]"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={planReason}
            onChange={(e) => setPlanReason(e.target.value)}
            placeholder="理由（任意・履歴に残ります。例: デモ用 / 知人枠）"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent mb-2"
          />
          <button
            type="button"
            onClick={() => handleSavePlan(false)}
            disabled={planSaving || planDraft === (member.plan ?? "")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b4332] text-white rounded-md text-xs font-bold hover:bg-[#14532d] disabled:opacity-40"
          >
            {planSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            段を保存
          </button>
          {planError && (
            <p className="mt-2 text-[11px] text-[#8a4538] flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {planError}
            </p>
          )}
          {planDone && (
            <p className="mt-2 text-[11px] text-[#1b4332]">
              保存しました。反映まで数十秒かかることがあります。
            </p>
          )}
          <p className="mt-2 text-[10px] text-gray-500 leading-relaxed">
            課金中の方の段をここで変えると、次に Stripe から通知が届いた時点で
            元に戻ります。課金中の段はご本人に /upgrade から変更していただくのが
            正しい手順です。
          </p>
        </div>

        {/* 会員番号（有料会員で自動採番。ここで手動編集できる） */}
        <div className="mt-4 pt-4 border-t border-[#e6d3a3]/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Hash className="w-4 h-4 text-[#8a5a1c] flex-shrink-0" />
              <span className="text-xs text-gray-700">会員番号</span>
              {!memberNoEditing && (
                <span className="text-sm font-bold text-[#1c3550] tabular-nums">
                  {member.member_no != null
                    ? `No.${member.member_no}`
                    : "— （未採番）"}
                </span>
              )}
            </div>
            {!memberNoEditing && (
              <button
                type="button"
                onClick={() => {
                  setMemberNoDraft(
                    member.member_no != null ? String(member.member_no) : "",
                  );
                  setMemberNoEditing(true);
                  setMemberNoError(null);
                }}
                className="text-xs text-[#8a5a1c] hover:text-[#c08a3e] font-semibold"
              >
                編集
              </button>
            )}
          </div>
          {memberNoEditing && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <input
                type="number"
                min={0}
                value={memberNoDraft}
                onChange={(e) => setMemberNoDraft(e.target.value)}
                placeholder="例: 12（空欄=未採番）"
                className="w-40 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleSaveMemberNo}
                disabled={memberNoSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1c3550] text-white rounded-md text-xs font-bold hover:bg-[#102032] disabled:opacity-50"
              >
                {memberNoSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setMemberNoEditing(false);
                  setMemberNoError(null);
                }}
                disabled={memberNoSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-xs font-bold hover:border-gray-300"
              >
                <X className="w-3 h-3" />
                キャンセル
              </button>
            </div>
          )}
          {memberNoError && (
            <p className="mt-1 text-[11px] text-[#8a4538]">{memberNoError}</p>
          )}
          <p className="text-[10px] text-gray-500 mt-1.5">
            有料会員になると自動採番されます。ここで手動の上書き・変更も可能（重複は警告のみ）。
          </p>
        </div>

        {/* 右腕AI 手動付与（この会員だけテナントを払い出す） */}
        <div className="mt-4 pt-4 border-t border-[#e6d3a3]/60">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Brain className="w-4 h-4 text-[#8a5a1c] flex-shrink-0" />
              <span className="text-xs text-gray-700">
                右腕AI（テナントを払い出して使えるようにする）
              </span>
            </div>
            <button
              type="button"
              onClick={handleGrantAiClone}
              disabled={aiGranting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#8a5a1c]/40 bg-white text-xs font-bold text-[#8a5a1c] hover:border-[#c08a3e] hover:bg-[#fbf3e3] disabled:opacity-50"
            >
              {aiGranting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Brain className="w-3 h-3" />
              )}
              右腕AIを付与
            </button>
          </div>

          {aiGrant && (
            <p className="mt-2 text-[11px] text-[#3d6651] flex items-start gap-1">
              <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>
                {aiGrant.already
                  ? "この会員には既に付与済みです。"
                  : "付与しました。この会員のサイドバーに右腕AIが出ます。"}
                {aiGrant.slug && (
                  <Link
                    href={`/clone/${aiGrant.slug}/settings`}
                    target="_blank"
                    className="ml-1 font-mono underline hover:no-underline"
                  >
                    /clone/{aiGrant.slug}
                  </Link>
                )}
              </span>
            </p>
          )}
          {aiError && (
            <p className="mt-2 text-[11px] text-[#8a4538] flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {aiError}
            </p>
          )}
          <p className="text-[10px] text-gray-500 mt-1.5">
            通常は非表示。ここで付与した会員だけが右腕AIを使えるようになります。
          </p>
        </div>
      </section>

      {/* 6. 危険操作：退会 / 削除 */}
      <section className="bg-white border border-[#d8c4be] rounded-md p-4">
        <div className="text-[10px] tracking-[0.25em] text-[#8a4538] uppercase font-semibold mb-3">
          危険操作
        </div>

        {/* 退会 / 再入会 */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <span>ステータス:</span>
              {isWithdrawn ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold bg-gray-100 border-gray-300 text-gray-500">
                  退会中
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold bg-[#e9efe9] border-[#c5d3c8] text-[#3d6651]">
                  在籍中
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {isWithdrawn
                ? "再入会で在籍に戻せます（履歴に残ります）。"
                : "退会にすると Stripe サブスクも解約します。レコードは残るので再入会できます。"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleWithdraw}
            disabled={withdrawPending}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border disabled:opacity-50 ${
              isWithdrawn
                ? "border-[#3d6651]/40 bg-white text-[#3d6651] hover:bg-[#e9efe9]"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {withdrawPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isWithdrawn ? (
              <UserCheck className="w-3 h-3" />
            ) : (
              <UserMinus className="w-3 h-3" />
            )}
            {isWithdrawn ? "在籍に戻す" : "退会にする"}
          </button>
        </div>
        {withdrawError && (
          <p className="mt-2 text-[11px] text-[#8a4538] flex items-start gap-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            {withdrawError}
          </p>
        )}
        {withdrawNotice && (
          <p className="mt-2 text-[11px] text-[#8a5a1c] bg-[#fbf3e3] border border-[#e6d3a3] rounded px-2 py-1.5 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            {withdrawNotice}
          </p>
        )}

        {/* 削除（会員名タイプで確認） */}
        <div className="mt-4 pt-4 border-t border-[#d8c4be]/60">
          {!deleteOpen ? (
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(true);
                setDeleteConfirmText("");
                setDeleteError(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border border-[#d8c4be] bg-white text-[#8a4538] hover:bg-[#f3e9e6]"
            >
              <Trash2 className="w-3 h-3" />
              この会員を削除
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] text-[#8a4538] leading-relaxed">
                <strong>元に戻せません。</strong>{" "}
                会員レコード・関連データ・ログイン用アカウントを削除します（戻ってくる時は新規登録し直し・会員番号は再採番）。確認のため{" "}
                <strong className="font-mono bg-[#f3e9e6] px-1 rounded">
                  {confirmTarget}
                </strong>{" "}
                と入力してください。
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={confirmTarget}
                className="w-full px-3 py-2 bg-white border border-[#d8c4be] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#8a4538] focus:border-transparent"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={
                    deletePending || deleteConfirmText.trim() !== confirmTarget
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8a4538] text-white rounded-md text-xs font-bold hover:bg-[#6f3529] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deletePending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  完全に削除する
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeleteError(null);
                  }}
                  disabled={deletePending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-xs font-bold hover:border-gray-300"
                >
                  <X className="w-3 h-3" />
                  キャンセル
                </button>
              </div>
              {deleteError && (
                <p className="text-[11px] text-[#8a4538] flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {deleteError}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// 小さな情報ラベル付き行（icon または label）。
function Field({
  icon,
  label,
  wide = false,
  children,
}: {
  icon?: React.ReactNode;
  label?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-start gap-2 text-gray-700 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      {icon}
      {label && (
        <span className="text-[10px] tracking-[0.2em] text-gray-400 mt-0.5 uppercase">
          {label}
        </span>
      )}
      <span className="min-w-0">{children}</span>
    </div>
  );
}

// プロフィール完成度バー。
function CompletenessBar({
  percent,
  tone,
}: {
  percent: number;
  tone: { text: string; bar: string; bg: string };
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-bold tabular-nums ${tone.text}`}>
        {percent}%
      </span>
      <div className={`w-24 h-1.5 rounded-full overflow-hidden ${tone.bg}`}>
        <div
          className={`h-full ${tone.bar} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
