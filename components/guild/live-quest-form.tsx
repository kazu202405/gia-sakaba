"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuestCategory } from "@/lib/guild/types";
import { questCategoryHint, questCategoryLabel } from "@/lib/guild/labels";
import { PROMISE_NOTE } from "@/lib/guild/rules";
import { createClient } from "@/lib/supabase/client";
import { BackLink, questCategoryMark } from "./cards";
import { CheckBox, DateInput, Field, Select, TextArea, TextInput, scrollToFirstError } from "./form-parts";

type Draft = {
  category: QuestCategory | "";
  title: string;
  summary: string;
  body: string;
  region: string;
  deadline: string;
  memberLimit: string;
  urgent: boolean;
};

const CATEGORIES = (Object.keys(questCategoryLabel) as QuestCategory[]).filter(
  (category) => category !== "gathering",
);
const EMPTY: Draft = {
  category: "",
  title: "",
  summary: "",
  body: "",
  region: "",
  deadline: "",
  memberLimit: "",
  urgent: false,
};
const LIMIT_OPTIONS = Array.from({ length: 10 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1}人まで`,
}));

function todayInJapan(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function LiveQuestForm({ questTerm }: { questTerm: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const today = todayInJapan();

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSaveError(null);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!draft.category) next.category = "しゅるいを選んでください";
    if (!draft.title.trim()) next.title = "タイトルを入れてください";
    if (!draft.summary.trim()) next.summary = "ひとことを入れてください";
    if (!draft.body.trim()) next.body = "くわしい内容を入れてください";
    if (!draft.region.trim()) next.region = "ばしょを入れてください";
    if (draft.deadline && daysBetween(today, draft.deadline) < 0) {
      next.deadline = "しめきりは今日以降にしてください";
    }
    if (draft.urgent && (!draft.deadline || daysBetween(today, draft.deadline) > 14)) {
      next.urgent = "急ぎにできるのは、しめきりが14日以内のときだけです";
    }
    setErrors(next);
    if (Object.keys(next).length) scrollToFirstError();
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (saving) return;
    if (!validate() || !draft.category) {
      setStep("form");
      return;
    }
    setSaving(true);
    setSaveError(null);

    const { data, error } = await createClient().rpc("sakaba_create_quest", {
      p_guild_slug: "gia",
      p_title: draft.title.trim(),
      p_category: draft.category,
      p_summary: draft.summary.trim(),
      p_body: draft.body.trim(),
      p_region: draft.region.trim(),
      p_deadline: draft.deadline || null,
      p_member_limit: draft.memberLimit ? Number(draft.memberLimit) : null,
      p_is_urgent: draft.urgent,
      p_members_only: false,
    });

    if (error || typeof data !== "string") {
      setSaveError("投稿できませんでした。時間をおいて再度お試しください。");
      setSaving(false);
      return;
    }

    router.push(`/guild/quests/${data}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-9"><BackLink href="/guild/quests" label={`${questTerm} けいじばん`} /></div>
      <section className="c-window p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">{step === "form" ? `${questTerm}を出す` : "かくにん"}</span>
        {step === "form" ? (
          <>
            <h1 className="text-xl tracking-wider">どんな{questTerm}を出しますか？</h1>
            <p className="c-muted mt-2 text-sm">投稿すると、酒場のメンバーに公開されます。</p>
            <div className="mt-7 space-y-6">
              <Field label="しゅるい" required error={errors.category}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CATEGORIES.map((category) => (
                    <button key={category} type="button" aria-pressed={draft.category === category}
                      onClick={() => set("category", category)} className="c-choice px-3 py-2.5 text-left">
                      <span className="block text-[15px]">{questCategoryMark[category]} {questCategoryLabel[category]}</span>
                      <span className="block text-[11px] opacity-70">{questCategoryHint[category]}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="タイトル" required error={errors.title}>
                <TextInput value={draft.title} onChange={(value) => set("title", value)} max={40} label="タイトル" />
              </Field>
              <Field label="ひとことで" required hint="掲示板のカードに表示されます" error={errors.summary}>
                <TextInput value={draft.summary} onChange={(value) => set("summary", value)} max={60} label="ひとことで" />
              </Field>
              <Field label="くわしく" required error={errors.body}>
                <TextArea value={draft.body} onChange={(value) => set("body", value)} rows={6} max={800} label="くわしく" />
              </Field>
              <p className="c-card border-dashed px-3 py-2.5 text-xs leading-relaxed">
                ※ 金額（報酬・予算）はここには書かず、会って話すときに決めてください。
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="ばしょ" required hint="地域名またはオンライン" error={errors.region}>
                  <TextInput value={draft.region} onChange={(value) => set("region", value)} max={80} label="ばしょ" placeholder="例：大阪／オンライン可" />
                </Field>
                <Field label="にんずう" hint="任意">
                  <Select value={draft.memberLimit} onChange={(value) => set("memberLimit", value)} options={LIMIT_OPTIONS} label="にんずう" placeholder="きめない" />
                </Field>
              </div>
              <Field label="しめきり" hint="任意" error={errors.deadline}>
                <div className="sm:max-w-60"><DateInput value={draft.deadline} onChange={(value) => set("deadline", value)} min={today} label="しめきり" /></div>
              </Field>
              <Field label="急ぎにする" error={errors.urgent}>
                <CheckBox checked={draft.urgent} onChange={(value) => set("urgent", value)}>
                  <span className="text-sm">しめきりが14日以内のときだけ付けられます</span>
                </CheckBox>
              </Field>
            </div>
            <p className="c-muted mt-8 text-xs leading-relaxed">{PROMISE_NOTE}</p>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => { if (validate()) setStep("confirm"); }} className="rpg-button h-12 w-full px-6 text-base sm:w-auto">▶ 確認する</button>
            </div>
          </>
        ) : (
          <>
            <p className="c-muted text-sm">この内容で公開します。</p>
            <div className="c-card mt-5 space-y-3 p-4 sm:p-5">
              <p className="c-label text-xs">{questCategoryMark[draft.category as QuestCategory]} {questCategoryLabel[draft.category as QuestCategory]}</p>
              <h1 className="text-xl break-words">{draft.title.trim()}</h1>
              <p className="c-muted text-sm break-words">{draft.summary.trim()}</p>
              <p className="whitespace-pre-line break-words text-sm leading-relaxed">{draft.body.trim()}</p>
              <p className="c-muted text-xs">ばしょ：{draft.region.trim()}／しめきり：{draft.deadline || "きめない"}／にんずう：{draft.memberLimit || "きめない"}{draft.urgent && "／急ぎ"}</p>
            </div>
            {saveError && <p role="alert" className="mt-5 text-sm text-[#c62828]">{saveError}</p>}
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setStep("form")} disabled={saving} className="c-button-sub h-12">◀ なおす</button>
              <button type="button" onClick={submit} disabled={saving} className="rpg-button h-12 px-6 text-base">{saving ? "保存中..." : "▶ 公開する"}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
