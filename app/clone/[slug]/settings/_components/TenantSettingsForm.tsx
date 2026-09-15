"use client";

// テナント設定フォーム。表示名と slug を別カードで編集する。
// slug 変更後は新しい URL の同ページにリダイレクト。
// 編集不可ロール（member / viewer）は read-only 表示。

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  AlertTriangle,
  Hash,
  Calendar,
  Copy,
  MessageCircle,
} from "lucide-react";
import {
  updateTenantName,
  updateTenantSlug,
  updateMySlackUserId,
  updateMyLineUserId,
  updateMyGoogleCalendarId,
  setReferralWorksheetLink,
} from "../_actions";

interface Props {
  tenantId: string;
  currentSlug: string;
  currentName: string;
  currentPlan: string | null;
  currentSlackUserId: string | null;
  currentLineUserId: string | null;
  currentGoogleCalendarId: string | null;
  serviceAccountEmail: string | null;
  referralWorksheetLinkEnabled: boolean;
  canEdit: boolean;
  role: string;
}

// GIA公式LINEの友だち追加URL（サイト全体で使う env を流用）。
const LINE_ADD_FRIEND_URL =
  process.env.NEXT_PUBLIC_HOST_LINE_URL || "https://page.line.me/131liqrt";

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10 disabled:bg-gray-50 disabled:text-gray-500";
const helperClass = "text-[11px] text-gray-500 mt-1.5 leading-relaxed";
const errorBox =
  "flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[12px] text-[#8a4538]";
const successBox =
  "flex items-start gap-2 px-3 py-2 rounded-md border border-[#c5d3c8] bg-[#e9efe9] text-[12px] text-[#3d6651]";

function CardShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6 space-y-4">
      <header>
        <h3 className="font-serif text-base font-semibold text-[#1c3550] tracking-[0.06em]">
          {title}
        </h3>
        <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

function NameCard({
  tenantId,
  currentSlug,
  currentName,
  canEdit,
}: {
  tenantId: string;
  currentSlug: string;
  currentName: string;
  canEdit: boolean;
}) {
  const [name, setName] = useState(currentName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dirty = name.trim() !== currentName && name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await updateTenantName(currentSlug, tenantId, name);
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
        return;
      }
      setSuccess(true);
    });
  };

  return (
    <CardShell
      title="表示名"
      description="ヘッダー左上に表示されるテナント名（クライアント名・自分の名前など）。"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass} htmlFor="tenant-name">
            表示名
          </label>
          <input
            id="tenant-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
              setSuccess(false);
            }}
            disabled={!canEdit || pending}
            maxLength={50}
            className={inputClass}
          />
          <p className={helperClass}>
            最大50文字。日本語可。{name.trim().length} / 50
          </p>
        </div>

        {error && (
          <div role="alert" className={errorBox}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className={successBox}>
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>表示名を更新しました</span>
          </div>
        )}

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending || !dirty}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              表示名を保存
            </button>
          </div>
        )}
      </form>
    </CardShell>
  );
}

function SlugCard({
  tenantId,
  currentSlug,
  canEdit,
}: {
  tenantId: string;
  currentSlug: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(currentSlug);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const normalized = slug.trim().toLowerCase();
  const dirty = normalized !== currentSlug && normalized.length > 0;
  // クライアント側の即時バリデーション（送信前のヒント表示）
  const formatOk = /^[a-z0-9-]{3,20}$/.test(normalized);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateTenantSlug(currentSlug, tenantId, normalized);
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
        return;
      }
      // 新 slug の同じページへ移動（旧 URL は404になる）
      const next = res.newSlug ?? normalized;
      router.replace(`/clone/${next}/settings`);
      router.refresh();
    });
  };

  return (
    <CardShell
      title="URL（slug）"
      description="ブラウザURLの /clone/<ここ> に使う識別子。半角英小文字・数字・ハイフン。"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass} htmlFor="tenant-slug">
            slug
          </label>
          <div className="flex items-center gap-1">
            <span className="text-[12px] text-gray-400 select-none whitespace-nowrap font-mono">
              /clone/
            </span>
            <input
              id="tenant-slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setError(null);
              }}
              disabled={!canEdit || pending}
              maxLength={20}
              autoComplete="off"
              spellCheck={false}
              className={inputClass + " font-mono"}
            />
          </div>
          <p className={helperClass}>
            英小文字 / 数字 / ハイフン、3〜20文字。
            予約語（admin / login / clone / members 等）は使えません。
          </p>
          {dirty && !formatOk && (
            <p className="text-[11px] text-[#8a4538] mt-1.5">
              形式が不正です（小文字英数字とハイフン、3〜20文字）
            </p>
          )}
        </div>

        {dirty && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-[#e6d3a3] bg-[#fbf3e3] text-[11px] text-[#8a5a1c] leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold mb-0.5">URLが変わります</p>
              <p>
                変更前 <code className="font-mono">/clone/{currentSlug}</code> へのブックマーク・共有リンクは
                404 になります。社内共有しているURLがある場合は事前に告知してください。
              </p>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className={errorBox}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending || !dirty || !formatOk}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              slug を変更する
            </button>
          </div>
        )}
      </form>
    </CardShell>
  );
}

function SlackCard({
  tenantId,
  currentSlug,
  currentSlackUserId,
}: {
  tenantId: string;
  currentSlug: string;
  currentSlackUserId: string | null;
}) {
  const [slackUserId, setSlackUserId] = useState(currentSlackUserId ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const normalized = slackUserId.trim();
  const baseline = currentSlackUserId ?? "";
  const dirty = normalized !== baseline;
  const formatOk = normalized.length === 0 || /^U[A-Z0-9]{8,20}$/.test(normalized);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await updateMySlackUserId(currentSlug, tenantId, normalized);
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
        return;
      }
      setSuccess(
        normalized.length === 0
          ? "Slack 連携を解除しました"
          : "Slack 連携を保存しました",
      );
    });
  };

  return (
    <CardShell
      title="Slack 連携"
      description="自分の Slack DM を 右腕AI のテナントに紐付ける。設定後、Slack DM 経由で議事録・名刺・備考・ファネル更新・質問ができるようになります。"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-[11px] leading-relaxed text-gray-600">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
          <span>
            Slack 連携は GIA ワークスペースのメンバー向けです。外部の方は、
            <span className="font-medium text-gray-700">この画面（Web）と LINE</span>
            でそのままご利用いただけます（Slack の設定は不要です）。
          </span>
        </div>
        <div>
          <label className={labelClass} htmlFor="slack-user-id">
            あなたの Slack user_id
          </label>
          <div className="relative">
            <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="slack-user-id"
              type="text"
              value={slackUserId}
              onChange={(e) => {
                setSlackUserId(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              disabled={pending}
              placeholder="U01ABC2DEF3"
              maxLength={21}
              autoComplete="off"
              spellCheck={false}
              className={inputClass + " pl-9 font-mono"}
            />
          </div>
          <p className={helperClass}>
            U で始まる英大文字＋数字（9〜21文字）。空欄で保存すると連携解除になります。
          </p>
          {dirty && !formatOk && (
            <p className="text-[11px] text-[#8a4538] mt-1.5">
              形式が不正です（U で始まる英大文字・数字）
            </p>
          )}
        </div>

        <details className="text-[11px] text-gray-600 leading-relaxed bg-gray-50 rounded-md px-3 py-2 border border-gray-100">
          <summary className="cursor-pointer font-medium text-gray-700">
            Slack user_id の調べ方
          </summary>
          <ol className="mt-2 space-y-1 list-decimal pl-4">
            <li>Slack で自分のプロフィールを開く（左上のアイコン → 自分のアカウント）</li>
            <li>「その他」メニュー → 「メンバーIDをコピー」</li>
            <li>U で始まる文字列が user_id です。それをここに貼り付けて保存</li>
          </ol>
          <p className="mt-2 text-gray-500">
            連携後、Slack で 右腕AI Bot に DM を送ると、このテナント配下のデータとして記録されます。
          </p>
        </details>

        {error && (
          <div role="alert" className={errorBox}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className={successBox}>
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || !dirty || !formatOk}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {normalized.length === 0 && baseline.length > 0
              ? "連携を解除する"
              : "Slack 連携を保存"}
          </button>
        </div>
      </form>
    </CardShell>
  );
}

function LineCard({
  tenantId,
  currentSlug,
  currentLineUserId,
}: {
  tenantId: string;
  currentSlug: string;
  currentLineUserId: string | null;
}) {
  const [lineUserId, setLineUserId] = useState(currentLineUserId ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const normalized = lineUserId.trim();
  const baseline = currentLineUserId ?? "";
  const dirty = normalized !== baseline;
  const formatOk =
    normalized.length === 0 || /^U[0-9a-f]{32}$/.test(normalized);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await updateMyLineUserId(currentSlug, tenantId, normalized);
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
        return;
      }
      setSuccess(
        normalized.length === 0
          ? "LINE 連携を解除しました"
          : "LINE 連携を保存しました",
      );
    });
  };

  return (
    <CardShell
      title="LINE 連携"
      description="自分の LINE トークから 右腕AI を呼べるようにする。Slack と同じく議事録・名刺・備考・ファネル更新・質問に対応。"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: 友だち追加ボタン（押す→自動で user_id が返ってくる） */}
        <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-3">
          <div className="text-[11px] font-bold text-gray-700 tracking-wider mb-2">
            Step 1. GIA公式LINEを友だち追加
          </div>
          <a
            href={LINE_ADD_FRIEND_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#06C755] text-white text-xs font-bold tracking-[0.04em] hover:bg-[#05b34c] transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            LINEで友だち追加
          </a>
          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
            追加すると、Bot が自動で「あなたの LINE user_id：U…」を返信します。
            その U で始まる文字列を、下の Step 2 に貼り付けてください。
          </p>
        </div>

        {/* Step 2: 返信された user_id を貼り付け */}
        <div>
          <label className={labelClass} htmlFor="line-user-id">
            Step 2. 返信された user_id を貼り付け
          </label>
          <div className="relative">
            <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="line-user-id"
              type="text"
              value={lineUserId}
              onChange={(e) => {
                setLineUserId(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              disabled={pending}
              placeholder="U0123456789abcdef0123456789abcdef"
              maxLength={33}
              autoComplete="off"
              spellCheck={false}
              className={inputClass + " pl-9 font-mono"}
            />
          </div>
          <p className={helperClass}>
            U で始まる33文字（U + 32文字の英小文字/数字）。空欄で保存すると連携解除になります。
          </p>
          {dirty && !formatOk && (
            <p className="text-[11px] text-[#8a4538] mt-1.5">
              形式が不正です（U で始まる33文字の英小文字/数字）
            </p>
          )}
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          連携後、LINE で 右腕AI にメッセージを送ると、このテナント配下のデータとして記録されます。
        </p>

        {error && (
          <div role="alert" className={errorBox}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className={successBox}>
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || !dirty || !formatOk}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {normalized.length === 0 && baseline.length > 0
              ? "連携を解除する"
              : "LINE 連携を保存"}
          </button>
        </div>
      </form>
    </CardShell>
  );
}

function GoogleCalendarCard({
  tenantId,
  currentSlug,
  currentGoogleCalendarId,
  serviceAccountEmail,
}: {
  tenantId: string;
  currentSlug: string;
  currentGoogleCalendarId: string | null;
  serviceAccountEmail: string | null;
}) {
  const [calendarId, setCalendarId] = useState(currentGoogleCalendarId ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const normalized = calendarId.trim();
  const baseline = currentGoogleCalendarId ?? "";
  const dirty = normalized !== baseline;
  const formatOk =
    normalized.length === 0 ||
    /^(primary|[^\s@]+@[^\s@]+\.[^\s@]+)$/.test(normalized);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await updateMyGoogleCalendarId(currentSlug, tenantId, normalized);
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
        return;
      }
      setSuccess(
        normalized.length === 0
          ? "Google Calendar 連携を解除しました"
          : "Google Calendar 連携を保存しました",
      );
    });
  };

  const handleCopyServiceAccount = async () => {
    if (!serviceAccountEmail) return;
    try {
      await navigator.clipboard.writeText(serviceAccountEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード書込失敗（権限なしブラウザ）。手動コピーしてもらう
    }
  };

  return (
    <CardShell
      title="Google Calendar 連携"
      description="Slack DM で「今日の予定」「次の予定」を聞くと、自分のカレンダーから答えられるようになります。"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Service Account メアド表示 + コピー */}
        <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-3">
          <div className="text-[11px] font-bold text-gray-700 tracking-wider mb-1.5">
            Step 1. このシステムにカレンダー閲覧アクセスを許可
          </div>
          {serviceAccountEmail ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 text-[12px] font-mono text-gray-700 bg-white px-2 py-1.5 rounded border border-gray-200 truncate">
                {serviceAccountEmail}
              </code>
              <button
                type="button"
                onClick={handleCopyServiceAccount}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 transition-colors flex-shrink-0"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    コピー済
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    コピー
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-[#8a4538]">
              Service Account 未設定です。管理者にお問い合わせください。
            </p>
          )}
          <details className="mt-2 text-[11px] text-gray-600 leading-relaxed">
            <summary className="cursor-pointer font-medium text-gray-700">
              連携手順（Google Calendar）
            </summary>
            <ol className="mt-2 space-y-1 list-decimal pl-4">
              <li>
                Google Calendar を開く →
                自分のカレンダー右の「︙」→「設定と共有」
              </li>
              <li>
                「特定のユーザーやグループと共有する」→「ユーザーやグループを追加」
              </li>
              <li>上のメアドを貼り付け → 権限を「予定の表示（すべての予定の詳細）」に設定 → 送信</li>
            </ol>
          </details>
        </div>

        {/* Step 2: カレンダーID入力 */}
        <div>
          <label className={labelClass} htmlFor="google-calendar-id">
            Step 2. カレンダーID を貼り付け
          </label>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="google-calendar-id"
              type="text"
              value={calendarId}
              onChange={(e) => {
                setCalendarId(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              disabled={pending}
              placeholder="yourname@gmail.com"
              autoComplete="off"
              spellCheck={false}
              className={inputClass + " pl-9 font-mono"}
            />
          </div>
          <p className={helperClass}>
            通常は自分の Google アカウントのメアドそのまま。サブカレンダー利用時は
            「設定と共有」→「カレンダーの統合」→「カレンダーID」をコピー。
            空欄で保存すると連携解除になります。
          </p>
          {dirty && !formatOk && (
            <p className="text-[11px] text-[#8a4538] mt-1.5">
              形式が不正です（メアド形式 or &quot;primary&quot;）
            </p>
          )}
        </div>

        {error && (
          <div role="alert" className={errorBox}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className={successBox}>
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || !dirty || !formatOk}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {normalized.length === 0 && baseline.length > 0
              ? "連携を解除する"
              : "Google Calendar 連携を保存"}
          </button>
        </div>
      </form>
    </CardShell>
  );
}

// 右腕AI ↔ 紹介コーチ連携トグル（右腕がワークシートを読み込むか）。
function ReferralWorksheetLinkCard({
  tenantId,
  currentSlug,
  enabled,
  canEdit,
}: {
  tenantId: string;
  currentSlug: string;
  enabled: boolean;
  canEdit: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    if (!canEdit || pending) return;
    const next = !on;
    setOn(next); // 楽観更新
    setError(null);
    startTransition(async () => {
      const res = await setReferralWorksheetLink(currentSlug, tenantId, next);
      if (!res.ok) {
        setOn(!next); // ロールバック
        setError(res.error ?? "更新に失敗しました");
      }
    });
  };

  return (
    <CardShell
      title="紹介コーチ連携（紹介設計の読み込み）"
      description="ONにすると、右腕AIが紹介相談に答えるとき、あなたが紹介コーチのワークシートに書いた紹介設計（USP・ボトルネック・今月のアクションなど）を踏まえて具体的に助言します。"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-700">
          {on ? "連携中（紹介設計を踏まえて回答）" : "連携OFF（汎用の紹介ノウハウのみ）"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={toggle}
          disabled={!canEdit || pending}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            on ? "bg-[#2c8a78]" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              on ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {!canEdit && (
        <p className={helperClass}>
          連携の切替は owner / admin のみ可能です。
        </p>
      )}
      {error && (
        <div className={errorBox}>
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </CardShell>
  );
}

function PlanCard({ plan, role }: { plan: string | null; role: string }) {
  return (
    <CardShell
      title="契約プラン"
      description="プラン変更は別途お問い合わせください（営業 / Stripe 経由）。"
    >
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
        <div>
          <dt className="text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-1">
            プラン
          </dt>
          <dd className="text-[#1c3550] font-medium">{plan ?? "未設定"}</dd>
        </div>
        <div>
          <dt className="text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-1">
            あなたのロール
          </dt>
          <dd className="text-[#1c3550] font-medium tracking-[0.18em]">
            {role.toUpperCase()}
          </dd>
        </div>
      </dl>
    </CardShell>
  );
}

export function TenantSettingsForm({
  tenantId,
  currentSlug,
  currentName,
  currentPlan,
  currentSlackUserId,
  currentLineUserId,
  currentGoogleCalendarId,
  serviceAccountEmail,
  referralWorksheetLinkEnabled,
  canEdit,
  role,
}: Props) {
  return (
    <div className="space-y-4">
      {!canEdit && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-[12px] text-gray-600">
          <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            あなたのロール（{role}）では表示名 / slug は編集できません（owner / admin のみ）。
            Slack / LINE / Google Calendar 連携は member 以上の全員が自分の連携を編集できます。
          </span>
        </div>
      )}

      <NameCard
        tenantId={tenantId}
        currentSlug={currentSlug}
        currentName={currentName}
        canEdit={canEdit}
      />
      <SlugCard
        tenantId={tenantId}
        currentSlug={currentSlug}
        canEdit={canEdit}
      />
      <SlackCard
        tenantId={tenantId}
        currentSlug={currentSlug}
        currentSlackUserId={currentSlackUserId}
      />
      <LineCard
        tenantId={tenantId}
        currentSlug={currentSlug}
        currentLineUserId={currentLineUserId}
      />
      <GoogleCalendarCard
        tenantId={tenantId}
        currentSlug={currentSlug}
        currentGoogleCalendarId={currentGoogleCalendarId}
        serviceAccountEmail={serviceAccountEmail}
      />
      <ReferralWorksheetLinkCard
        tenantId={tenantId}
        currentSlug={currentSlug}
        enabled={referralWorksheetLinkEnabled}
        canEdit={canEdit}
      />
      <PlanCard plan={currentPlan} role={role} />
    </div>
  );
}
