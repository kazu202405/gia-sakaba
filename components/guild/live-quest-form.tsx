"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GuildQuest } from "@/lib/guild/server-data";
import type { QuestCategory } from "@/lib/guild/types";
import { questCategoryHint, questCategoryLabel } from "@/lib/guild/labels";
import { PROMISE_NOTE } from "@/lib/guild/rules";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
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

const REGULAR_CATEGORIES = (Object.keys(questCategoryLabel) as QuestCategory[]).filter(
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

export function LiveQuestForm({ questTerm, gathering = false, canCreateGathering = false, quest }: { questTerm: string; gathering?: boolean; canCreateGathering?: boolean; quest?: GuildQuest }) {
  const router = useRouter();
  const fixedGathering = gathering || quest?.members_only === true;
  const [draft, setDraft] = useState<Draft>(quest ? {
    category: quest.category,
    title: quest.title,
    summary: quest.summary,
    body: quest.body,
    region: quest.region,
    deadline: quest.deadline ?? "",
    memberLimit: quest.member_limit?.toString() ?? "",
    urgent: quest.is_urgent,
  } : fixedGathering ? { ...EMPTY, category: "gathering" } : EMPTY);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const today = todayInJapan();
  const isGathering = fixedGathering || draft.category === "gathering";
  const categories = canCreateGathering && !quest ? [...REGULAR_CATEGORIES, "gathering" as const] : REGULAR_CATEGORIES;

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
    if (draft.deadline && draft.deadline !== quest?.deadline && daysBetween(today, draft.deadline) < 0) {
      next.deadline = "しめきりは今日以降にしてください";
    }
    if (draft.urgent && (!draft.deadline || (daysBetween(today, draft.deadline) > 14 && (!quest || draft.deadline !== quest.deadline)))) {
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

    const fields = {
      p_title: draft.title.trim(),
      p_category: draft.category,
      p_summary: draft.summary.trim(),
      p_body: draft.body.trim(),
      p_region: draft.region.trim(),
      p_deadline: draft.deadline || null,
      p_member_limit: draft.memberLimit ? Number(draft.memberLimit) : null,
      p_is_urgent: draft.urgent,
    };
    const { data, error } = quest
      ? await createClient().rpc("sakaba_update_quest", { p_quest_id: quest.id, ...fields })
      : await createClient().rpc("sakaba_create_quest", { p_guild_slug: "gia", ...fields, p_members_only: isGathering });

    if (error || (!quest && typeof data !== "string")) {
      setSaveError(quest ? "保存できませんでした。内容を確認して再度お試しください。" : "投稿できませんでした。時間をおいて再度お試しください。");
      setSaving(false);
      return;
    }

    if (quest) uiToast(`${questTerm}を保存しました`);
    router.push(`/guild/quests/${quest?.id ?? data}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-9"><BackLink href={quest ? `/guild/quests/${quest.id}` : fixedGathering ? "/guild/master" : "/guild/quests"} label={quest ? `${questTerm}に戻る` : fixedGathering ? "ギルドマスター" : `${questTerm} けいじばん`} /></div>
      <section className="c-window p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">{step === "form" ? quest ? `${questTerm}をなおす` : isGathering ? "限定の集まりを開く" : `${questTerm}を出す` : "かくにん"}</span>
        {step === "form" ? (
          <>
            <h1 className="text-xl tracking-wider">{quest ? "内容をなおしますか？" : isGathering ? "どんな集まりを開きますか？" : `どんな${questTerm}を出しますか？`}</h1>
            <p className="c-muted mt-2 text-sm leading-relaxed">{quest ? "保存すると、参加希望者にも変更をおしらせします。" : isGathering ? "有料会員が詳しい内容を見て申し込めます。はじめて申し込む人はギルドマスターの承認が必要です。" : "投稿すると、酒場のメンバーに公開されます。"}</p>
            <div className="mt-7 space-y-6">
              {fixedGathering ? <p className="c-card px-3 py-2.5 text-sm">{questCategoryMark.gathering} {questCategoryLabel.gathering}<span className="c-chip ml-2">有料会員限定</span></p> : <Field label="しゅるい" required error={errors.category}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {categories.map((category) => (
                    <button key={category} type="button" aria-pressed={draft.category === category}
                      onClick={() => { set("category", category); if (category === "gathering") set("urgent", false); }} className="c-choice px-3 py-2.5 text-left">
                      <span className="block text-[15px]">{questCategoryMark[category]} {questCategoryLabel[category]}</span>
                      <span className="block text-[11px] opacity-70">{questCategoryHint[category]}</span>
                    </button>
                  ))}
                </div>
              </Field>}
              <Field label="タイトル" required error={errors.title}>
                <TextInput value={draft.title} onChange={(value) => set("title", value)} max={40} label="タイトル" placeholder={isGathering ? "例：経営者どうしの少人数交流会" : undefined} />
              </Field>
              <Field label="ひとことで" required hint="掲示板のカードに表示されます" error={errors.summary}>
                <TextInput value={draft.summary} onChange={(value) => set("summary", value)} max={60} label="ひとことで" />
              </Field>
              <Field label="くわしく" required hint={isGathering ? "開催日時・会場・当日の流れを書いてください" : undefined} error={errors.body}>
                <TextArea value={draft.body} onChange={(value) => set("body", value)} rows={6} max={800} label="くわしく" />
              </Field>
              <p className="c-card border-dashed px-3 py-2.5 text-xs leading-relaxed">{isGathering ? "※ 酒場内で会費は集められません。当日お店で払う会費があれば、詳しい内容に書いてください。" : "※ 金額（報酬・予算）はここには書かず、会って話すときに決めてください。"}</p>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="ばしょ" required hint="地域名またはオンライン" error={errors.region}>
                  <TextInput value={draft.region} onChange={(value) => set("region", value)} max={80} label="ばしょ" placeholder="例：大阪／オンライン可" />
                </Field>
                <Field label="にんずう" hint="任意">
                  <Select value={draft.memberLimit} onChange={(value) => set("memberLimit", value)} options={LIMIT_OPTIONS} label="にんずう" placeholder="きめない" />
                </Field>
              </div>
              <Field label={isGathering ? "申込のしめきり" : "しめきり"} hint="任意" error={errors.deadline}>
                <div className="sm:max-w-60"><DateInput value={draft.deadline} onChange={(value) => set("deadline", value)} min={quest?.deadline && quest.deadline < today ? quest.deadline : today} label="しめきり" /></div>
              </Field>
              {!isGathering && <Field label="急ぎにする" error={errors.urgent}>
                <CheckBox checked={draft.urgent} onChange={(value) => set("urgent", value)}>
                  <span className="text-sm">しめきりが14日以内のときだけ付けられます</span>
                </CheckBox>
              </Field>}
            </div>
            {!isGathering && <p className="c-muted mt-8 text-xs leading-relaxed">{PROMISE_NOTE}</p>}
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => { if (validate()) setStep("confirm"); }} className="rpg-button h-12 w-full px-6 text-base sm:w-auto">▶ 確認する</button>
            </div>
          </>
        ) : (
          <>
            <p className="c-muted text-sm">{quest ? "この内容で保存します。" : isGathering ? "この内容で、有料会員向けの集まりを公開します。" : "この内容で公開します。"}</p>
            <div className="c-card mt-5 space-y-3 p-4 sm:p-5">
              <p className="c-label text-xs">{questCategoryMark[draft.category as QuestCategory]} {questCategoryLabel[draft.category as QuestCategory]}{isGathering && <span className="c-chip ml-2">有料会員限定</span>}</p>
              <h1 className="text-xl break-words">{draft.title.trim()}</h1>
              <p className="c-muted text-sm break-words">{draft.summary.trim()}</p>
              <p className="whitespace-pre-line break-words text-sm leading-relaxed">{draft.body.trim()}</p>
              <p className="c-muted text-xs">ばしょ：{draft.region.trim()}／しめきり：{draft.deadline || "きめない"}／にんずう：{draft.memberLimit || "きめない"}{draft.urgent && "／急ぎ"}</p>
            </div>
            {saveError && <p role="alert" className="mt-5 text-sm text-[#c62828]">{saveError}</p>}
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setStep("form")} disabled={saving} className="c-button-sub h-12">◀ なおす</button>
              <button type="button" onClick={submit} disabled={saving} className="rpg-button h-12 px-6 text-base">{saving ? quest ? "保存中…" : "公開中…" : quest ? "▶ 保存する" : "▶ 公開する"}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
