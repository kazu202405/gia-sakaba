"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Window } from "./cards";

export function InviteSignup({ inviteCode, inviterName, preview = false }: { inviteCode: string; inviterName: string; preview?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailAgain, setEmailAgain] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const joinPath = `/guild/join?invite=${encodeURIComponent(inviteCode)}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || preview) return;
    setError("");
    if (!name.trim() || name.trim().length > 30) {
      setError("お名前は30文字以内で入力してください。");
      return;
    }
    if (email.trim().toLowerCase() !== emailAgain.trim().toLowerCase()) {
      setError("確認用のメールアドレスが一致していません。");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }
    if (password !== passwordAgain) {
      setError("確認用のパスワードが一致していません。");
      return;
    }

    setBusy(true);
    const { data, error: signupError } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (signupError) {
      const registered = signupError.message.toLowerCase().includes("already") || signupError.message.toLowerCase().includes("registered");
      setError(registered ? "このメールアドレスは登録済みです。下の「ログインして続ける」から進んでください。" : "アカウントを作成できませんでした。入力内容を確認して再度お試しください。");
      setBusy(false);
      return;
    }
    if (!data.session) {
      setError("確認メールを送信しました。メール内のリンクを開いてから、同じ招待リンクへ戻ってください。");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-start">
    <Window title="冒険者を登録する">
      {preview && <p className="mb-4 border-2 border-dashed border-[#1b2a41] bg-[#fffdf6] p-3 text-sm">新規アカウント作成画面のプレビューです。送信はできません。</p>}
      <p className="mb-5 text-sm leading-relaxed"><span className="tracking-wider">{inviterName || "酒場のメンバー"}さんから招待状が届いています。</span><br /><span className="c-muted">冒険者の記録を作って、酒場へ入る準備をします。</span></p>
      <form onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="border border-[#c62828]/40 bg-red-50 p-3 text-sm text-[#c62828]">{error}</p>}
        <label className="block"><span className="mb-1 block text-sm">お名前 <span className="text-[#c62828]">必須</span></span>
          <input className="c-input h-11" value={name} onChange={(event) => setName(event.target.value)} maxLength={30} autoComplete="name" required /></label>
        <label className="block"><span className="mb-1 block text-sm">メールアドレス <span className="text-[#c62828]">必須</span></span>
          <input className="c-input h-11" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        <label className="block"><span className="mb-1 block text-sm">メールアドレス（確認） <span className="text-[#c62828]">必須</span></span>
          <input className="c-input h-11" type="email" value={emailAgain} onChange={(event) => setEmailAgain(event.target.value)} autoComplete="email" required /></label>
        <label className="block"><span className="mb-1 block text-sm">パスワード <span className="text-[#c62828]">必須</span></span>
          <input className="c-input h-11" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required />
          <span className="c-muted mt-1 block text-xs">8文字以上</span></label>
        <label className="block"><span className="mb-1 block text-sm">パスワード（確認） <span className="text-[#c62828]">必須</span></span>
          <input className="c-input h-11" type={showPassword ? "text" : "password"} value={passwordAgain} onChange={(event) => setPasswordAgain(event.target.value)} minLength={8} autoComplete="new-password" required /></label>
        <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> パスワードを表示する</label>
        <button type="submit" disabled={busy || preview} className="rpg-button h-12 w-full text-sm disabled:opacity-50">{preview ? "プレビュー中（送信できません）" : busy ? "登録中…" : "▶ 冒険者登録をして次へ"}</button>
      </form>
    </Window>
    <Window title="登録済みの冒険者">
      <p className="c-muted mb-5 text-sm leading-relaxed">すでにGIAのアカウントがある方は、ログインするとこの招待状へ戻れます。</p>
      {preview ? <span className="c-button-sub inline-flex h-12 w-full items-center justify-center text-sm opacity-50">▶ ログインして酒場へ</span> :
        <Link href={`/guild/login?next=${encodeURIComponent(joinPath)}`} className="c-button-sub inline-flex h-12 w-full items-center justify-center text-sm">▶ ログインして酒場へ</Link>}
    </Window>
  </div>;
}
