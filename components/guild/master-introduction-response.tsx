"use client";

import { useState, type FormEvent } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import {
  MASTER_INTRO_COMPANY_MAX,
  MASTER_INTRO_NAME_MAX,
  masterIntroductionContactLabel,
  type MasterIntroductionContactKind,
  type MasterIntroductionView,
} from "@/lib/guild/master-introductions";
import { formatJstDate } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";

function Contact({ kind, value }: { kind: MasterIntroductionContactKind; value: string }) {
  if (kind === "via_admin") return <p className="text-sm">管理者を通して連絡します。</p>;
  const href = kind === "email" ? `mailto:${value}` : value;
  return <p className="text-sm"><span className="c-label mr-2">{masterIntroductionContactLabel[kind]}</span><a href={href} className="break-all underline underline-offset-4" target={kind === "email" ? undefined : "_blank"} rel={kind === "email" ? undefined : "noreferrer"}>{value}</a></p>;
}

export function MasterIntroductionResponse({ token, introduction, authenticated, accountEmail }: {
  token: string;
  introduction: MasterIntroductionView;
  authenticated: boolean;
  accountEmail: string;
}) {
  const router = useGuildRouter();
  const [email, setEmail] = useState("");
  const [mailSent, setMailSent] = useState(false);
  const [name, setName] = useState(introduction.approved_name || introduction.recipient_name);
  const [company, setCompany] = useState(introduction.approved_company || introduction.recipient_company);
  const [contactKind, setContactKind] = useState<MasterIntroductionContactKind>(introduction.contact_kind ?? "email");
  const [contactValue, setContactValue] = useState(introduction.contact_value || accountEmail);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendLoginLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    const callback = `${window.location.origin}/guild/auth/callback?next=${encodeURIComponent(`/i/${token}`)}`;
    const { error: authError } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback, shouldCreateUser: true },
    });
    setBusy(false);
    if (authError) { setError("確認メールを送れませんでした。アドレスを確認し、少し待って再度お試しください。"); return; }
    setMailSent(true);
  }

  async function respond(accept: boolean) {
    if (busy) return;
    if (accept) {
      if (!name.trim() || name.trim().length > MASTER_INTRO_NAME_MAX) { setError("お名前を30文字以内で入力してください。"); return; }
      if (company.trim().length > MASTER_INTRO_COMPANY_MAX) { setError("会社名・屋号は60文字以内で入力してください。"); return; }
      if (!agreed) { setError("相手だけに情報を見せることへの同意を確認してください。"); return; }
      if (contactKind !== "via_admin" && !contactValue.trim()) { setError("相手へ渡す連絡先を入力してください。"); return; }
    } else {
      const confirmed = await uiConfirm({
        title: "今回は見送ります",
        message: "相手には、どちらが見送ったかを知らせず「今回は成立しませんでした」と表示します。",
        okLabel: "見送る",
      });
      if (!confirmed) return;
    }
    setBusy(true); setError("");
    const { data, error: responseError } = await createClient().rpc("sakaba_respond_master_introduction", {
      p_token: token,
      p_accept: accept,
      p_name: accept ? name.trim() : "",
      p_company: accept ? company.trim() : "",
      p_contact_kind: accept ? contactKind : null,
      p_contact_value: accept && contactKind !== "via_admin" ? contactValue.trim() : "",
      p_agreed: accept ? agreed : false,
    });
    setBusy(false);
    if (responseError) {
      setError(responseError.message.includes("different account") ? "この紹介を受け取った方のアカウントと異なります。別のメールで入り直してください。" : "回答を保存できませんでした。入力内容を確認して再度お試しください。");
      return;
    }
    uiToast(data === "connected" ? "双方の承諾がそろい、紹介が成立しました" : accept ? "承諾しました" : "今回は見送りました");
    router.refresh();
  }

  async function switchAccount() {
    if (busy) return;
    setBusy(true); setError("");
    const { error: signOutError } = await createClient().auth.signOut();
    setBusy(false);
    if (signOutError) { setError("アカウントを切り替えられませんでした。再度お試しください。"); return; }
    router.refresh();
  }

  if (introduction.status === "connected" && introduction.counterpart) return <Window title="紹介が成立しました">
    <p className="text-sm leading-relaxed">お二人の承諾がそろいました。相手が確認した情報と、選んだ連絡方法です。</p>
    <div className="c-card mt-5 p-4 sm:p-5">
      <p className="text-lg">{introduction.counterpart.name}</p>
      {introduction.counterpart.company && <p className="c-muted mt-1 text-sm">{introduction.counterpart.company}</p>}
      <div className="c-dashed-top mt-4 pt-4"><Contact kind={introduction.counterpart.contact_kind} value={introduction.counterpart.contact_value} /></div>
    </div>
    <p className="c-muted mt-4 text-xs">このURLは成立から90日後に見られなくなります。必要な連絡先はご自身で保存してください。</p>
  </Window>;

  if (introduction.status === "declined") return <Window title="今回のご紹介について"><p className="text-sm leading-relaxed">今回はご紹介が成立しませんでした。どちらが見送ったかは、お互いに表示していません。</p></Window>;
  if (introduction.status === "expired") return <Window title="回答期限が過ぎました"><p className="text-sm leading-relaxed">このご紹介の回答期限は終了しました。続けたい場合は、管理者へ新しいURLをご依頼ください。</p></Window>;
  if (introduction.status === "cancelled") return <Window title="この紹介は取り消されました"><p className="text-sm leading-relaxed">管理者がこのご紹介を取り消しました。入力した連絡先が相手に表示されることはありません。</p></Window>;

  if (!authenticated) return <Window title="メールで本人確認">
    <p className="text-sm leading-relaxed">回答前にメールアドレスを確認します。酒場への入会にはなりません。</p>
    {mailSent ? <p role="status" className="c-card mt-5 border-dashed px-4 py-3 text-sm">確認メールを送りました。メール内のリンクから、この紹介ページへ戻ってください。</p> : <form onSubmit={(event) => void sendLoginLink(event)} className="mt-5 space-y-4">
      <label className="block text-sm">メールアドレス<input type="email" required maxLength={200} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="c-input mt-2 h-12" placeholder="example@example.com" /></label>
      {error && <p role="alert" className="text-sm text-[#b52a2a]">{error}</p>}
      <button type="submit" disabled={busy} className="rpg-button min-h-12 w-full px-5 disabled:opacity-50 sm:w-auto">{busy ? "送信中…" : "▶ 確認メールを送る"}</button>
    </form>}
  </Window>;

  if (!introduction.identity_ok) return <Window title="別のメールで確認してください">
    <p className="text-sm leading-relaxed">現在ログインしているメールは、この紹介の受取人として確認できませんでした。</p>
    <p className="c-muted mt-3 break-all text-xs">使用中のメール：{accountEmail}</p>
    {error && <p role="alert" className="mt-3 text-sm text-[#b52a2a]">{error}</p>}
    <button type="button" disabled={busy} onClick={() => void switchAccount()} className="c-button-sub mt-5 min-h-11 px-4 text-sm disabled:opacity-50">別のメールで確認する</button>
  </Window>;

  if (introduction.response_status === "accepted") return <Window title="お返事を受け付けました">
    <p className="text-sm leading-relaxed">あなたは「つながってみる」と回答しています。もう一人の返事がそろうまで、氏名と連絡先は相手に表示されません。</p>
    <p className="c-muted mt-4 text-xs">回答期限：{formatJstDate(introduction.expires_at)}</p>
  </Window>;

  return <Window title="お返事">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs"><p className="c-muted break-all">確認済みメール：{accountEmail}</p><button type="button" disabled={busy} onClick={() => void switchAccount()} className="c-muted min-h-9 underline disabled:opacity-50">別のメールに切り替える</button></div>
    <form onSubmit={(event) => { event.preventDefault(); void respond(true); }} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">相手に見せるお名前 <span className="text-[#b52a2a]">必須</span><input className="c-input mt-1 h-11" value={name} onChange={(event) => setName(event.target.value)} maxLength={MASTER_INTRO_NAME_MAX} required /></label>
        <label className="block text-sm">会社名・屋号 <span className="c-muted text-xs">任意</span><input className="c-input mt-1 h-11" value={company} onChange={(event) => setCompany(event.target.value)} maxLength={MASTER_INTRO_COMPANY_MAX} /></label>
      </div>
      <div className="c-card border-dashed p-4">
        <label className="block text-sm">成立後に相手へ渡す連絡方法
          <select className="c-input mt-1 h-11" value={contactKind} onChange={(event) => { const next = event.target.value as MasterIntroductionContactKind; setContactKind(next); if (next === "email" && !contactValue) setContactValue(accountEmail); }}>
            {(Object.keys(masterIntroductionContactLabel) as MasterIntroductionContactKind[]).map((kind) => <option key={kind} value={kind}>{masterIntroductionContactLabel[kind]}</option>)}
          </select>
        </label>
        {contactKind !== "via_admin" && <label className="mt-4 block text-sm">連絡先 <span className="text-[#b52a2a]">必須</span><input type={contactKind === "email" ? "email" : "url"} className="c-input mt-1 h-11" value={contactValue} onChange={(event) => setContactValue(event.target.value)} maxLength={300} placeholder={contactKind === "email" ? "example@example.com" : "https://..."} required /></label>}
        <p className="c-muted mt-3 text-xs">管理者には連絡方法の有無だけが見えます。入力した連絡先そのものは表示しません。</p>
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 accent-[#1b2a41]" /><span>双方が承諾した場合に限り、この名前・会社名・選んだ連絡先を相手だけに表示する。<span className="c-muted block text-xs">名鑑や公開プロフィールには掲載されません。</span></span></label>
      {error && <p role="alert" className="text-sm text-[#b52a2a]">{error}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !agreed} className="rpg-button min-h-12 px-5 disabled:opacity-50">{busy ? "保存中…" : "▶ つながってみる"}</button><button type="button" disabled={busy} onClick={() => void respond(false)} className="c-button-sub min-h-12 px-5 text-sm disabled:opacity-50">今回は見送る</button></div>
    </form>
  </Window>;
}
