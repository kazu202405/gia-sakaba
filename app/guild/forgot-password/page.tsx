"use client";

import Link from "next/link";
import { GuildSceneArt } from "@/components/guild/guild-scene-art";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthLinkError } from "@/components/guild/auth-link-error";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError("");
    const redirectTo = `${window.location.origin}/guild/auth/callback?next=${encodeURIComponent("/guild/reset-password")}`;
    const { error: sendError } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setBusy(false);
    if (sendError) {
      setError("メールを送信できませんでした。少し時間をおいて、もう一度お試しください。");
      return;
    }
    setSent(true);
  }

  return <main className="guild-theme guild-scene grid min-h-screen place-items-center px-4 py-12">
    {/* 見た目だけ：酒場の入口として夜の酒場の絵を敷く */}
    <GuildSceneArt art="tavern" />
    <section className="c-window w-full max-w-md p-6 pt-10 sm:p-8 sm:pt-11">
      <h1 className="c-window-title">GIAの酒場</h1>
      <p className="text-center text-xl tracking-[0.08em]">パスワードの再設定</p>
      {sent ? <p role="status" className="mt-7 text-sm leading-relaxed">入力したアドレスに再設定用メールを送信しました。届いたメールのリンクを開いてください。メールが見当たらない場合は、迷惑メールもご確認ください。</p> : <>
        <p className="c-muted mt-3 text-sm leading-relaxed">登録したメールアドレスに、再設定用のリンクを送ります。</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <AuthLinkError>メールのリンクを確認できませんでした。新しいリンクを送ってください。</AuthLinkError>
          {error && <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <label className="block"><span className="mb-1 block text-sm">メールアドレス</span>
            <input className="c-input h-11" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <button type="submit" className="c-button w-full" disabled={busy || !email.trim()}>{busy ? "送信中..." : "再設定メールを送る"}</button>
        </form>
      </>}
      <Link href="/guild/login" className="mt-6 block text-center text-sm underline underline-offset-4 hover:text-[#98752c]">ログインへ戻る</Link>
    </section>
  </main>;
}
