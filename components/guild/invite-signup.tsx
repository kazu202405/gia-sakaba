"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import { createClient } from "@/lib/supabase/client";
import { Window } from "./cards";
import { LoginGuide } from "./login-guide";

export function InviteSignup({ inviteCode, inviterName, preview = false, initialName = "" }: { inviteCode: string; inviterName: string; preview?: boolean; initialName?: string }) {
  const router = useGuildRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState("");
  const [emailAgain, setEmailAgain] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [mailSent, setMailSent] = useState(false);

  const joinPath = `/guild/join?invite=${encodeURIComponent(inviteCode)}`;
  const loginPath = `/guild/login?next=${encodeURIComponent(joinPath)}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || preview) return;
    setError("");
    setAlreadyRegistered(false);
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
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}/guild/auth/callback?next=${encodeURIComponent(joinPath)}`,
      },
    });
    // 登録済みか：ふつうはエラーで返る。メール確認が必須の設定だと、エラーにならず identities が空で返る
    const registered = signupError
      ? signupError.message.toLowerCase().includes("already") || signupError.message.toLowerCase().includes("registered")
      : !data.session && data.user?.identities?.length === 0;
    if (registered) {
      // Company Note などで作ったGIAのアカウントがある人。同じパスワードを打っていれば、そのままログインして入会へ進める
      const { error: loginError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      if (!loginError) {
        router.refresh();
        return;
      }
      // パスワードが違うときは、ログインへの入口を知らせのすぐ下に出す（スマホではログインの窓がフォームより上にあり、探しても見つからないため）
      setAlreadyRegistered(true);
      setError("このメールアドレスは、すでにGIAのアカウントがあります（Company Note と共通です）。新しく作る必要はありません。Company Note と同じメールアドレスとパスワードでログインしてください。");
      setBusy(false);
      return;
    }
    if (signupError) {
      setError("アカウントを作成できませんでした。入力内容を確認して再度お試しください。");
      setBusy(false);
      return;
    }
    if (!data.session) {
      setMailSent(true);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-start">
    <Window title="新規登録">
      {preview && <p className="mb-4 border-2 border-dashed border-[#1b2a41] bg-[#fffdf6] p-3 text-sm">新規アカウント作成画面のプレビューです。送信はできません。</p>}
      <p className="mb-5 text-sm leading-relaxed"><span className="tracking-wider">{inviterName || "酒場のメンバー"}さんから招待状が届いています。</span><br /><span className="c-muted">GIAのアカウントを作成して、入会フォームへ進みます。</span></p>
      {initialName && <p className="c-card mb-5 px-3 py-2 text-sm">お名前は招待した人が入力済みです。違う場合は下で直してください。</p>}
      <form onSubmit={submit} className="space-y-4">
        {mailSent && <div className="space-y-3">
          <p role="status" className="border border-[#2e7d32]/40 bg-green-50 p-3 text-sm text-[#1b5e20]">登録できました。確認メールを送りました。メール内のリンクを開くと、この招待状に戻って入会へ進めます。</p>
          <LoginGuide tone="success" />
        </div>}
        {error && <div role="alert" className="space-y-3 border border-[#c62828]/40 bg-red-50 p-3 text-sm text-[#c62828]">
          <p>{error}</p>
          {alreadyRegistered && <Link href={loginPath} className="c-button inline-flex h-12 w-full items-center justify-center text-sm">▶ ログインして続ける</Link>}
        </div>}
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
        <button type="submit" disabled={busy || preview || mailSent} className="rpg-button h-12 w-full text-sm disabled:opacity-50">{preview ? "プレビュー中（送信できません）" : mailSent ? "確認メールを送信済み" : busy ? "登録中…" : "▶ アカウントを作成して次へ"}</button>
      </form>
    </Window>
    <div className="order-first lg:order-none">
    <Window title="すでに登録した方はこちら">
      <p className="c-muted mb-5 text-sm leading-relaxed">以前にこのリンクから登録した方・Company Note をお使いの方（GIAのアカウントがある方）は、同じメールアドレスとパスワードでログインすると、この招待状へ戻れます。</p>
      {preview ? <span className="c-button-sub inline-flex h-12 w-full items-center justify-center text-sm opacity-50">▶ ログインして酒場へ</span> :
        <Link href={loginPath} className="c-button-sub inline-flex h-12 w-full items-center justify-center text-sm">▶ ログインして酒場へ</Link>}
    </Window>
    </div>
  </div>;
}
