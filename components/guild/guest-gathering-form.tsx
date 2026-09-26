"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GuestGathering } from "@/lib/guild/guest-gathering";
import { GUILD_PROMISES } from "@/lib/guild/rules";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";

export function GuestGatheringForm({ token, event, authenticated, accountEmail, initialName }: {
  token: string;
  event: GuestGathering;
  authenticated: boolean;
  accountEmail: string;
  initialName: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState(event.my_profile?.name ?? initialName);
  const [introduction, setIntroduction] = useState(event.my_profile?.introduction ?? "");
  const [showIntroduction, setShowIntroduction] = useState(event.my_application?.show_introduction ?? false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mailSent, setMailSent] = useState(false);
  const applied = event.my_application?.status === "applied";
  const open = event.status === "open";

  async function sendLoginLink(eventSubmit: React.FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    const callback = `${window.location.origin}/guild/auth/callback?next=${encodeURIComponent(`/e/${token}`)}`;
    const { error: authError } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback, shouldCreateUser: true },
    });
    setBusy(false);
    if (authError) { setError("メールを送れませんでした。アドレスを確認し、少し待って再度お試しください。"); return; }
    setMailSent(true);
  }

  async function apply(eventSubmit: React.FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    if (busy) return;
    if (!name.trim() || name.trim().length > 30) { setError("お名前を30文字以内で入力してください。"); return; }
    if (introduction.trim().length > 240) { setError("自己紹介は240文字以内にしてください。"); return; }
    setBusy(true); setError("");
    const { error: applyError } = await createClient().rpc("sakaba_apply_guest_gathering", {
      p_token: token,
      p_display_name: name.trim(),
      p_introduction: introduction.trim(),
      p_show_introduction: showIntroduction,
    });
    setBusy(false);
    if (applyError) {
      setError(applyError.message.includes("full") ? "定員に達しました。" : "申し込めませんでした。募集状況を確認して、もう一度お試しください。");
      router.refresh();
      return;
    }
    uiToast(applied ? "申込内容を保存しました" : "集まりに申し込みました");
    router.refresh();
  }

  async function withdraw() {
    if (busy) return;
    setBusy(true); setError("");
    const { error: withdrawError } = await createClient().rpc("sakaba_withdraw_guest_gathering", { p_token: token });
    setBusy(false);
    if (withdrawError) { setError("申込を取り消せませんでした。再度お試しください。"); return; }
    uiToast("申込を取り消しました");
    router.refresh();
  }

  async function joinGuild() {
    if (busy || !agreed) return;
    setBusy(true); setError("");
    const { error: joinError } = await createClient().rpc("sakaba_join_from_guest_gathering", {
      p_token: token, p_agreed: true,
    });
    if (joinError) { setBusy(false); setError("酒場への参加を完了できませんでした。少し待って再度お試しください。"); return; }
    uiToast("GIAの酒場に参加しました");
    router.push("/guild/me/status?new=1");
    router.refresh();
  }

  async function switchAccount() {
    if (busy) return;
    setBusy(true);
    const { error: signOutError } = await createClient().auth.signOut();
    setBusy(false);
    if (signOutError) { setError("アカウントを切り替えられませんでした。再度お試しください。"); return; }
    router.refresh();
  }

  if (!authenticated) return <Window title="ゲストとして申し込む">
    <p className="text-sm leading-relaxed">酒場への入会は不要です。まずメールアドレスを確認し、名前と短い自己紹介を登録します。次回は同じメールで入力内容を引き継げます。</p>
    {mailSent ? <p role="status" className="c-card mt-5 border-dashed px-4 py-3 text-sm">確認メールを送りました。メール内のリンクからこのページに戻って、申込を完了してください。</p> :
      <form onSubmit={(e) => void sendLoginLink(e)} className="mt-5 space-y-4">
        <label className="block text-sm">メールアドレス<input type="email" required maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="c-input mt-2 h-12" placeholder="example@example.com" /></label>
        {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
        <button type="submit" disabled={busy || !open} className="rpg-button min-h-12 w-full px-5 disabled:opacity-50 sm:w-auto">{busy ? "送信中…" : "▶ 確認メールを送る"}</button>
      </form>}
    {!open && <p className="c-muted mt-4 text-sm">この集まりの募集は終了しました。</p>}
  </Window>;

  return <div className="space-y-9">
    <Window title={applied ? "申込済み" : "ゲストとして申し込む"}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="c-muted break-all">使用中のメール：{accountEmail}</p>
        <button type="button" disabled={busy} onClick={() => void switchAccount()} className="c-muted min-h-9 underline disabled:opacity-50">別のメールに切り替える</button>
      </div>
      {applied && <p role="status" className="c-card mb-5 border-dashed px-4 py-3 text-sm">この集まりに申し込んでいます。自己紹介の掲載はいつでも変更できます。</p>}
      {open ? <form onSubmit={(e) => void apply(e)} className="space-y-5">
        <label className="block text-sm">お名前 <span className="text-[#c62828]">必須</span><input className="c-input mt-2 h-12" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="name" required /></label>
        <label className="block text-sm">短い自己紹介 <span className="c-muted text-xs">任意・240文字まで</span><textarea className="c-input mt-2 min-h-24" value={introduction} onChange={(e) => setIntroduction(e.target.value)} maxLength={240} placeholder="どんな仕事をしているか、最近興味のあることなど" /></label>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={showIntroduction} onChange={(e) => setShowIntroduction(e.target.checked)} className="mt-1 accent-[#1b2a41]" /><span>名前とこの自己紹介を、この集まりの招待URLを知っている人に表示する。<span className="c-muted block text-xs">選ばない場合は表示しません。メールアドレスは表示されません。</span></span></label>
        {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={busy} className="rpg-button min-h-12 px-5 disabled:opacity-50">{busy ? "保存中…" : applied ? "▶ 申込内容を保存" : "▶ 集まりに申し込む"}</button>
          {applied && <button type="button" disabled={busy} onClick={() => void withdraw()} className="c-muted min-h-11 text-sm underline disabled:opacity-50">申込を取り消す</button>}
        </div>
      </form> : <p className="text-sm">募集は終了しました。</p>}
    </Window>
    {applied && !event.is_member && <div id="join-guild" className="scroll-mt-6"><Window title="GIAの酒場にも参加する">
      <p className="text-sm leading-relaxed">酒場への参加は無料です。参加すると、メンバーのステータスやクエストを見られます。飲み会への申込だけでは入会しません。</p>
      <div className="c-card mt-5 px-4 py-3 text-sm">
        <p className="c-label mb-2">酒場の約束</p>
        <ul className="space-y-1">{GUILD_PROMISES.map((promise) => <li key={promise}>・{promise}</li>)}</ul>
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-[#1b2a41]" /><span>酒場の約束に同意して、会員として参加する</span></label>
      {error && <p role="alert" className="mt-3 text-sm text-[#c62828]">{error}</p>}
      <button type="button" onClick={() => void joinGuild()} disabled={busy || !agreed} className="rpg-button mt-5 min-h-12 w-full px-5 disabled:opacity-50 sm:w-auto">{busy ? "登録中…" : "▶ 酒場に無料で参加する"}</button>
      <p className="c-muted mt-3 text-xs leading-relaxed">会社名・役職は後からステータス画面で追加できます。登録時は公開されません。</p>
    </Window></div>}
  </div>;
}
