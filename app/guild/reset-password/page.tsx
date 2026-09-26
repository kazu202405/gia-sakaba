"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void createClient().auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) setError("再設定用のリンクを確認できません。メールからもう一度開いてください。");
      setReady(Boolean(data.user));
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready) return;
    if (password.length < 8) { setError("パスワードは8文字以上で入力してください。"); return; }
    if (password !== passwordAgain) { setError("確認用のパスワードが一致していません。"); return; }
    setBusy(true);
    setError("");
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (updateError) { setError("パスワードを変更できませんでした。新しいリンクからやり直してください。"); return; }
    setSaved(true);
    setPassword("");
    setPasswordAgain("");
  }

  return <main className="guild-theme grid min-h-screen place-items-center px-4 py-12">
    <section className="c-window w-full max-w-md p-6 pt-10 sm:p-8 sm:pt-11">
      <h1 className="c-window-title">GIAの酒場</h1>
      <p className="text-center text-xl tracking-[0.08em]">新しいパスワード</p>
      {saved ? <p role="status" className="mt-7 text-sm">パスワードを変更しました。新しいパスワードでログインできます。</p> : <form onSubmit={submit} className="mt-7 space-y-4">
        {error && <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <label className="block"><span className="mb-1 block text-sm">新しいパスワード</span>
          <input className="c-input h-11" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          <span className="c-muted mt-1 block text-xs">8文字以上</span></label>
        <label className="block"><span className="mb-1 block text-sm">新しいパスワード（確認）</span>
          <input className="c-input h-11" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} value={passwordAgain} onChange={(event) => setPasswordAgain(event.target.value)} required /></label>
        <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> パスワードを表示</label>
        <button type="submit" className="c-button w-full" disabled={!ready || busy || !password || !passwordAgain}>{busy ? "変更中..." : "パスワードを変更する"}</button>
      </form>}
      <Link href={saved ? "/guild" : "/guild/forgot-password"} className="mt-6 block text-center text-sm underline underline-offset-4 hover:text-[#98752c]">{saved ? "酒場へ進む" : "再設定メールを送り直す"}</Link>
    </section>
  </main>;
}
