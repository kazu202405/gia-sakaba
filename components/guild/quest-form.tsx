"use client";

// クエストを出す・なおす画面。1枚の入力 → 確認 → 出す（なおす）。
//
// - 報酬・予算の欄は置かない。紹介料・人材募集・報酬表示の法務確認が済むまで（sakaba_design.md §3.5）
// - 「急ぎ」はしめきりが14日以内のときだけ付けられる。だれでも付けられると、みんなが付けて目立たなくなるため
// - なおすときは確認画面に「変わるところ」を出す。参加したいと伝えた人には、変わった項目つきで知らせが届く
//   （全部の項目をなおせる。合わなくなった人は自分で取り消せる）

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Quest, QuestCategory } from "@/lib/guild/types";
import { formatDate, questCategoryHint, questCategoryLabel } from "@/lib/guild/labels";
import { TODAY, guild, regionOptions } from "@/lib/guild/mock-data";
import { diffQuestFields, pickQuestFields, questFieldLabel, type QuestFields } from "@/lib/guild/notifications";
import { uiToast } from "@/lib/ui-dialog";
import { BackLink, questCategoryMark } from "./cards";
import { Field, Select, TextArea, TextInput, scrollToFirstError } from "./form-parts";

type Draft = {
  category: QuestCategory | "";
  title: string;
  summary: string;
  body: string;
  region: string;
  online_ok: boolean;
  deadline: string;
  member_limit: string;
  is_urgent: boolean;
};

const EMPTY: Draft = {
  category: "",
  title: "",
  summary: "",
  body: "",
  region: "",
  online_ok: false,
  deadline: "",
  member_limit: "",
  is_urgent: false,
};

const CATEGORIES = Object.keys(questCategoryLabel) as QuestCategory[];
const URGENT_DAYS = 14;
const MEMBER_LIMIT_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}人まで` }));
const ONLINE_OK_SUFFIX = "（オンライン可）";

/** "YYYY-MM-DD" どうしの日数の差（時差の影響を受けないよう UTC で数える） */
function daysBetween(from: string, to: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

function regionText(d: Draft): string {
  if (d.region === "オンライン" || !d.online_ok) return d.region;
  return `${d.region}${ONLINE_OK_SUFFIX}`;
}

/** 保存されているクエストを入力欄に戻す（ばしょの「（オンライン可）」はチェックに分ける） */
function draftFromQuest(q: Quest): Draft {
  const onlineOk = q.region.endsWith(ONLINE_OK_SUFFIX);
  return {
    category: q.category,
    title: q.title,
    summary: q.summary,
    body: q.body,
    region: onlineOk ? q.region.slice(0, -ONLINE_OK_SUFFIX.length) : q.region,
    online_ok: onlineOk,
    deadline: q.deadline ?? "",
    member_limit: q.member_limit ? String(q.member_limit) : "",
    is_urgent: q.is_urgent,
  };
}

/** 入力欄の内容を、保存するときの形にする（確認画面の「変わるところ」もこれで比べる） */
function fieldsFromDraft(d: Draft, fallbackCategory: QuestCategory): QuestFields {
  return {
    category: d.category || fallbackCategory,
    title: d.title.trim(),
    summary: d.summary.trim(),
    body: d.body.trim(),
    region: regionText(d),
    deadline: d.deadline || null,
    member_limit: d.member_limit ? Number(d.member_limit) : null,
    is_urgent: d.is_urgent,
  };
}

export function QuestForm({ quest, applicantCount = 0 }: { quest?: Quest; applicantCount?: number }) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [draft, setDraft] = useState<Draft>(() => (quest ? draftFromQuest(quest) : EMPTY));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  // 以前の選択肢に無い地域で出されていても、なおす画面で消えないようにする
  const [initialRegion] = useState(() => (quest ? draftFromQuest(quest).region : ""));
  const regionChoices =
    initialRegion && !regionOptions.includes(initialRegion) ? [initialRegion, ...regionOptions] : regionOptions;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start" });
  }, [step]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!draft.category) next.category = "しゅるいを選んでください";
    if (!draft.title.trim()) next.title = "タイトルを入れてください";
    if (!draft.summary.trim()) next.summary = "ひとことで何をしてほしいかを入れてください";
    if (!draft.body.trim()) next.body = "くわしい内容を入れてください";
    if (!draft.region) next.region = "ばしょを選んでください";
    if (draft.deadline && daysBetween(TODAY, draft.deadline) < 0) next.deadline = "しめきりは きょう以降の日にしてください";
    if (draft.is_urgent) {
      if (!draft.deadline) next.is_urgent = "急ぎにするときは、しめきりも入れてください";
      else if (daysBetween(TODAY, draft.deadline) > URGENT_DAYS)
        next.is_urgent = `急ぎにできるのは、しめきりが${URGENT_DAYS}日以内のときだけです`;
    }
    setErrors(next);
    const ok = Object.keys(next).length === 0;
    if (!ok) scrollToFirstError();
    return ok;
  };

  const changed = quest ? diffQuestFields(pickQuestFields(quest), fieldsFromDraft(draft, quest.category)) : [];

  const submit = () => {
    if (quest) {
      uiToast("なおしました（見本のため保存はされません）");
      router.push(`/guild/quests/${quest.id}`);
      return;
    }
    uiToast(`${guild.terms.quest}を出しました（見本のため保存はされません）`);
    router.push("/guild/quests");
  };

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-24">
      <div className="mb-9">
        {quest ? (
          <BackLink href={`/guild/quests/${quest.id}`} label={`${guild.terms.quest}に もどる`} />
        ) : (
          <BackLink href="/guild/quests" label={`${guild.terms.quest} けいじばん`} />
        )}
      </div>

      {step === "form" ? (
        <section className="c-window p-5 pt-10 sm:p-7 sm:pt-11">
          <span className="c-window-title">{quest ? `${guild.terms.quest}を なおす` : `${guild.terms.quest}を出す`}</span>
          <h1 className="text-xl leading-snug tracking-wider">
            {quest ? "内容を なおします" : `どんな ${guild.terms.quest}を 出しますか？`}
          </h1>
          <p className="c-muted mt-1.5 text-sm leading-relaxed">
            {quest
              ? applicantCount > 0
                ? `なおすと、参加したいと伝えた ${applicantCount}人に 知らせが届きます。`
                : "まだ 参加したい人は いません。"
              : `${guild.name}の ${guild.terms.member}全員が見られます。気になった人が「参加したい」を押すと、あなたに とどきます。`}
          </p>

          <div className="mt-7 space-y-6">
            <Field label="しゅるい" required error={errors.category}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={draft.category === c}
                    onClick={() => set("category", c)}
                    className="c-choice px-3 py-2.5 text-left"
                  >
                    <span className="block text-[15px]">
                      {questCategoryMark[c]} {questCategoryLabel[c]}
                    </span>
                    <span className="block text-[11px] opacity-70">{questCategoryHint[c]}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="タイトル" required hint="ひとめで 何を頼みたいか わかるように" error={errors.title}>
              <TextInput value={draft.title} onChange={(v) => set("title", v)} placeholder="れい：職人の採用ページを作れる人を探しています" max={40} label="タイトル" />
            </Field>

            <Field label="ひとことで" required hint="けいじばんの カードに出ます" error={errors.summary}>
              <TextInput value={draft.summary} onChange={(v) => set("summary", v)} placeholder="れい：求人媒体に頼らず、自社のページから応募が来るようにしたい" max={60} label="ひとことで" />
            </Field>

            <Field label="くわしく" required hint="いまの状況・してほしいこと・来てほしい人" error={errors.body}>
              <TextArea value={draft.body} onChange={(v) => set("body", v)} rows={6} max={800} label="くわしく" />
            </Field>

            <p className="c-card border-dashed px-3 py-2.5 text-xs leading-relaxed">
              ※ 金額（報酬・予算）は ここには書かず、会って話すときに決めてください。
            </p>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="ばしょ" required error={errors.region}>
                <Select value={draft.region} onChange={(v) => set("region", v)} options={regionChoices} label="ばしょ" />
                {draft.region && draft.region !== "オンライン" && (
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.online_ok}
                      onChange={(e) => set("online_ok", e.target.checked)}
                      className="size-4 accent-[#1b2a41]"
                    />
                    オンラインでもOK
                  </label>
                )}
              </Field>
              <Field label="にんずう" hint="任意">
                <Select
                  value={draft.member_limit}
                  onChange={(v) => set("member_limit", v)}
                  options={MEMBER_LIMIT_OPTIONS}
                  label="にんずう"
                  placeholder="きめない"
                />
              </Field>
            </div>

            <Field label="しめきり" hint="任意" error={errors.deadline}>
              <input
                type="date"
                value={draft.deadline}
                min={TODAY}
                onChange={(e) => {
                  set("deadline", e.target.value);
                  if (errors.is_urgent) setErrors((er) => ({ ...er, is_urgent: "" }));
                }}
                aria-label="しめきり"
                className="c-input h-11 sm:max-w-60"
              />
            </Field>

            <Field label="急ぎにする" error={errors.is_urgent}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.is_urgent}
                  aria-label="急ぎにする"
                  onClick={() => set("is_urgent", !draft.is_urgent)}
                  className="c-switch"
                />
                <p className="c-muted text-xs leading-relaxed">
                  しめきりが{URGENT_DAYS}日以内のときだけ 付けられます。けいじばんで <span className="c-tag-urgent">急ぎ</span>{" "}
                  の札が付き、上に出ます。
                </p>
              </div>
            </Field>
          </div>

          <div className="mt-9 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (validate()) setStep("confirm");
              }}
              className="rpg-button h-12 w-full px-6 text-base sm:w-auto"
            >
              ▶ 確認する
            </button>
          </div>
        </section>
      ) : (
        <section className="c-window p-5 pt-10 sm:p-7 sm:pt-11">
          <span className="c-window-title">かくにん</span>
          <p className="c-muted text-sm">{quest ? "この内容に なおします。" : "この内容で けいじばんに出します。"}</p>

          {quest &&
            (changed.length === 0 ? (
              <p className="c-card mt-5 border-dashed px-3 py-2.5 text-sm">変わったところが ありません。</p>
            ) : (
              <div className="c-card mt-5 border-dashed px-3 py-2.5 text-sm leading-relaxed">
                <p>変わるところ：{changed.map((f) => questFieldLabel[f]).join("・")}</p>
                {applicantCount > 0 && (
                  <p className="c-muted mt-1 text-xs">
                    参加したいと伝えた {applicantCount}人に、変わった項目つきで 知らせます。合わなくなった人は 自分で取り消せます。
                  </p>
                )}
              </div>
            ))}

          {draft.category && (
            <div className="c-card mt-5 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="c-label">
                  {questCategoryMark[draft.category]} {questCategoryLabel[draft.category]}
                </span>
                {draft.is_urgent && <span className="c-tag-urgent">急ぎ</span>}
              </div>
              <h1 className="mt-2 text-xl leading-snug tracking-wider break-words">{draft.title}</h1>
              <p className="c-muted mt-1 text-sm break-words">{draft.summary}</p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="c-label">ばしょ</dt>
                <dd>{regionText(draft)}</dd>
                <dt className="c-label">しめきり</dt>
                <dd>{draft.deadline ? `${formatDate(draft.deadline)}まで` : "きめない"}</dd>
                <dt className="c-label">にんずう</dt>
                <dd>{draft.member_limit ? `${draft.member_limit}人まで` : "きめない"}</dd>
              </dl>
              <p className="c-dashed-top mt-4 whitespace-pre-line pt-4 text-[15px] leading-loose break-words">{draft.body}</p>
            </div>
          )}

          <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setStep("form")} className="c-button-sub h-12">
              ◀ なおす
            </button>
            {(!quest || changed.length > 0) && (
              <button type="button" onClick={submit} className="rpg-button h-12 px-6 text-base">
                {quest ? "▶ この内容に なおす" : `▶ ${guild.terms.quest}を出す`}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
