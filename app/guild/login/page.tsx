"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GuildSceneArt } from "@/components/guild/guild-scene-art";
import { AuthLinkError } from "@/components/guild/auth-link-error";
import { createClient } from "@/lib/supabase/client";

function safeNext(value: string | null): string {
  return value?.startsWith("/guild") && !value.startsWith("//") ? value : "/guild";
}

const REMEMBER_EMAIL_KEY = "sakaba:remember-email";

export default function GuildLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberEmail(true);
        }
      } catch {
        // 保存を許可しないブラウザでもログインは続けられる。
      }
    });
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (data.user) {
        router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
        return;
      }
      setBusy(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("メールアドレスまたはパスワードを確認してください。");
      setBusy(false);
      return;
    }

    try {
      if (rememberEmail) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    } catch {
      // メールアドレスの記憶に失敗してもログインは成功とする。
    }

    router.refresh();
    router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
  }

  return (
    <main className="guild-theme guild-scene grid min-h-screen place-items-center px-4 py-12">
      {/* 見た目だけ：酒場の入口として夜の酒場の絵を敷く */}
      <GuildSceneArt art="tavern" />
      <section className="c-window w-full max-w-md p-6 pt-10 sm:p-8 sm:pt-11">
        <h1 className="c-window-title">GIAの酒場</h1>
        <p className="text-center text-xl tracking-[0.14em]">ログイン</p>
        <p className="c-muted mt-2 text-center text-sm">GIAで登録しているメールアドレスとパスワードを入力してください。</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <AuthLinkError>メールのリンクを確認できませんでした。期限が切れている場合は、もう一度お試しください。</AuthLinkError>
          {error && <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <label className="block">
            <span className="mb-1 block text-sm">メールアドレス</span>
            <input className="c-input h-11" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">パスワード</span>
            <input className="c-input h-11" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
              パスワードを表示
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)} />
              メールアドレスを覚えておく
            </label>
          </div>
          <button type="submit" className="c-button w-full" disabled={busy || !email.trim() || !password}>
            {busy ? "確認中..." : "酒場に入る"}
          </button>
        </form>
        <Link href="/guild/forgot-password" className="mt-5 block text-center text-sm underline underline-offset-4 hover:text-[#98752c]">パスワードを忘れた方</Link>
      </section>
    </main>
  );
}
