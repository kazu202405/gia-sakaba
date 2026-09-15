"use client";

// 管理者ログイン画面（実認証）。
// Supabase Auth (signInWithPassword) で認証し、成功時に /admin に遷移する。
// 認証ガードは middleware.ts で行うため、このページ自体は誰でも閲覧可能。
//
// 構成は /login（一般ユーザー向け）の A 系統トーン（Navy + Gold + ivory + Serif）を踏襲し、
// 「ADMIN」chapter-tag と補助テキストで主催者専用エリアであることを明示する。
// admin URL 自体は公開導線から意図的にリンクしない（直打ち運用）。

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FormState {
  email: string;
  password: string;
}

const initialState: FormState = {
  email: "",
  password: "",
};

export default function AdminLoginPage() {
  const router = useRouter();
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
        router.replace("/admin");
        return;
      }
      setCheckingSession(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const canSubmit =
    form.email.trim().length > 0 &&
    form.password.length > 0 &&
    !submitting;

  const handleChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // 入力が変わったら直前のエラーは消す（再submit前にUIクリア）
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
      // Supabase の英文メッセージを日本語に置き換える（よくあるケースだけ拾う）
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
    router.push("/admin");
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
          <ChapterTag>ADMIN</ChapterTag>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4] mt-5">
            管理者ログイン
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            主催者専用ログインです。
            <br />
            一般メンバーは{" "}
            <Link
              href="/login"
              className="text-[var(--gia-deck-navy)] hover:text-[var(--gia-deck-gold)] underline underline-offset-4 decoration-[var(--gia-deck-line)] hover:decoration-[var(--gia-deck-gold)] transition-colors"
            >
              こちらのログイン画面
            </Link>{" "}
            からご利用ください。
          </p>
        </header>

        {/* カード本体 */}
        <div className="bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] overflow-hidden">
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
                placeholder="admin@example.com"
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
                href="#"
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
                    認証中...
                  </>
                ) : (
                  <>管理画面へログイン</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* フッター注釈（公開導線に晒さない方針のため、一般 /login や /join への
            目立つ誘導は意図的に置かない） */}
        <div className="mt-10 flex flex-col items-center gap-2 text-[11px] text-[var(--gia-deck-sub)]">
          <p>このページは主催者専用です。</p>
        </div>
      </div>
    </div>
  );
}

// ─── 内部コンポーネント / スタイル定数 ───────────────────────────────
// /login と同一定数。Phase 1 では複製の方が変更コストが低いのでそのまま。

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
