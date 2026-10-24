"use client";

import { FormEvent, useEffect, useState } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import Link from "next/link";
import { GuildSceneArt } from "@/components/guild/guild-scene-art";
import { AuthLinkError } from "@/components/guild/auth-link-error";
import { createClient } from "@/lib/supabase/client";
import { outsideStorePath } from "@/lib/guild/store-path";
import { Go } from "@/components/guild/go-mark";
import { PHRASE_WRAP, Ph } from "@/components/guild/phrase";

const REMEMBER_EMAIL_KEY = "sakaba:remember-email";

// ログイン画面の中身。どの店の見た目・名前で出すかと、ログイン後の行き先（next）は app/guild/login/page.tsx が決める。
export function GuildLoginForm({ storeName, tavern, next }: { storeName: string; tavern: boolean; next: string }) {
  const router = useGuildRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [busy, setBusy] = useState(true);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
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
        router.replace(next);
        return;
      }
      setBusy(false);
    })();
    return () => {
      active = false;
    };
  }, [router, next]);

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
    router.replace(next);
  }

  async function sendLoginLink() {
    if (!email.trim() || busy || linkBusy) return;
    setLinkBusy(true);
    setError(null);
    setLinkSent(false);
    const { error: linkError } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}${outsideStorePath("auth/callback", `?next=${encodeURIComponent(next)}`)}`,
      },
    });
    setLinkBusy(false);
    if (linkError) { setError("ログイン用メールを送れませんでした。少し待って再度お試しください。"); return; }
    setLinkSent(true);
  }

  return (
    <main className={tavern ? "guild-theme guild-scene grid min-h-screen place-items-center px-4 py-12" : "guild-theme grid min-h-screen place-items-center px-5 py-12"}>
      {/* 見た目だけ：酒場の見た目の店は、入口として夜の酒場の絵を敷く */}
      {tavern && <GuildSceneArt art="tavern" />}
      {/* 酒場の見た目の店は紺の窓＋名札。落ち着いた見た目の店は箱を使わず、店の名前と見出しを中央にそろえる */}
      <section className={tavern ? "c-window w-full max-w-md p-6 pt-10 sm:p-8 sm:pt-11" : `w-full max-w-md ${PHRASE_WRAP}`}>
        {tavern
          ? <h1 className="c-window-title">{storeName}</h1>
          : <p className="text-center text-sm font-bold text-guild-accent-dark">{storeName}</p>}
        {tavern
          ? <p className="text-center text-xl tracking-[0.14em]">ログイン</p>
          : <h1 className="mt-2 text-center text-2xl font-bold">ログイン</h1>}
        <p className="c-muted mt-3 text-center text-sm leading-relaxed"><Ph keep text={tavern ? "GIAで登録している|メールアドレスと|パスワードを|入力してください。" : "登録している|メールアドレスと|パスワードを|入力してください。"} /></p>

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
            {busy ? "確認中..." : tavern ? "酒場に入る" : "ログイン"}
          </button>
        </form>
        <div className="c-dashed-top mt-6 pt-5 text-center">
          <p className="c-muted text-xs leading-relaxed"><Ph keep text="パスワードを|設定していない方は、|メールのリンクでも|ログインできます。" /></p>
          <button type="button" disabled={busy || linkBusy || !email.trim()} onClick={() => void sendLoginLink()} className="c-button-sub mt-3 min-h-11 w-full disabled:opacity-50">{linkBusy ? "送信中…" : <><Go />メールのリンクでログイン</>}</button>
          {linkSent && <p role="status" className="mt-3 text-sm">ログイン用リンクを送りました。メールから酒場を開いてください。</p>}
        </div>
        <Link href={outsideStorePath("forgot-password")} className="mt-5 block text-center text-sm underline underline-offset-4 hover:text-guild-accent-dark">パスワードを忘れた方</Link>
      </section>
    </main>
  );
}
