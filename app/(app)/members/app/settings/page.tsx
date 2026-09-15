// 設定（Phase 1：実DB化）。
// ユーザーが「自分の契約状況（サロン / 右腕AI）」を確認・管理する画面。
//
// データソース:
//   - applicants（tier / subscription_status / stripe_customer_id / name / nickname）
//   - ai_clone_tenant_members + ai_clone_tenants（自分が所属するテナント一覧）
//
// 認証:
//   getUser() が null なら /login へ。
//
// 2ゲート分離（feedback_access_gate_pattern.md）:
//   - サロン本会員特典 = applicants.tier === 'paid'
//   - 右腕AI Clone     = ai_clone_tenant_members に行あり
//   両者は独立しているため、本ページでも2セクションに分けて並列表示する。
//
// 「使えないものは見せない」方針:
//   - 通知設定・メアド変更・退会は実装が無いので撤去（虚仮威し回避）
//   - プロフィール編集は /mypage/edit と完全重複なので、リンク誘導のみ
//   - AI Clone セクションは tenant_members に居る人だけ表示
//
// レンダリング戦略:
//   Server Component。Customer Portal の起動だけ Client Component (_components/ManageSalonButton)。

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Brain,
  ExternalLink,
  Mail,
  Pencil,
  Settings as SettingsIcon,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ManageSalonButton } from "./_components/ManageSalonButton";
import { isActiveMember } from "@/lib/membership/plans";

// ─── 型 ────────────────────────────────────────────────────────────

interface MyApplicant {
  name: string;
  nickname: string | null;
  email: string | null;
  plan: string | null;
  tier: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
}

interface CloneTenantRef {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  status: string;
}

interface MyCloneMembership {
  tenant_id: string;
  role: string;
  tenant: CloneTenantRef;
}

// ─── 表示マッピング ───────────────────────────────────────────────

const PLAN_LABEL: Record<string, string> = {
  assistant: "アシスタント",
  partner: "パートナー",
  team: "チーム",
  custom: "カスタム",
};

const ROLE_LABEL: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  member: "メンバー",
  viewer: "閲覧",
};

const TENANT_STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  active: {
    label: "アクティブ",
    className:
      "bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] border-[var(--gia-teal)]/30",
  },
  paused: {
    label: "一時停止",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  terminated: {
    label: "終了",
    className: "bg-gray-50 text-gray-500 border-gray-200",
  },
};

const SUBSCRIPTION_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  active: {
    label: "アクティブ",
    className:
      "bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] border-[var(--gia-teal)]/30",
  },
  past_due: {
    label: "支払い遅延",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  canceled: {
    label: "キャンセル済",
    className: "bg-gray-50 text-gray-500 border-gray-200",
  },
  incomplete: {
    label: "未完了",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

// ─── ページ本体 ────────────────────────────────────────────────────

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // applicants と clone memberships を並列フェッチ
  const [applicantRes, cloneRes] = await Promise.all([
    supabase
      .from("applicants")
      .select(
        "name, nickname, plan, tier, subscription_status, stripe_customer_id",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("ai_clone_tenant_members")
      .select(
        `
        tenant_id,
        role,
        tenant:ai_clone_tenants(
          id, name, slug, plan, status
        )
      `,
      )
      .eq("user_id", user.id),
  ]);

  // applicants 取得失敗 = 表示できる情報がほぼ無い fatal
  if (applicantRes.error && !applicantRes.data) {
    return <ErrorState message={applicantRes.error.message} />;
  }

  // Supabase の型推論回避（mypage と同じパターン）
  const applicantRow =
    (applicantRes.data as Record<string, unknown> | null) ?? null;

  const me: MyApplicant = {
    name: (applicantRow?.name as string) ?? "",
    nickname: (applicantRow?.nickname as string | null) ?? null,
    email: user.email ?? null,
    plan: (applicantRow?.plan as string | null) ?? null,
    tier: (applicantRow?.tier as string | null) ?? null,
    subscription_status:
      (applicantRow?.subscription_status as string | null) ?? null,
    stripe_customer_id:
      (applicantRow?.stripe_customer_id as string | null) ?? null,
  };

  // ai_clone_tenants は埋め込み構文で単数 or 配列で返るので正規化
  const cloneTenants: MyCloneMembership[] = ((cloneRes.data ?? []) as unknown[])
    .map((r) => {
      const row = r as Record<string, unknown>;
      const raw = row.tenant;
      const tenantObj = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);
      if (!tenantObj) return null;
      const t = tenantObj as Record<string, unknown>;
      return {
        tenant_id: row.tenant_id as string,
        role: (row.role as string) ?? "member",
        tenant: {
          id: t.id as string,
          name: (t.name as string) ?? "",
          slug: (t.slug as string) ?? "",
          plan: (t.plan as string | null) ?? null,
          status: (t.status as string) ?? "active",
        },
      };
    })
    .filter((x): x is MyCloneMembership => x !== null);

  // 会員かどうかの判定は lib/membership/plans.ts に集約
  // （tier==='paid' だけだと新しい段の会員を取りこぼす）
  const isPaid = isActiveMember(me);
  const hasActiveSub = me.subscription_status === "active";
  const hasCustomer = !!me.stripe_customer_id;
  const displayName = me.nickname?.trim() || me.name?.trim() || "ゲスト";

  // ─── レンダリング ──────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      {/* ヘッダー（mypage と同じトーン） */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10">
        <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.34em] text-[var(--gia-teal)] uppercase mb-2.5">
          Members ─── Settings
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
          設定
        </h1>
        <p className="text-[13px] text-gray-500 leading-[1.95]">
          アカウント情報と契約状況をご確認いただけます。
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 pb-16 space-y-12">
        {cloneRes.error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              右腕AI 契約情報の取得に失敗しました：{cloneRes.error.message}
            </span>
          </div>
        )}

        {/* ─── アカウント情報 ─── */}
        <section>
          <SectionHeader eyebrow="Account" title="アカウント情報" />
          <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04),0_8px_24px_-12px_rgba(15,31,51,0.06)] divide-y divide-[var(--gia-navy)]/6 overflow-hidden">
            <Row icon={UserIcon} label="お名前">
              <p className="text-sm text-gray-900">
                {displayName}
                {me.nickname && me.name && me.nickname !== me.name && (
                  <span className="text-gray-400 text-xs ml-2">
                    （本名：{me.name}）
                  </span>
                )}
              </p>
            </Row>
            <Row icon={Mail} label="メールアドレス">
              <p className="text-sm text-gray-900">{me.email ?? "—"}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                変更をご希望の方は主催者LINEまでご連絡ください。
              </p>
            </Row>
            <Row icon={Pencil} label="プロフィールカード">
              <Link
                href="/members/app/mypage/edit"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-[var(--gia-navy)]/15 bg-white text-xs font-medium text-[var(--gia-navy)] hover:bg-white/70 hover:border-[var(--gia-navy)]/30 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                マイページから編集
              </Link>
            </Row>
          </div>
        </section>

        {/* ─── サロン契約 ─── */}
        <section>
          <SectionHeader eyebrow="Membership" title="紹介設計研究所（会員）" />
          <SalonPlanCard
            isPaid={isPaid}
            hasActiveSub={hasActiveSub}
            hasCustomer={hasCustomer}
            subscriptionStatus={me.subscription_status}
          />
        </section>

        {/* ─── 右腕AI（tenant_members に居る人だけ表示） ─── */}
        {cloneTenants.length > 0 && (
          <section>
            <SectionHeader eyebrow="Executive Clone" title="右腕AI" />
            <div className="space-y-4">
              {cloneTenants.map((m) => (
                <CloneTenantCard key={m.tenant_id} membership={m} />
              ))}
            </div>
            <p className="text-[11.5px] text-gray-400 mt-3 leading-[1.9] font-[family-name:var(--font-mincho)]">
              プラン変更・解約のご相談は主催者LINEまでご連絡ください。
            </p>
          </section>
        )}

        {/* ─── サポート ─── */}
        <section>
          <SectionHeader eyebrow="Support" title="お問い合わせ" />
          <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 p-6 sm:p-7">
            <p className="text-sm text-gray-700 leading-[1.95]">
              ご質問、変更のご依頼、退会のご相談などは、主催者LINEまでお気軽にご連絡ください。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── サブコンポーネント：セクション見出し ───────────────────────────

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
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
  );
}

// ─── サブコンポーネント：アカウント情報の1行 ─────────────────────────

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon?: typeof UserIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 px-6 py-5 sm:px-7">
      {Icon && (
        <Icon className="w-4 h-4 text-[var(--gia-teal)] flex-shrink-0 mt-1" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--gia-navy)]/70 uppercase mb-1.5">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

// ─── サブコンポーネント：サロン契約カード ───────────────────────────

function SalonPlanCard({
  isPaid,
  hasActiveSub,
  hasCustomer,
  subscriptionStatus,
}: {
  isPaid: boolean;
  hasActiveSub: boolean;
  hasCustomer: boolean;
  subscriptionStatus: string | null;
}) {
  // 本会員アクティブ
  if (isPaid && hasActiveSub) {
    const badge =
      SUBSCRIPTION_BADGE[subscriptionStatus ?? "active"] ??
      SUBSCRIPTION_BADGE.active;
    return (
      <article className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04),0_8px_24px_-12px_rgba(15,31,51,0.06)] overflow-hidden">
        <div className="h-px bg-gradient-to-r from-[var(--gia-teal)]/0 via-[var(--gia-teal)]/40 to-[var(--gia-teal)]/0" />
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3
                className="text-[var(--gia-navy)] text-base sm:text-lg font-medium mb-1"
                style={{ fontFamily: "'Noto Serif JP', serif" }}
              >
                有料会員
              </h3>
              <p className="text-xs text-gray-500 leading-[1.85]">
                紹介コーチ／紹介依頼／メンバー閲覧などがご利用いただけます。
              </p>
            </div>
            <span
              className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold border tracking-[0.03em] ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          {hasCustomer && <ManageSalonButton />}
        </div>
      </article>
    );
  }

  // 課金が active でない（未契約 / past_due / canceled 等）
  const subBadge = subscriptionStatus
    ? SUBSCRIPTION_BADGE[subscriptionStatus]
    : null;

  return (
    <article className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3
            className="text-[var(--gia-navy)] text-base sm:text-lg font-medium mb-1"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            未契約
          </h3>
          <p className="text-xs text-gray-500 leading-[1.85]">
            本会員になると、紹介コーチ・メンバー閲覧・動画コンテンツが解放されます。
          </p>
        </div>
        {subBadge && (
          <span
            className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold border tracking-[0.03em] ${subBadge.className}`}
          >
            {subBadge.label}
          </span>
        )}
      </div>
      <Link
        href="/upgrade"
        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--gia-navy)] hover:bg-[var(--gia-navy)]/90 text-white text-sm font-semibold py-2.5 px-5 transition-colors tracking-[0.02em]"
      >
        本会員プランを見る
        <ArrowRight className="w-4 h-4" />
      </Link>
      {/* 過去の請求書を見たい解約済みユーザー用に、customer_id があれば履歴リンクは残す */}
      {hasCustomer && (
        <div className="mt-3">
          <ManageSalonButton variant="text" />
        </div>
      )}
    </article>
  );
}

// ─── サブコンポーネント：右腕AI テナントカード ─────────────────────

function CloneTenantCard({ membership }: { membership: MyCloneMembership }) {
  const { tenant, role } = membership;
  const planLabel = tenant.plan ? (PLAN_LABEL[tenant.plan] ?? tenant.plan) : "—";
  const roleLabel = ROLE_LABEL[role] ?? role;
  const statusBadge =
    TENANT_STATUS_BADGE[tenant.status] ?? TENANT_STATUS_BADGE.active;
  const canManage = role === "owner" || role === "admin";

  return (
    <article className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04),0_8px_24px_-12px_rgba(15,31,51,0.06)] overflow-hidden">
      <div className="h-px bg-gradient-to-r from-[var(--gia-teal)]/0 via-[var(--gia-teal)]/40 to-[var(--gia-teal)]/0" />
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h3
              className="text-[var(--gia-navy)] text-base sm:text-lg font-medium mb-1.5"
              style={{ fontFamily: "'Noto Serif JP', serif" }}
            >
              {tenant.name || "（無題）"}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
              <span>プラン：{planLabel}</span>
              <span className="text-gray-300">／</span>
              <span>権限：{roleLabel}</span>
            </div>
          </div>
          <span
            className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold border tracking-[0.03em] ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/clone/${tenant.slug}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--gia-navy)]/15 bg-white text-xs font-medium text-[var(--gia-navy)] hover:bg-white/70 hover:border-[var(--gia-navy)]/30 transition-colors px-3.5 py-1.5"
          >
            <Brain className="w-3 h-3" />
            ダッシュボードを開く
            <ExternalLink className="w-3 h-3" />
          </Link>
          {canManage && (
            <Link
              href={`/clone/${tenant.slug}/settings`}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--gia-navy)]/15 bg-white text-xs font-medium text-[var(--gia-navy)] hover:bg-white/70 hover:border-[var(--gia-navy)]/30 transition-colors px-3.5 py-1.5"
            >
              <SettingsIcon className="w-3 h-3" />
              テナント設定
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── サブコンポーネント：fatal エラー画面 ───────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-6 sm:p-8">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">
              読み込みエラー
            </h2>
            <p className="text-sm text-red-700">{message}</p>
          </div>
        </div>
        <Link
          href="/members/app/mypage"
          className="inline-flex items-center gap-2 text-sm text-[var(--gia-navy)] underline"
        >
          マイページへ戻る
        </Link>
      </div>
    </div>
  );
}
