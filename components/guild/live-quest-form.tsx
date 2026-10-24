"use client";

import { useState } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import type { GuildQuest } from "@/lib/guild/server-data";
import type { QuestCategory } from "@/lib/guild/types";
import { questCategoryHint, questCategoryLabel } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { isExhausted, isPlanLimitError, type PlanKey, type QuotaSlot } from "@/lib/guild/plan-usage";
import { PlanQuotaExhausted, PlanQuotaNote } from "./plan-quota";
import { BackLink, questCategoryMark } from "./cards";
import { CheckBox, DateInput, Field, Select, TextArea, TextInput, scrollToFirstError } from "./form-parts";
import { useGuildStore } from "@/components/guild/store-context";
import { Go } from "./go-mark";

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

const REGULAR_CATEGORIES = Object.keys(questCategoryLabel) as QuestCategory[];
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

// quota：新しく出すときだけ渡す（今月の残り）
export function LiveQuestForm({ questTerm, gathering = false, quest, quota = null }: { questTerm: string; gathering?: boolean; quest?: GuildQuest; quota?: { plan: PlanKey; slot: QuotaSlot } | null }) {
  const store = useGuildStore();
  const router = useGuildRouter();
  const fixedGathering = gathering || quest?.members_only === true;
  // 新しく出すときだけ、今月の残りを見せる（使い切ったら確認に進めない。最後はDBが止める）
  const showQuota = !quest && quota !== null;
  const quotaExhausted = showQuota && isExhausted(quota?.slot);
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
  const isFreeGathering = isGathering && !fixedGathering;
  const categories = REGULAR_CATEGORIES;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSaveError(null);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!draft.category) next.category = store.w("form.err.category");
    if (!draft.title.trim()) next.title = "タイトルを入れてください";
    if (!draft.summary.trim()) next.summary = "ひとことを入れてください";
    if (!draft.body.trim()) next.body = store.w("form.err.body");
    if (!draft.region.trim()) next.region = store.w("form.err.region");
    if (draft.deadline && draft.deadline !== quest?.deadline && daysBetween(today, draft.deadline) < 0) {
      next.deadline = store.w("form.err.deadline");
    }
    if (draft.urgent && (!draft.deadline || (daysBetween(today, draft.deadline) > 14 && (!quest || draft.deadline !== quest.deadline)))) {
      next.urgent = store.w("form.err.urgent");
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
      ? await createClient().rpc("sakaba_update_quest_v2", { p_quest_id: quest.id, ...fields, p_members_only: fixedGathering })
      : await createClient().rpc("sakaba_create_quest", { p_guild_slug: store.slug, ...fields, p_members_only: fixedGathering });

    if (error || (!quest && typeof data !== "string")) {
      setSaveError(quest ? "保存できませんでした。内容を確認して再度お試しください。"
        : isPlanLimitError(error) ? `今月の${questTerm}・集まりの上限に達しました。毎月1日に戻ります。`
        : "投稿できませんでした。時間をおいて再度お試しください。");
      setSaving(false);
      return;
    }

    if (quest) uiToast(`${questTerm}を保存しました`);
    router.push(store.path(`/quests/${quest?.id ?? data}`));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-9"><BackLink href={quest ? store.path(`/quests/${quest.id}`) : fixedGathering ? store.path("/master") : store.path("/quests")} label={quest ? `${questTerm}に戻る` : fixedGathering ? "管理者" : store.w("quests.title", { quest: questTerm })} /></div>
      <section className="c-window p-5 pt-10 sm:p-7 sm:pt-11">
        <span className="c-window-title">{step === "form" ? quest ? store.w("quest.editTitle", { quest: questTerm }) : fixedGathering ? "限定の集まりを開く" : isFreeGathering ? "招待制の集まりを作る" : `${questTerm}を出す` : store.w("form.confirmTitle")}</span>
        {showQuota && quota && step === "form" && (quotaExhausted ? <div className="mb-6"><PlanQuotaExhausted kind="quest" plan={quota.plan} slot={quota.slot} /></div> : <PlanQuotaNote kind="quest" plan={quota.plan} slot={quota.slot} className="mb-5" />)}
        {step === "form" ? (
          <>
            <h1 className="text-xl tracking-wider">{quest ? store.w("form.editQ") : isGathering ? "どんな集まりを開きますか？" : `どんな${questTerm}を出しますか？`}</h1>
            <p className="c-muted mt-2 text-sm leading-relaxed">{quest ? store.w("form.editNote") : fixedGathering ? "有料会員が詳しい内容を見て申し込めます。はじめて申し込む人は管理者の承認が必要です。" : isFreeGathering ? "酒場の掲示板には表示されません。作成後に招待URLを作って案内できます。" : "投稿すると、酒場のメンバーに公開されます。"}</p>
            <div className="mt-7 space-y-6">
              {fixedGathering ? <p className="c-card px-3 py-2.5 text-sm">{questCategoryMark.gathering} {questCategoryLabel.gathering}<span className="c-chip ml-2">有料会員限定</span></p> : <Field label={store.w("form.fieldKind")} required error={errors.category}>
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
              <Field label="ひとことで" required hint={isFreeGathering ? "招待ページに表示されます" : "掲示板のカードに表示されます"} error={errors.summary}>
                <TextInput value={draft.summary} onChange={(value) => set("summary", value)} max={60} label="ひとことで" />
              </Field>
              <Field label={store.w("form.fieldBody")} required hint={isGathering ? "開催日時・会場・当日の流れを書いてください" : undefined} error={errors.body}>
                <TextArea value={draft.body} onChange={(value) => set("body", value)} rows={6} max={800} label={store.w("form.fieldBody")} />
              </Field>
              <p className="c-card border-dashed px-3 py-2.5 text-xs leading-relaxed">{isGathering ? "※ 酒場内で会費は集められません。当日お店で払う会費があれば、詳しい内容に書いてください。" : "※ 金額（報酬・予算）はここには書かず、会って話すときに決めてください。"}</p>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label={store.w("form.fieldPlace")} required hint="地域名またはオンライン" error={errors.region}>
                  <TextInput value={draft.region} onChange={(value) => set("region", value)} max={80} label={store.w("form.fieldPlace")} placeholder="例：大阪／オンライン可" />
                </Field>
                <Field label={store.w("form.fieldHeadcount")} hint="任意">
                  <Select value={draft.memberLimit} onChange={(value) => set("memberLimit", value)} options={LIMIT_OPTIONS} label={store.w("form.fieldHeadcount")} placeholder={store.w("form.undecided")} />
                </Field>
              </div>
              <Field label={isGathering ? store.w("form.fieldApplyDeadline") : store.w("form.fieldDeadline")} hint="任意" error={errors.deadline}>
                <div className="sm:max-w-60"><DateInput value={draft.deadline} onChange={(value) => set("deadline", value)} min={quest?.deadline && quest.deadline < today ? quest.deadline : today} label={store.w("form.fieldDeadline")} /></div>
              </Field>
              {!isGathering && <Field label="急ぎにする" error={errors.urgent}>
                <CheckBox checked={draft.urgent} onChange={(value) => set("urgent", value)}>
                  <span className="text-sm">{store.w("form.urgentHint")}</span>
                </CheckBox>
              </Field>}
            </div>
            {!isGathering && <p className="c-muted mt-8 text-xs leading-relaxed">{store.w("rules.promiseNote")}</p>}
            <div className="mt-5 flex justify-end">
              <button type="button" disabled={quotaExhausted} onClick={() => { if (validate()) setStep("confirm"); }} className="rpg-button h-12 w-full px-6 text-base disabled:opacity-50 sm:w-auto"><Go />確認する</button>
            </div>
          </>
        ) : (
          <>
            <p className="c-muted text-sm">{quest ? "この内容で保存します。" : fixedGathering ? "この内容で、有料会員向けの集まりを公開します。" : isFreeGathering ? "この内容で集まりを作ります。招待URLは次の画面で作れます。" : "この内容で公開します。"}</p>
            <div className="c-card mt-5 space-y-3 p-4 sm:p-5">
              <p className="c-label text-xs">{questCategoryMark[draft.category as QuestCategory]} {questCategoryLabel[draft.category as QuestCategory]}{fixedGathering && <span className="c-chip ml-2">有料会員限定</span>}</p>
              <h1 className="text-xl break-words">{draft.title.trim()}</h1>
              <p className="c-muted text-sm break-words">{draft.summary.trim()}</p>
              <p className="whitespace-pre-line break-words text-sm leading-relaxed">{draft.body.trim()}</p>
              <p className="c-muted text-xs">{store.w("form.summaryLine", { region: draft.region.trim(), deadline: draft.deadline || store.w("form.undecided"), limit: draft.memberLimit || store.w("form.undecided") })}{draft.urgent && "／急ぎ"}</p>
            </div>
            {saveError && <p role="alert" className="mt-5 text-sm text-[#c62828]">{saveError}</p>}
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setStep("form")} disabled={saving} className="c-button-sub h-12">{store.w("form.backToEdit")}</button>
              <button type="button" onClick={submit} disabled={saving} className="rpg-button h-12 px-6 text-base">{saving ? quest ? "保存中…" : isFreeGathering ? "作成中…" : "公開中…" : quest ? <><Go />保存する</> : isFreeGathering ? <><Go />集まりを作る</> : <><Go />公開する</>}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
