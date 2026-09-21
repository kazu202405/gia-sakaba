"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MyGuildProfile } from "@/lib/guild/server-data";
import type { JobIconKey, Position, VisibleGroup } from "@/lib/guild/types";
import { groupLabel, jobIconLabel, positionLabel } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { JobAvatar } from "./job-avatar";
import { CheckBox, Field, Select, TextArea, TextInput } from "./form-parts";

const GROUPS: VisibleGroup[] = ["work", "values", "connect"];

export function LiveStatusForm({ initial, isPaid }: { initial: MyGuildProfile; isPaid: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [keywords, setKeywords] = useState(initial.keywords.join("、"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof MyGuildProfile>(key: K, value: MyGuildProfile[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  };
  const setContact = (key: keyof MyGuildProfile["contact"], value: string) => {
    setDraft((current) => ({ ...current, contact: { ...current.contact, [key]: value } }));
    setError("");
  };
  const toggleGroup = (group: VisibleGroup) => {
    set("visible_groups", draft.visible_groups.includes(group)
      ? draft.visible_groups.filter((item) => item !== group)
      : [...draft.visible_groups, group]);
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!draft.display_name.trim() || !draft.company_name.trim()) {
      setError("お名前と会社名を入力してください。");
      return;
    }
    if (isPaid && draft.strengths.trim().length < 20) {
      setError("つよみを20文字以上で入力してください。管理者を含む有料機能の利用条件です。");
      return;
    }
    if (draft.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contact.email)) {
      setError("メールアドレスの形式を確認してください。");
      return;
    }
    if ([draft.contact.line_url, draft.contact.website_url].some((url) => url && !/^https?:\/\//.test(url))) {
      setError("URLは https:// から入力してください。");
      return;
    }
    setSaving(true); setError("");
    const { error: rpcError } = await createClient().rpc("sakaba_update_my_profile", {
      p_guild_slug: "gia",
      p_display_name: draft.display_name.trim(),
      p_photo_url: draft.photo_url ?? "",
      p_headline: draft.headline.trim(),
      p_job: draft.job.trim(),
      p_job_icon: draft.job_icon,
      p_region: draft.region.trim(),
      p_bio: draft.bio.trim(),
      p_can_help_with: draft.can_help_with.trim(),
      p_strengths: draft.strengths.trim(),
      p_values_text: draft.values_text.trim(),
      p_vision: draft.vision.trim(),
      p_social_issue: draft.social_issue.trim(),
      p_looking_for: draft.looking_for.trim(),
      p_want_to_meet: draft.want_to_meet.trim(),
      p_visible_groups: draft.visible_groups,
      p_accept_intro: draft.accept_intro,
      p_company_name: draft.company_name.trim(),
      p_position: draft.position,
      p_show_company: draft.show_company,
      p_want_to_solve: draft.want_to_solve.trim(),
      p_show_achievements: draft.show_achievements,
      p_email: draft.contact.email.trim(),
      p_line_url: draft.contact.line_url.trim(),
      p_website_url: draft.contact.website_url.trim(),
      p_industry: draft.industry.trim(),
      p_keywords: keywords.split(/[、,\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 5),
    });
    if (rpcError) {
      setError("保存できませんでした。入力内容を確認して、もう一度お試しください。");
      setSaving(false);
      return;
    }
    router.push("/guild/me");
    router.refresh();
  }

  return <div className="mx-auto max-w-2xl space-y-7">
    <Link href="/guild/me" className="c-muted inline-block text-sm">◀ マイページへ戻る</Link>
    <div><h1 className="text-2xl tracking-[0.12em]">▶ ステータスをなおす</h1><p className="c-muted mt-2 text-sm">書き換えた内容は、保存すると酒場のプロフィールに反映されます。</p></div>
    <form onSubmit={submit} className="space-y-7">
      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">きほん</span>
        <div className="flex items-center gap-4"><JobAvatar icon={draft.job_icon} photoUrl={draft.photo_url} name={draft.display_name} /><p className="c-muted text-xs">写真の変更は、この画面ではまだできません。現在の写真は保存しても残ります。</p></div>
        <Field label="おなまえ" required><TextInput value={draft.display_name} onChange={(value) => set("display_name", value)} max={30} label="おなまえ" /></Field>
        <Field label="ひとこと"><TextInput value={draft.headline} onChange={(value) => set("headline", value)} max={40} label="ひとこと" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="業種"><TextInput value={draft.industry} onChange={(value) => set("industry", value)} max={40} label="業種" /></Field>
          <Field label="地域"><TextInput value={draft.region} onChange={(value) => set("region", value)} max={40} label="地域" /></Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="職業"><TextInput value={draft.job} onChange={(value) => set("job", value)} max={40} label="職業" /></Field>
          <Field label="職業アイコン"><Select value={draft.job_icon} onChange={(value) => set("job_icon", value as JobIconKey)} label="職業アイコン" options={(Object.keys(jobIconLabel) as JobIconKey[]).map((key) => ({ value: key, label: jobIconLabel[key] }))} /></Field>
        </div>
        <Field label="かいしゃ" required><TextInput value={draft.company_name} onChange={(value) => set("company_name", value)} max={60} label="かいしゃ" /></Field>
        <Field label="役職"><Select value={draft.position} onChange={(value) => set("position", value as Position)} label="役職" options={(Object.keys(positionLabel) as Position[]).map((key) => ({ value: key, label: positionLabel[key] }))} /></Field>
        <CheckBox checked={draft.show_company} onChange={(value) => set("show_company", value)}>会社名と役職を名鑑に表示する</CheckBox>
        <Field label="あなたならではの つよみ" hint={isPaid ? "20文字以上で入力してください" : "有料機能を使うときは20文字以上必要です"}><TextArea value={draft.strengths} onChange={(value) => set("strengths", value)} max={200} rows={3} label="つよみ" /></Field>
      </section>

      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">しごと</span>
        <Field label="仕事内容"><TextArea value={draft.bio} onChange={(value) => set("bio", value)} max={800} rows={4} label="仕事内容" /></Field>
        <Field label="できること"><TextArea value={draft.can_help_with} onChange={(value) => set("can_help_with", value)} max={800} rows={4} label="できること" /></Field>
        <Field label="キーワード" hint="読点またはカンマで区切って5つまで"><TextInput value={keywords} onChange={setKeywords} max={150} label="キーワード" /></Field>
      </section>

      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">おもい</span>
        <Field label="だいじにしていること"><TextArea value={draft.values_text} onChange={(value) => set("values_text", value)} max={200} rows={3} label="だいじにしていること" /></Field>
        <Field label="これから"><TextArea value={draft.vision} onChange={(value) => set("vision", value)} max={200} rows={3} label="これから" /></Field>
        <Field label="とりくんでいる社会かだい"><TextArea value={draft.social_issue} onChange={(value) => set("social_issue", value)} max={100} rows={2} label="社会かだい" /></Field>
      </section>

      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">つながり</span>
        <Field label="さがしているもの"><TextArea value={draft.looking_for} onChange={(value) => set("looking_for", value)} max={200} rows={3} label="さがしているもの" /></Field>
        <Field label="であいたい人"><TextArea value={draft.want_to_meet} onChange={(value) => set("want_to_meet", value)} max={200} rows={3} label="であいたい人" /></Field>
        <Field label="いま解決したいこと"><TextInput value={draft.want_to_solve} onChange={(value) => set("want_to_solve", value)} max={60} label="いま解決したいこと" /></Field>
      </section>

      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">れんらく先</span>
        <p className="c-muted text-xs">名鑑には出ません。紹介が承諾された相手にだけ見せる情報です。</p>
        <Field label="メール"><TextInput value={draft.contact.email} onChange={(value) => setContact("email", value)} max={200} type="email" label="メール" /></Field>
        <Field label="LINE URL"><TextInput value={draft.contact.line_url} onChange={(value) => setContact("line_url", value)} max={300} label="LINE URL" /></Field>
        <Field label="ウェブサイト"><TextInput value={draft.contact.website_url} onChange={(value) => setContact("website_url", value)} max={300} label="ウェブサイト" /></Field>
      </section>

      <section id="visibility" className="c-window scroll-mt-24 space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">こうかい はんい</span>
        {GROUPS.map((group) => <CheckBox key={group} checked={draft.visible_groups.includes(group)} onChange={() => toggleGroup(group)}><span className="block">{groupLabel[group].title}を公開する</span><span className="c-muted block text-xs">{groupLabel[group].note}</span></CheckBox>)}
        <CheckBox checked={draft.accept_intro} onChange={(value) => set("accept_intro", value)}>しょうかいを受け付ける</CheckBox>
        <CheckBox checked={draft.show_achievements} onChange={(value) => set("show_achievements", value)}>じっせきを表示する</CheckBox>
      </section>

      {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
      <div className="flex justify-end"><button type="submit" disabled={saving} aria-busy={saving} className="rpg-button h-12 w-full px-6 text-base disabled:opacity-50 sm:w-auto">{saving ? "保存中…" : "▶ 保存する"}</button></div>
    </form>
  </div>;
}
