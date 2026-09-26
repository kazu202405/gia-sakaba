"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContactKind, ContactVisibility, MyGuildProfile } from "@/lib/guild/server-data";
import type { JobIconKey, Position } from "@/lib/guild/types";
import { jobIconLabel, positionLabel } from "@/lib/guild/labels";
import { isValidBirthday } from "@/lib/guild/birthday";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { ImageCropDialog } from "@/components/profile/ImageCropDialog";
import { JobAvatar } from "./job-avatar";
import { CheckBox, Field, Select, TextArea, TextInput } from "./form-parts";

const CONTACT_LABEL: Record<ContactKind, string> = { email: "メール", line: "LINE URL", website: "ウェブサイト" };
type Snapshot = { draft: MyGuildProfile };

function ContactVisibilityChoice({ kind, value, saving, onChange }: {
  kind: ContactKind;
  value: ContactVisibility;
  saving: boolean;
  onChange: (visibility: ContactVisibility) => void;
}) {
  return <fieldset className="mt-3">
    <legend className="c-muted text-xs">{CONTACT_LABEL[kind]}を見せる相手</legend>
    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
      <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name={`${kind}-visibility`} checked={value === "members"} disabled={saving} onChange={() => onChange("members")} className="accent-[#1b2a41]" />メンバーに表示</label>
      <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name={`${kind}-visibility`} checked={value === "approved"} disabled={saving} onChange={() => onChange("approved")} className="accent-[#1b2a41]" />つながり申請の承諾後のみ</label>
    </div>
    {saving && <p role="status" className="c-muted mt-1 text-xs">公開設定を変更中…</p>}
  </fieldset>;
}

function validationError({ draft }: Snapshot): string | null {
  if (!draft.display_name.trim() || !draft.company_name.trim()) return "お名前と会社名を入力すると自動保存されます。";
  if (!isValidBirthday(draft.birth_month, draft.birth_day, draft.birth_year)) return "誕生日は正しい月日を選んでください。生年は任意です。";
  if (draft.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contact.email)) return "メールアドレスの形式を確認してください。";
  if ([draft.contact.line_url, draft.contact.website_url].some((url) => url && !/^https?:\/\//.test(url))) return "URLは https:// から入力してください。";
  return null;
}

async function persist({ draft }: Snapshot) {
  const supabase = createClient();
  const profileResult = await supabase.rpc("sakaba_update_my_profile_simple", {
    p_guild_slug: "gia",
    p_display_name: draft.display_name.trim(),
    p_photo_url: draft.photo_url ?? "",
    p_headline: draft.headline.trim(),
    p_job: draft.job.trim(),
    p_job_icon: draft.job_icon,
    p_region: draft.region.trim(),
    p_bio: draft.bio.trim(),
    p_values_text: draft.values_text.trim(),
    p_looking_for: draft.looking_for.trim(),
    p_visible_groups: ["work", "values", "connect"],
    p_accept_intro: true,
    p_company_name: draft.company_name.trim(),
    p_position: draft.position,
    p_show_company: draft.show_company,
    p_want_to_solve: draft.want_to_solve.trim(),
    p_show_achievements: true,
    p_email: draft.contact.email.trim(),
    p_line_url: draft.contact.line_url.trim(),
    p_website_url: draft.contact.website_url.trim(),
    p_industry: draft.industry.trim(),
  });
  if (profileResult.error) return profileResult;
  const extrasResult = await supabase.rpc("sakaba_update_profile_extras", {
    p_guild_slug: "gia",
    p_name_kana: draft.name_kana?.trim() ?? "",
  });
  if (extrasResult.error) return extrasResult;
  return supabase.rpc("sakaba_update_personal_profile", {
    p_guild_slug: "gia",
    p_hometown: draft.hometown?.trim() ?? "",
    p_hobbies: draft.hobbies?.trim() ?? "",
    p_life_story: draft.life_story?.trim() ?? "",
    p_birth_month: draft.birth_month ?? null,
    p_birth_day: draft.birth_day ?? null,
    p_birth_year: draft.birth_year ?? null,
  });
}

export function LiveStatusForm({ initial }: { initial: MyGuildProfile }) {
  const router = useRouter();
  const currentYear = new Date().getUTCFullYear();
  const [draft, setDraft] = useState(initial);
  const [saveState, setSaveState] = useState<"saved" | "editing" | "saving" | "error">("saved");
  const [leaving, setLeaving] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState<ContactKind | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(Boolean(initial.hometown || initial.hobbies || initial.life_story || initial.birth_month));
  const [retryToken, setRetryToken] = useState(0);
  const [error, setError] = useState("");
  const latestRef = useRef<Snapshot>({ draft: initial });
  const lastSavedRef = useRef(JSON.stringify({ draft: initial }));
  const queueRef = useRef<Promise<boolean>>(Promise.resolve(true));

  const saveCurrent = useCallback((mode: "auto" | "manual"): Promise<boolean> => {
    const next = queueRef.current.then(async () => {
      const snapshot = latestRef.current;
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSavedRef.current) return true;
      const issue = validationError(snapshot);
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
  }, []);

  useEffect(() => {
    latestRef.current = { draft };
    if (JSON.stringify(latestRef.current) === lastSavedRef.current) return;
    const timer = window.setTimeout(() => { void saveCurrent("auto"); }, 1800);
    return () => window.clearTimeout(timer);
  }, [draft, retryToken, saveCurrent]);
  const set = <K extends keyof MyGuildProfile>(key: K, value: MyGuildProfile[K]) => {
    const next = { ...latestRef.current.draft, [key]: value };
    latestRef.current = { draft: next };
    setDraft(next);
    setError("");
    setSaveState("editing");
  };
  const setContact = (key: keyof MyGuildProfile["contact"], value: string) => {
    setDraft((current) => ({ ...current, contact: { ...current.contact, [key]: value } }));
    setError("");
    setSaveState("editing");
  };
  async function changeContactVisibility(kind: ContactKind, visibility: ContactVisibility) {
    if (visibilitySaving || visibility === draft.contact_visibility[kind]) return;
    const previous = draft.contact_visibility[kind];
    const contactKey = kind === "line" ? "line_url" : kind === "website" ? "website_url" : "email";
    const value = draft.contact[contactKey].trim();
    if (visibility === "members" && kind === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("メールアドレスの形式を確認してください。");
      return;
    }
    if (visibility === "members" && kind !== "email" && value && !/^https?:\/\//.test(value)) {
      setError(`${CONTACT_LABEL[kind]}は https:// から入力してください。`);
      return;
    }
    set("contact_visibility", { ...draft.contact_visibility, [kind]: visibility });
    setVisibilitySaving(kind);
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_update_contact_visibility", {
        p_guild_slug: "gia",
        p_kind: kind,
        p_visibility: visibility,
        p_value: visibility === "members" ? value : undefined,
      });
      if (rpcError) throw rpcError;
      uiToast(`${CONTACT_LABEL[kind]}を${visibility === "members" ? "メンバーに公開しました" : "非公開にしました"}`);
    } catch {
      setDraft((current) => current.contact_visibility[kind] === visibility ? {
        ...current, contact_visibility: { ...current.contact_visibility, [kind]: previous },
      } : current);
      setError(`${CONTACT_LABEL[kind]}の公開設定を変更できませんでした。もう一度お試しください。`);
      setSaveState("error");
    } finally {
      setVisibilitySaving(null);
    }
  }

  async function saveAndLeave(event?: React.FormEvent) {
    event?.preventDefault();
    if (leaving || visibilitySaving || photoUploading) return;
    setLeaving(true);
    const saved = await saveCurrent("manual");
    if (saved) { router.push("/guild/me"); router.refresh(); }
    else setLeaving(false);
  }

  function closeCropper() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function choosePhoto(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("JPEG・PNG・WebPの画像を選んでください。");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPhotoError("画像は20MBまでです。");
      return;
    }
    setPhotoError("");
    setCropSrc(URL.createObjectURL(file));
  }

  async function uploadPhoto(blob: Blob) {
    closeCropper();
    setPhotoUploading(true);
    setPhotoError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== draft.id) throw new Error("ログイン情報を確認できませんでした。");
      const path = `${user.id}/sakaba-avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, blob, {
        upsert: true,
        contentType: "image/jpeg",
        cacheControl: "3600",
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
      set("photo_url", `${data.publicUrl}?v=${Date.now()}`);
      const saved = await saveCurrent("manual");
      if (!saved) setPhotoError("写真は追加できましたが、プロフィールを保存できませんでした。保存して戻るを押して再試行してください。");
    } catch {
      setPhotoError("写真をアップロードできませんでした。もう一度お試しください。");
    } finally {
      setPhotoUploading(false);
    }
  }

  return <div className="mx-auto max-w-2xl space-y-7">
    <button type="button" onClick={() => void saveAndLeave()} disabled={leaving || Boolean(visibilitySaving) || photoUploading} className="c-muted inline-block text-sm disabled:opacity-50">◀ マイページへ戻る</button>
    <div><h1 className="text-2xl tracking-[0.12em]">▶ ステータスをなおす</h1><p className="c-muted mt-2 text-sm">入力が止まってから約2秒で自動保存します。</p><p role="status" aria-live="polite" className="c-muted mt-2 min-h-5 text-xs">{saveState === "editing" ? "未保存の変更があります" : saveState === "saving" ? "保存中…" : saveState === "error" ? "まだ保存されていません" : "保存済み"}</p></div>
    <form onSubmit={saveAndLeave} className="space-y-7">
      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">きほん</span>
        <div className="flex flex-wrap items-center gap-4">
          <JobAvatar icon={draft.job_icon} photoUrl={draft.photo_url} name={draft.display_name} />
          <div className="space-y-1">
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="プロフィール写真を選ぶ" onChange={(event) => { choosePhoto(event.target.files?.[0]); event.target.value = ""; }} />
            <button type="button" disabled={photoUploading} onClick={() => photoInputRef.current?.click()} className="c-button-sub h-11 px-4 text-sm disabled:opacity-50">{photoUploading ? "写真を追加中…" : draft.photo_url ? "写真を変更する" : "写真を追加する"}</button>
            <p className="c-muted text-xs">JPEG・PNG・WebP／20MBまで</p>
          </div>
        </div>
        {photoError && <p role="alert" className="text-sm text-[#c62828]">{photoError}</p>}
        <Field label="おなまえ" required><TextInput value={draft.display_name} onChange={(value) => set("display_name", value)} max={30} label="おなまえ" /></Field>
        <Field label="ふりがな" hint="任意。名前の読み方をメンバーに伝えられます"><TextInput value={draft.name_kana ?? ""} onChange={(value) => set("name_kana", value)} max={60} label="ふりがな" placeholder="例：やまだ たろう" /></Field>
        <Field label="ひとこと"><TextInput value={draft.headline} onChange={(value) => set("headline", value)} max={40} label="ひとこと" /></Field>
        <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
          <Field label="業種" hint="仕事の分野。例：飲食・士業・IT"><TextInput value={draft.industry} onChange={(value) => set("industry", value)} max={40} label="業種" placeholder="例：飲食" /></Field>
          <Field label="地域"><TextInput value={draft.region} onChange={(value) => set("region", value)} max={40} label="地域" /></Field>
        </div>
        <Field label="職業" hint="あなたがしている仕事。例：居酒屋オーナー・税理士"><TextInput value={draft.job} onChange={(value) => set("job", value)} max={40} label="職業" placeholder="例：居酒屋オーナー" /></Field>
        <Field label="プロフィールのアイコン" hint="写真がないときに表示されます。仕事と同じ絵でなくても大丈夫です">
          <button type="button" aria-expanded={iconPickerOpen} aria-controls="profile-icon-options" onClick={() => setIconPickerOpen((open) => !open)} className="c-input flex min-h-16 w-full items-center gap-3 px-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b2a41]">
            <JobAvatar icon={draft.job_icon} name={jobIconLabel[draft.job_icon]} size="sm" />
            <span className="flex-1 text-sm">{jobIconLabel[draft.job_icon]}</span>
            <span className="c-muted text-xs">{iconPickerOpen ? "閉じる ▲" : "アイコンを選ぶ ▼"}</span>
          </button>
          {iconPickerOpen && <div id="profile-icon-options" role="group" aria-label="プロフィールのアイコン候補" className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(Object.keys(jobIconLabel) as JobIconKey[]).map((key) => <button
              key={key} type="button" onClick={() => { set("job_icon", key); setIconPickerOpen(false); }}
              aria-pressed={draft.job_icon === key}
              className={`flex min-h-24 flex-col items-center justify-center gap-2 border-2 p-2 text-center text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b2a41] ${draft.job_icon === key ? "border-[#1b2a41] bg-[#e8cf8e]" : "border-[#1b2a41]/25 bg-[#fffdf6] hover:border-[#1b2a41]"}`}
            >
              <JobAvatar icon={key} name={jobIconLabel[key]} size="sm" />
              <span>{jobIconLabel[key]}</span>
            </button>)}
          </div>}
        </Field>
        <Field label="かいしゃ" required><TextInput value={draft.company_name} onChange={(value) => set("company_name", value)} max={60} label="かいしゃ" /></Field>
        <Field label="役職"><Select value={draft.position} onChange={(value) => set("position", value as Position)} label="役職" options={(Object.keys(positionLabel) as Position[]).map((key) => ({ value: key, label: positionLabel[key] }))} /></Field>
        <CheckBox checked={draft.show_company} onChange={(value) => set("show_company", value)}>会社名と役職を名鑑に表示する</CheckBox>
      </section>

      <details className="c-window p-5 pt-10 sm:p-7 sm:pt-11" open={personalOpen} onToggle={(event) => setPersonalOpen(event.currentTarget.open)}>
        <span className="c-window-title">人となり</span>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-[15px] tracking-wider">
          <span>▶ 出身地・誕生日・趣味などを書く</span>
          <span className="c-muted text-xs">任意</span>
        </summary>
        <div className="mt-5 space-y-5">
          <p className="c-muted text-xs">書きたい項目だけで大丈夫です。入力した内容はギルドのメンバーに表示されます。</p>
          <Field label="出身地" hint="育った場所など、伝えたい地域を自由に書けます"><TextInput value={draft.hometown ?? ""} onChange={(value) => set("hometown", value)} max={80} label="出身地" placeholder="例：大阪府" /></Field>
          <Field label="誕生日" hint="月日だけでも登録できます。生まれた年も伝えたい場合だけ選んでください">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <label><span className="c-muted mb-1 block text-xs">月</span><Select value={draft.birth_month?.toString() ?? ""} onChange={(value) => { set("birth_month", value ? Number(value) : null); if (!value) { set("birth_day", null); set("birth_year", null); } }} label="誕生月" placeholder="未設定" options={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: `${index + 1}月` }))} /></label>
              <label><span className="c-muted mb-1 block text-xs">日</span><Select value={draft.birth_day?.toString() ?? ""} onChange={(value) => { set("birth_day", value ? Number(value) : null); if (!value) { set("birth_month", null); set("birth_year", null); } }} label="誕生日" placeholder="未設定" options={Array.from({ length: 31 }, (_, index) => ({ value: String(index + 1), label: `${index + 1}日` }))} /></label>
              <label className="col-span-2 sm:col-span-1"><span className="c-muted mb-1 block text-xs">生年（任意）</span><Select value={draft.birth_year?.toString() ?? ""} onChange={(value) => set("birth_year", value ? Number(value) : null)} label="生まれた年" placeholder="未設定" options={Array.from({ length: currentYear - 1899 }, (_, index) => ({ value: String(currentYear - index), label: `${currentYear - index}年` }))} /></label>
            </div>
          </Field>
          <Field label="趣味・好きなこと"><TextArea value={draft.hobbies ?? ""} onChange={(value) => set("hobbies", value)} max={300} rows={3} label="趣味・好きなこと" /></Field>
          <Field label="これまでの歩み" hint="仕事や活動の変化、転機など。書きたい範囲で自由にどうぞ"><TextArea value={draft.life_story ?? ""} onChange={(value) => set("life_story", value)} max={1200} rows={5} label="これまでの歩み" /></Field>
        </div>
      </details>

      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">しごと</span>
        <Field label="仕事内容・できること" hint="仕事の内容、得意なこと、頼まれたらできることなどを自由に書けます"><TextArea value={draft.bio} onChange={(value) => set("bio", value)} max={1200} rows={6} label="仕事内容・できること" /></Field>
      </section>

      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">おもい</span>
        <Field label="自由に書いてください" hint="だいじにしていること、これからしようとしていること、とりくんでいる社会課題など"><TextArea value={draft.values_text} onChange={(value) => set("values_text", value)} max={1200} rows={6} label="おもい" /></Field>
      </section>

      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">つながり</span>
        <Field label="さがしているもの・であいたい人" hint="仕事、情報、協力してほしいこと、話してみたい人などを自由に書けます"><TextArea value={draft.looking_for} onChange={(value) => set("looking_for", value)} max={1200} rows={6} label="さがしているもの・であいたい人" /></Field>
      </section>

      <section className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">れんらく先</span>
        <p className="c-muted text-xs">「メンバーに表示」はログイン中のギルド会員に公開。「つながり申請の承諾後のみ」は、申請が承諾されると当事者に表示されます。</p>
        <Field label="メール"><TextInput value={draft.contact.email} onChange={(value) => setContact("email", value)} max={200} type="email" label="メール" /><ContactVisibilityChoice kind="email" value={draft.contact_visibility.email} saving={visibilitySaving !== null} onChange={(value) => void changeContactVisibility("email", value)} /></Field>
        <Field label="LINE URL"><TextInput value={draft.contact.line_url} onChange={(value) => setContact("line_url", value)} max={300} label="LINE URL" /><ContactVisibilityChoice kind="line" value={draft.contact_visibility.line} saving={visibilitySaving !== null} onChange={(value) => void changeContactVisibility("line", value)} /></Field>
        <Field label="ウェブサイト"><TextInput value={draft.contact.website_url} onChange={(value) => setContact("website_url", value)} max={300} label="ウェブサイト" placeholder="https://example.com" /><ContactVisibilityChoice kind="website" value={draft.contact_visibility.website} saving={visibilitySaving !== null} onChange={(value) => void changeContactVisibility("website", value)} /></Field>
      </section>

      {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
      <div className="flex justify-end"><button type="submit" disabled={leaving || Boolean(visibilitySaving) || photoUploading} aria-busy={leaving || Boolean(visibilitySaving) || photoUploading} className="rpg-button h-12 w-full px-6 text-base disabled:opacity-50 sm:w-auto">{leaving || visibilitySaving || photoUploading ? "保存を確認中…" : "▶ 保存して戻る"}</button></div>
    </form>
    <ImageCropDialog open={cropSrc !== null} src={cropSrc} onCancel={closeCropper} onConfirm={(blob) => void uploadPhoto(blob)} />
  </div>;
}
