"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MyGuildProfile } from "@/lib/guild/server-data";
import type { JobIconKey, Position, VisibleGroup } from "@/lib/guild/types";
import { groupLabel, jobIconLabel, positionLabel } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { JobAvatar } from "./job-avatar";
import { CheckBox, Field, Select, TextArea, TextInput } from "./form-parts";

const GROUPS: VisibleGroup[] = ["work", "values", "connect"];
type Snapshot = { draft: MyGuildProfile; keywords: string };

function validationError({ draft }: Snapshot, isPaid: boolean): string | null {
  if (!draft.display_name.trim() || !draft.company_name.trim()) return "お名前と会社名を入力すると自動保存されます。";
  if (isPaid && draft.strengths.trim().length < 20) return "つよみを20文字以上にすると自動保存されます。";
  if (draft.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contact.email)) return "メールアドレスの形式を確認してください。";
  if ([draft.contact.line_url, draft.contact.website_url].some((url) => url && !/^https?:\/\//.test(url))) return "URLは https:// から入力してください。";
  return null;
}

async function persist({ draft, keywords }: Snapshot) {
  const supabase = createClient();
  const profileResult = await supabase.rpc("sakaba_update_my_profile", {
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
  if (profileResult.error) return profileResult;
  return supabase.rpc("sakaba_update_profile_extras", {
    p_guild_slug: "gia",
    p_name_kana: draft.name_kana?.trim() ?? "",
  });
}

export function LiveStatusForm({ initial, isPaid }: { initial: MyGuildProfile; isPaid: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [keywords, setKeywords] = useState(initial.keywords.join("、"));
  const [saveState, setSaveState] = useState<"saved" | "editing" | "saving" | "error">("saved");
  const [leaving, setLeaving] = useState(false);
  const [websiteSaving, setWebsiteSaving] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [error, setError] = useState("");
  const latestRef = useRef<Snapshot>({ draft: initial, keywords: initial.keywords.join("、") });
  const lastSavedRef = useRef(JSON.stringify({ draft: initial, keywords: initial.keywords.join("、") }));
  const queueRef = useRef<Promise<boolean>>(Promise.resolve(true));

  const saveCurrent = useCallback((mode: "auto" | "manual"): Promise<boolean> => {
    const next = queueRef.current.then(async () => {
      const snapshot = latestRef.current;
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSavedRef.current) return true;
      const issue = validationError(snapshot, isPaid);
      if (issue) { setError(issue); setSaveState("error"); return false; }
      setSaveState("saving"); setError("");
      try {
        const { error: rpcError } = await persist(snapshot);
        if (rpcError) { setError("保存できませんでした。少し待ってもう一度お試しください。"); setSaveState("error"); return false; }
      } catch {
        setError("通信に失敗しました。接続を確認してもう一度お試しください。"); setSaveState("error"); return false;
      }
      lastSavedRef.current = serialized;
      if (JSON.stringify(latestRef.current) === serialized) {
        setSaveState("saved");
        uiToast(mode === "auto" ? "自動保存しました" : "保存しました");
      } else {
        setSaveState("editing");
        setRetryToken((value) => value + 1);
      }
      return true;
    });
    queueRef.current = next.catch(() => false);
    return next;
  }, [isPaid]);

  useEffect(() => {
    latestRef.current = { draft, keywords };
    if (JSON.stringify(latestRef.current) === lastSavedRef.current) return;
    const timer = window.setTimeout(() => { void saveCurrent("auto"); }, 1800);
    return () => window.clearTimeout(timer);
  }, [draft, keywords, retryToken, saveCurrent]);
  const set = <K extends keyof MyGuildProfile>(key: K, value: MyGuildProfile[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
    setSaveState("editing");
  };
  const setContact = (key: keyof MyGuildProfile["contact"], value: string) => {
    setDraft((current) => ({ ...current, contact: { ...current.contact, [key]: value } }));
    setError("");
    setSaveState("editing");
  };
  const setKeywordsValue = (value: string) => {
    setKeywords(value);
    setError("");
    setSaveState("editing");
  };
  const toggleGroup = (group: VisibleGroup) => {
    set("visible_groups", draft.visible_groups.includes(group)
      ? draft.visible_groups.filter((item) => item !== group)
      : [...draft.visible_groups, group]);
  };

  async function changeWebsiteVisibility(visibility: "members" | "approved") {
    if (websiteSaving || visibility === draft.website_visibility) return;
    const previous = draft.website_visibility;
    const website = draft.contact.website_url.trim();
    if (visibility === "members" && website && !/^https?:\/\//.test(website)) {
      setError("ウェブサイトは https:// から入力してください。");
      return;
    }
    set("website_visibility", visibility);
    setWebsiteSaving(true);
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_update_profile_extras", {
        p_guild_slug: "gia",
        p_website_visibility: visibility,
        p_website_url: visibility === "members" ? website : undefined,
      });
      if (rpcError) throw rpcError;
      uiToast(visibility === "members" ? "ウェブサイトをメンバーに公開しました" : "ウェブサイトを非公開にしました");
    } catch {
      setDraft((current) => current.website_visibility === visibility ? { ...current, website_visibility: previous } : current);
      setError("ウェブサイトの公開設定を変更できませんでした。もう一度お試しください。");
      setSaveState("error");
    } finally {
      setWebsiteSaving(false);
    }
  }

  async function saveAndLeave(event?: React.FormEvent) {
    event?.preventDefault();
    if (leaving || websiteSaving) return;
    setLeaving(true);
    const saved = await saveCurrent("manual");
    if (saved) { router.push("/guild/me"); router.refresh(); }
    else setLeaving(false);
  }

  return <div className="mx-auto max-w-2xl space-y-7">
    <button type="button" onClick={() => void saveAndLeave()} disabled={leaving || websiteSaving} className="c-muted inline-block text-sm disabled:opacity-50">◀ マイページへ戻る</button>
    <div><h1 className="text-2xl tracking-[0.12em]">▶ ステータスをなおす</h1><p className="c-muted mt-2 text-sm">入力が止まってから約2秒で自動保存します。</p><p role="status" aria-live="polite" className="c-muted mt-2 min-h-5 text-xs">{saveState === "editing" ? "未保存の変更があります" : saveState === "saving" ? "保存中…" : saveState === "error" ? "まだ保存されていません" : "保存済み"}</p></div>
    <form onSubmit={saveAndLeave} className="space-y-7">
      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">きほん</span>
        <div className="flex items-center gap-4"><JobAvatar icon={draft.job_icon} photoUrl={draft.photo_url} name={draft.display_name} /><p className="c-muted text-xs">写真の変更は、この画面ではまだできません。現在の写真は保存しても残ります。</p></div>
        <Field label="おなまえ" required><TextInput value={draft.display_name} onChange={(value) => set("display_name", value)} max={30} label="おなまえ" /></Field>
        <Field label="ふりがな" hint="任意。名前の読み方をメンバーに伝えられます"><TextInput value={draft.name_kana ?? ""} onChange={(value) => set("name_kana", value)} max={60} label="ふりがな" placeholder="例：やまだ たろう" /></Field>
        <Field label="ひとこと"><TextInput value={draft.headline} onChange={(value) => set("headline", value)} max={40} label="ひとこと" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="業種" hint="仕事の分野。例：飲食・士業・IT"><TextInput value={draft.industry} onChange={(value) => set("industry", value)} max={40} label="業種" placeholder="例：飲食" /></Field>
          <Field label="地域"><TextInput value={draft.region} onChange={(value) => set("region", value)} max={40} label="地域" /></Field>
        </div>
        <Field label="職業" hint="あなたがしている仕事。例：居酒屋オーナー・税理士"><TextInput value={draft.job} onChange={(value) => set("job", value)} max={40} label="職業" placeholder="例：居酒屋オーナー" /></Field>
        <Field label="プロフィールのアイコン" hint="写真がないときに表示されます。仕事と同じ絵でなくても大丈夫です">
          <div role="group" aria-label="プロフィールのアイコン" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(Object.keys(jobIconLabel) as JobIconKey[]).map((key) => <button
              key={key} type="button" onClick={() => set("job_icon", key)}
              aria-pressed={draft.job_icon === key}
              className={`flex min-h-24 flex-col items-center justify-center gap-2 border-2 p-2 text-center text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b2a41] ${draft.job_icon === key ? "border-[#1b2a41] bg-[#e8cf8e]" : "border-[#1b2a41]/25 bg-[#fffdf6] hover:border-[#1b2a41]"}`}
            >
              <JobAvatar icon={key} name={jobIconLabel[key]} size="sm" />
              <span>{jobIconLabel[key]}</span>
            </button>)}
          </div>
        </Field>
        <Field label="かいしゃ" required><TextInput value={draft.company_name} onChange={(value) => set("company_name", value)} max={60} label="かいしゃ" /></Field>
        <Field label="役職"><Select value={draft.position} onChange={(value) => set("position", value as Position)} label="役職" options={(Object.keys(positionLabel) as Position[]).map((key) => ({ value: key, label: positionLabel[key] }))} /></Field>
        <CheckBox checked={draft.show_company} onChange={(value) => set("show_company", value)}>会社名と役職を名鑑に表示する</CheckBox>
        <Field label="あなたならではの つよみ" hint={isPaid ? "20文字以上で入力してください" : "有料機能を使うときは20文字以上必要です"}><TextArea value={draft.strengths} onChange={(value) => set("strengths", value)} max={200} rows={3} label="つよみ" /></Field>
      </section>

      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">しごと</span>
        <Field label="仕事内容"><TextArea value={draft.bio} onChange={(value) => set("bio", value)} max={800} rows={4} label="仕事内容" /></Field>
        <Field label="できること"><TextArea value={draft.can_help_with} onChange={(value) => set("can_help_with", value)} max={800} rows={4} label="できること" /></Field>
        <Field label="キーワード" hint="読点またはカンマで区切って5つまで"><TextInput value={keywords} onChange={setKeywordsValue} max={150} label="キーワード" /></Field>
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
        <p className="c-muted text-xs">メールとLINEは名鑑に表示しません。紹介機能は準備中です。</p>
        <Field label="メール"><TextInput value={draft.contact.email} onChange={(value) => setContact("email", value)} max={200} type="email" label="メール" /></Field>
        <Field label="LINE URL"><TextInput value={draft.contact.line_url} onChange={(value) => setContact("line_url", value)} max={300} label="LINE URL" /></Field>
        <Field label="ウェブサイト"><TextInput value={draft.contact.website_url} onChange={(value) => setContact("website_url", value)} max={300} label="ウェブサイト" placeholder="https://example.com" /></Field>
        <fieldset className="space-y-2">
          <legend className="text-sm">ウェブサイトを見せる相手</legend>
          <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name="website-visibility" value="members" checked={draft.website_visibility === "members"} disabled={websiteSaving} onChange={() => void changeWebsiteVisibility("members")} className="mt-1 accent-[#1b2a41]" /><span>ギルドのメンバーに表示する<span className="c-muted block text-xs">メンバー名鑑から開けます</span></span></label>
          <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name="website-visibility" value="approved" checked={draft.website_visibility === "approved"} disabled={websiteSaving} onChange={() => void changeWebsiteVisibility("approved")} className="mt-1 accent-[#1b2a41]" /><span>紹介が承諾された相手にだけ表示する<span className="c-muted block text-xs">今は非公開です。紹介機能の開始後に利用できます</span></span></label>
          <p role="status" aria-live="polite" className="c-muted text-xs">{websiteSaving ? "公開設定を変更中…" : ""}</p>
        </fieldset>
      </section>

      <section id="visibility" className="c-window scroll-mt-24 space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">こうかい はんい</span>
        {GROUPS.map((group) => <CheckBox key={group} checked={draft.visible_groups.includes(group)} onChange={() => toggleGroup(group)}><span className="block">{groupLabel[group].title}を公開する</span><span className="c-muted block text-xs">{groupLabel[group].note}</span></CheckBox>)}
        <CheckBox checked={draft.accept_intro} onChange={(value) => set("accept_intro", value)}>しょうかいを受け付ける</CheckBox>
        <CheckBox checked={draft.show_achievements} onChange={(value) => set("show_achievements", value)}>じっせきを表示する</CheckBox>
      </section>

      {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
      <div className="flex justify-end"><button type="submit" disabled={leaving || websiteSaving} aria-busy={leaving || websiteSaving} className="rpg-button h-12 w-full px-6 text-base disabled:opacity-50 sm:w-auto">{leaving || websiteSaving ? "保存を確認中…" : "▶ 保存して戻る"}</button></div>
    </form>
  </div>;
}
