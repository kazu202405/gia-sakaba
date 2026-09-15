"use client";

// ログイン画面。
// 2026-05-01: Supabase Auth (signInWithPassword) で実認証化。
// /admin/login と同じパターン。成功で /members/app/mypage に遷移。
//
// admin login route exists at /admin/login (intentionally not linked from public surfaces)
// — 主催者は URL 直打ちで /admin/login に到達する運用。一般ユーザー向け画面に
// 管理者入口は晒さない。

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginIntentFor } from "@/lib/login-intent";

interface FormState {
  email: string;
  password: string;
}

const initialState: FormState = {
  email: "",
  password: "",
};

/**
 * `useSearchParams()` は Suspense 境界内で使う必要がある（App Router の制約）。
 * Page export はラッパーに留め、本体を切り出す。
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--gia-deck-navy)]" />
    </div>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?next=... があればログイン後にそこへ戻す（決済/サービス導線からの復帰）。
  // オープンリダイレクト防止のため内部パスのみ許可。
  const nextParam = safeInternalPath(searchParams.get("next"));
  const dest = nextParam ?? "/members/app/mypage";
  const isNoteInvite = loginIntentFor(nextParam) === "company-note-invite";
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // 既ログイン時の自動リダイレクト（フラッシュ防止のためフォーム表示前に判定）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        router.replace(dest);
        return;
      }
      setCheckingSession(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, dest]);

  const canSubmit =
    form.email.trim().length > 0 &&
    form.password.length > 0 &&
    !submitting;

  const handleChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });

    if (error) {
      const isCredentialError =
        error.message.toLowerCase().includes("invalid") ||
        error.message.toLowerCase().includes("credentials");
      setErrorMessage(
        isCredentialError
          ? "メールアドレスまたはパスワードが正しくありません"
          : `ログインに失敗しました：${error.message}`
      );
      setSubmitting(false);
      return;
    }

    // refresh で middleware を通過させてから push する方が cookie 反映が確実
    router.refresh();
    router.push(dest);
  };

  // セッション判定中はスピナー（フォームのフラッシュ防止）
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[var(--gia-deck-paper)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--gia-deck-navy)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        {/* ヘッダー */}
        <header className="text-center mb-12">
          <ChapterTag>{isNoteInvite ? "ACCOUNT CHECK" : "SIGN IN"}</ChapterTag>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4] mt-5">
            {isNoteInvite ? (
              <>
                現在のCompany Note<br className="sm:hidden" />
                アカウントで参加する
              </>
            ) : (
              "ログイン"
            )}
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            {isNoteInvite ? (
              <>
                アカウントを新しく作る必要はありません。<br />
                Company Noteでお使いのメールアドレスとパスワードを入力してください。
              </>
            ) : (
              "ご登録のメールアドレスとパスワードでログインしてください。"
            )}
          </p>
        </header>

        {/* カード本体 */}
        <div className="bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] overflow-hidden">
          {isNoteInvite && (
            <div
              className="flex items-center justify-between gap-5 border-b border-[var(--gia-deck-line)] bg-[var(--gia-deck-navy)] px-6 py-5 text-white sm:px-10"
              aria-label="お申し込み内容"
            >
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-medium tracking-[0.24em] text-white/55">
                  INVITED MEMBER
                </p>
                <p className="mt-1.5 text-sm font-semibold tracking-[0.04em]">
                  ご招待会員
                </p>
              </div>
              <div className="shrink-0 border-l border-white/20 pl-5 text-right">
                <p className="text-[10px] tracking-[0.15em] text-white/55">月額・税込</p>
                <p className="mt-1 font-serif text-xl font-bold tracking-[0.04em]">
                  ¥11,000
                </p>
              </div>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="p-7 sm:p-10 space-y-6"
            noValidate
          >
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 px-3.5 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs leading-[1.7]"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Field
              id="email"
              label="メールアドレス"
              icon={<Mail className="w-4 h-4" />}
            >
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="your@email.com"
                className={inputClass}
              />
            </Field>

            <Field
              id="password"
              label="パスワード"
              icon={<Lock className="w-4 h-4" />}
            >
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </Field>

            <div className="text-right">
              <a
                href={
                  isNoteInvite
                    ? "https://note.gia2018.com/forgot-password"
                    : "#"
                }
                className="text-[11px] text-[var(--gia-deck-sub)] hover:text-[var(--gia-deck-navy)] transition-colors underline underline-offset-4 decoration-[var(--gia-deck-line)]"
              >
                パスワードを忘れた方
              </a>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-4 px-6 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isNoteInvite ? "確認中..." : "認証中..."}
                  </>
                ) : (
                  <>
                    {isNoteInvite ? "確認して決済へ進む" : "ログイン"}
                    {isNoteInvite && <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {isNoteInvite && (
          <p className="mt-4 text-center text-[11px] leading-[1.8] text-[var(--gia-deck-sub)]">
            アカウント確認後、Stripeの安全な決済画面へ移動します。
          </p>
        )}

        {/* フッターリンク */}
        <div className="mt-10 flex flex-col items-center gap-2 text-xs text-[var(--gia-deck-sub)]">
          <p>
            アカウントをお持ちでない方 →{" "}
            <Link
              href={
                nextParam
                  ? `/join?next=${encodeURIComponent(nextParam)}`
                  : "/join"
              }
              className="text-[var(--gia-deck-navy)] hover:text-[var(--gia-deck-gold)] underline underline-offset-4 decoration-[var(--gia-deck-line)] hover:decoration-[var(--gia-deck-gold)] transition-colors"
            >
              {isNoteInvite ? "新規登録して進む" : "新規登録"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 内部コンポーネント / スタイル定数 ───────────────────────────────
// /join と同じトーン・同じスタイル定数。Phase 1 では複製の方が変更コストが低いのでそのまま。

/**
 * オープンリダイレクト防止：内部パス（"/" 始まり・"//" でない）のみ許可。
 * 外部URLや不正値は null（＝next 無効）にする。/join と同じ実装。
 */
function safeInternalPath(path: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

function ChapterTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
      <span
        aria-hidden
        className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]"
      />
      <span>{children}</span>
      <span
        aria-hidden
        className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]"
      />
    </div>
  );
}

const inputClass =
  "block w-full rounded-lg border border-[var(--gia-deck-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--gia-deck-ink)] placeholder:text-zinc-400 transition-colors focus:outline-none focus:border-[var(--gia-deck-navy)] focus:ring-1 focus:ring-[var(--gia-deck-gold)]/20";

interface FieldProps {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function Field({ id, label, icon, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--gia-deck-ink)] mb-2"
      >
        {icon && (
          <span className="text-[var(--gia-deck-sub)]">{icon}</span>
        )}
        <span>{label}</span>
      </label>
      {children}
    </div>
  );
}
