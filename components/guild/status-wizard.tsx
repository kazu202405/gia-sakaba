"use client";

// ステータス（＝酒場でのプロフィール）を作る・直す画面。1テーマ1画面のQ&A形式。
// 必須は「基本」だけ。ほかは「あとで書く」で飛ばせる（旧GIAの24問は重くて埋まらなかった）。
//
// はじめての人（isNew）には、最初に「GIAで書いた内容を引き継ぐ」を出す。
// 引き継ぎは本人が押したときだけ行う（勝手に写さない）。

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GiaApplicantImport, JobIconKey, Profile, ProfileContact, VisibleGroup } from "@/lib/guild/types";
import { groupLabel, jobIconLabel } from "@/lib/guild/labels";
import { guild, industryOptions, regionOptions } from "@/lib/guild/mock-data";
import { ImageCropDialog } from "@/components/profile/ImageCropDialog";
import { uiToast } from "@/lib/ui-dialog";
import { cn } from "@/lib/utils";
import { JobAvatar } from "./job-avatar";
import { Field, Select, TextArea, TextInput, scrollToFirstError } from "./form-parts";

type Draft = Pick<
  Profile,
  | "display_name"
  | "photo_url"
  | "headline"
  | "industry"
  | "job"
  | "job_icon"
  | "region"
  | "bio"
  | "can_help_with"
  | "keywords"
  | "strengths"
  | "values_text"
  | "vision"
  | "social_issue"
  | "looking_for"
  | "want_to_meet"
  | "visible_groups"
  | "accept_intro"
>;

type ContactDraft = Omit<ProfileContact, "profile_id">;

type StepKey = "intro" | "basic" | "work" | "values" | "connect" | "contact" | "visibility" | "confirm";

const STEP_META: Record<Exclude<StepKey, "intro">, { tag: string; title: string; lead: string; optional: boolean }> = {
  basic: {
    tag: "きほん",
    title: "まずは きほんから",
    lead: "名鑑のカードに出る情報です。ここだけは必須です。",
    optional: false,
  },
  work: {
    tag: "しごと",
    title: "どんな しごとを していますか？",
    lead: "「この人に頼めそう」と思ってもらうための情報です。",
    optional: true,
  },
  values: {
    tag: "おもい",
    title: "だいじにしていること、これから",
    lead: "紹介するとき、人柄が伝わる材料になります。",
    optional: true,
  },
  connect: {
    tag: "つながり",
    title: "どんな人と つながりたいですか？",
    lead: "ギルドマスターが紹介を考えるときに一番見るところです。",
    optional: true,
  },
  contact: {
    tag: "れんらく先",
    title: "れんらく先",
    lead: "名鑑には出ません。紹介が承諾された相手にだけ見えます。",
    optional: true,
  },
  visibility: {
    tag: "こうかい",
    title: "どこまで 見せますか？",
    lead: `${guild.name}の ${guild.terms.member}に見せる範囲です。あとから変えられます。`,
    optional: false,
  },
  confirm: {
    tag: "さいごに",
    title: `この ${guild.terms.status}で とうろくします`,
    lead: `${guild.terms.member}からは こう見えます。`,
    optional: false,
  },
};

const FLOW: Exclude<StepKey, "intro">[] = ["basic", "work", "values", "connect", "contact", "visibility", "confirm"];

const MAX_KEYWORDS = 5;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const EMPTY_DRAFT: Draft = {
  display_name: "",
  photo_url: null,
  headline: "",
  industry: "",
  job: "",
  job_icon: "owner",
  region: "",
  bio: "",
  can_help_with: "",
  keywords: [],
  strengths: "",
  values_text: "",
  vision: "",
  social_issue: "",
  looking_for: "",
  want_to_meet: "",
  visible_groups: ["work", "values", "connect"],
  accept_intro: true,
};

export function StatusWizard({
  isNew,
  initial,
  initialContact,
  giaApplicant,
}: {
  isNew: boolean;
  initial: Draft | null;
  initialContact: ContactDraft | null;
  giaApplicant: GiaApplicantImport | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>(isNew ? "intro" : "basic");
  // はじめて作るときは 通り過ぎた札だけ押せる。なおすときは 最初から どこへでも飛べる
  const [maxReached, setMaxReached] = useState(isNew ? 0 : FLOW.length - 1);
  const [draft, setDraft] = useState<Draft>(initial ?? EMPTY_DRAFT);
  const [contact, setContact] = useState<ContactDraft>(initialContact ?? { email: "", line_url: "", website_url: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imported, setImported] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  // 画面が変わったら先頭へ（スマホで下のまま次の問いが始まらないように）
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start" });
  }, [step]);

  const index = step === "intro" ? -1 : FLOW.indexOf(step);

  const validate = (s: StepKey): boolean => {
    const next: Record<string, string> = {};
    if (s === "basic") {
      if (!draft.display_name.trim()) next.display_name = "お名前を入れてください";
      if (!draft.headline.trim()) next.headline = "一言で「何をしている人か」を入れてください";
      if (!draft.industry) next.industry = "業種を選んでください";
      if (!draft.job.trim()) next.job = "職業を入れてください";
      if (!draft.region) next.region = "地域を選んでください";
    }
    if (s === "contact") {
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))
        next.email = "メールアドレスの形になっていません";
      for (const k of ["line_url", "website_url"] as const) {
        if (contact[k] && !/^https?:\/\//.test(contact[k])) next[k] = "https:// から始まるURLを入れてください";
      }
    }
    setErrors(next);
    const ok = Object.keys(next).length === 0;
    if (!ok) scrollToFirstError();
    return ok;
  };

  const goNext = () => {
    if (step === "intro") return setStep("basic");
    if (!validate(step)) return;
    const n = FLOW[index + 1];
    if (n) {
      setMaxReached((m) => Math.max(m, index + 1));
      setStep(n);
    }
  };

  const goBack = () => {
    setErrors({});
    if (index <= 0) {
      if (isNew && step === "basic") setStep("intro");
      else router.push("/guild/me");
      return;
    }
    setStep(FLOW[index - 1]);
  };

  /** 上の札から飛ぶ。きほんの必須が空のまま先へ行くと、最後で戻されるので ここで止める */
  const jumpTo = (target: Exclude<StepKey, "intro">) => {
    const to = FLOW.indexOf(target);
    if (to === index) return;
    if (to > 0 && !validate("basic")) {
      setStep("basic");
      return;
    }
    setErrors({});
    setMaxReached((m) => Math.max(m, to));
    setStep(target);
  };

  const importFromGia = () => {
    if (!giaApplicant) return;
    setDraft((d) => ({
      ...d,
      display_name: giaApplicant.name,
      headline: giaApplicant.headline,
      job: giaApplicant.job_title,
      // 拠点は複数行で書かれている。酒場は1つなので、先頭が一覧にあれば使う
      region: regionOptions.includes(giaApplicant.location.split("\n")[0]) ? giaApplicant.location.split("\n")[0] : "",
      bio: giaApplicant.services_summary,
      want_to_meet: giaApplicant.want_to_connect_with,
    }));
    setImported(true);
    setStep("basic");
    uiToast("GIAで書いた内容を写しました。足りないところを埋めてください");
  };

  const finish = () => {
    uiToast(
      isNew ? `${guild.name}へようこそ（見本のため保存はされません）` : `${guild.terms.status}を保存しました（見本）`,
    );
    router.push(isNew ? "/guild" : "/guild/me");
  };

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-24">
      {step === "intro" ? (
        <IntroStep hasGia={giaApplicant !== null} onImport={importFromGia} onFresh={goNext} />
      ) : (
        <>
          <div className="mb-8 flex items-center gap-3">
            <button type="button" onClick={goBack} aria-label="戻る" className="c-button-sub size-10 shrink-0 px-0">
              ◀
            </button>
            <div className="min-w-0 flex-1">
              <div className="c-muted flex justify-between text-xs">
                <span>{isNew ? `${guild.terms.status}を つくる` : `${guild.terms.status}を なおす`}</span>
                <span className="tabular-nums">
                  {index + 1}/{FLOW.length}
                </span>
              </div>
              <div className="c-gauge mt-1" aria-hidden>
                {FLOW.map((s, i) => (
                  <span key={s} data-on={i <= index} />
                ))}
              </div>
            </div>
          </div>

          {/* 手順の札。押すと その画面へ飛ぶ（スマホでは この枠の中だけ横に動く） */}
          <nav aria-label="ステータスの てじゅん" className="-mx-1 mb-8 overflow-x-auto px-1 pb-1">
            <div className="flex w-max gap-2">
              {FLOW.map((s, i) => {
                const reachable = i <= maxReached;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!reachable}
                    aria-current={s === step ? "step" : undefined}
                    onClick={() => jumpTo(s)}
                    className={cn(
                      "border-2 border-[#1b2a41] px-2.5 py-1.5 text-xs whitespace-nowrap",
                      s === step ? "bg-[#1b2a41] text-[#fffdf6]" : "bg-[#fffdf6] text-[#1b2a41]",
                      !reachable && "border-dashed opacity-40",
                    )}
                  >
                    {STEP_META[s].tag}
                  </button>
                );
              })}
            </div>
          </nav>

          {imported && step === "basic" && (
            <p className="c-card mb-8 border-dashed px-3 py-2 text-xs leading-relaxed">
              GIAで書いた内容を写しました。ぎょうしゅと しょくぎょうアイコンは、さかばで あたらしく選んでください。
            </p>
          )}

          <section className="c-window p-5 pt-10 sm:p-7 sm:pt-11">
            <span className="c-window-title">{STEP_META[step].tag}</span>
            <h1 className="text-xl leading-snug tracking-wider">{STEP_META[step].title}</h1>
            <p className="c-muted mt-1.5 text-sm">{STEP_META[step].lead}</p>

            <div className="mt-6 space-y-6">
              {step === "basic" && <BasicStep draft={draft} set={set} errors={errors} />}
              {step === "work" && <WorkStep draft={draft} set={set} />}
              {step === "values" && (
                <>
                  <Field label="だいじにしていること" hint="れい：作ったあと、社内で更新できること">
                    <TextArea value={draft.values_text} onChange={(v) => set("values_text", v)} rows={3} max={200} />
                  </Field>
                  <Field label="これから やりたいこと" hint="れい：関西の飲食店の廃業を減らす">
                    <TextArea value={draft.vision} onChange={(v) => set("vision", v)} rows={3} max={200} />
                  </Field>
                  <Field
                    label="とりくんでいる 社会かだい"
                    hint="任意。同じ課題に とりくむ人と つながる手がかりに なります"
                  >
                    <TextArea
                      value={draft.social_issue}
                      onChange={(v) => set("social_issue", v)}
                      rows={2}
                      max={100}
                      placeholder="れい：職人の 後継者不足"
                    />
                  </Field>
                </>
              )}
              {step === "connect" && (
                <>
                  <Field label="いま さがしているもの" hint="れい：決算を相談できる税理士">
                    <TextArea value={draft.looking_for} onChange={(v) => set("looking_for", v)} rows={3} max={200} />
                  </Field>
                  <Field label="であいたい人" hint="れい：店舗を増やしたい経営者">
                    <TextArea value={draft.want_to_meet} onChange={(v) => set("want_to_meet", v)} rows={3} max={200} />
                  </Field>
                </>
              )}
              {step === "contact" && (
                <ContactStep
                  contact={contact}
                  setContact={(c) => {
                    setContact(c);
                    setErrors({});
                  }}
                  errors={errors}
                />
              )}
              {step === "visibility" && <VisibilityStep draft={draft} set={set} />}
              {step === "confirm" && <ConfirmStep draft={draft} contact={contact} onJump={(s) => setStep(s)} />}
            </div>

            <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              {STEP_META[step].optional && (
                <button
                  type="button"
                  onClick={() => {
                    setErrors({});
                    setStep(FLOW[index + 1]);
                  }}
                  className="c-muted h-11 px-4 text-sm underline underline-offset-4"
                >
                  あとで書く
                </button>
              )}
              {step === "confirm" ? (
                <button type="button" onClick={finish} className="rpg-button h-12 px-6 text-base">
                  ▶ {isNew ? "酒場に入る" : "保存する"}
                </button>
              ) : (
                <button type="button" onClick={goNext} className="rpg-button h-12 px-6 text-base">
                  ▶ 次へ
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// ---------------- 各画面 ----------------

function IntroStep({ hasGia, onImport, onFresh }: { hasGia: boolean; onImport: () => void; onFresh: () => void }) {
  return (
    <section className="c-window px-5 pt-11 pb-8 sm:px-10 sm:pt-12 sm:pb-10">
      <span className="c-window-title">あたらしい ぼうけんしゃ</span>
      <h1 className="text-2xl leading-snug tracking-wider">
        あなたの{guild.terms.status}を <span className="inline-block">つくります</span>
      </h1>
      <p className="mt-3 text-[15px] leading-loose">
        {guild.terms.status}は、さかばでの あなたの プロフィールです。
        <br className="hidden sm:block" />
        ひっすは さいしょの「きほん」だけ。ほかは あとから書きたせます。
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {hasGia && (
          <button type="button" onClick={onImport} className="c-choice border-3 px-5 py-4 text-left">
            <span className="block text-base">▶ GIAで書いた内容を ひきつぐ</span>
            <span className="c-muted mt-1 block text-xs leading-relaxed">
              名前・肩書・職業・拠点・サービス内容・つながりたい人を写します。写したあとで直せます。
            </span>
          </button>
        )}
        <button type="button" onClick={onFresh} className="rpg-button justify-start px-5 py-4 text-left">
          <span>
            <span className="block text-base">▶ あたらしく書く</span>
            <span className="mt-1 block text-xs">5分ほどで おわります</span>
          </span>
        </button>
      </div>
    </section>
  );
}

function BasicStep({
  draft,
  set,
  errors,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  errors: Record<string, string>;
}) {
  return (
    <>
      <PhotoField draft={draft} set={set} />
      <Field label="おなまえ" required error={errors.display_name}>
        <TextInput
          value={draft.display_name}
          onChange={(v) => set("display_name", v)}
          placeholder="田中 一郎"
          max={30}
        />
      </Field>
      <Field
        label="ひとことで「なにをしている人」？"
        required
        hint="名鑑のカードに出ます。20〜30文字くらいで"
        error={errors.headline}
      >
        <TextInput
          value={draft.headline}
          onChange={(v) => set("headline", v)}
          placeholder="中小企業のホームページ・LP制作"
          max={40}
        />
      </Field>
      <Field
        label="あなたならではの つよみ"
        hint="ほかの人と ちがうところ。有料会員に なるときに 必要です（あとから 書けます）"
      >
        <TextArea
          value={draft.strengths}
          onChange={(v) => set("strengths", v)}
          rows={3}
          max={200}
          placeholder="れい：職人の採用ページを 撮影から 1社で まとめて作れる"
        />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="ぎょうしゅ" required error={errors.industry}>
          <Select value={draft.industry} onChange={(v) => set("industry", v)} options={industryOptions} label="業種" />
        </Field>
        <Field label="ちいき" required hint="おもに活動しているところ" error={errors.region}>
          <Select value={draft.region} onChange={(v) => set("region", v)} options={regionOptions} label="地域" />
        </Field>
      </div>
      <Field label="しょくぎょう" required hint="れい：税理士、工務店経営、Web制作" error={errors.job}>
        <TextInput value={draft.job} onChange={(v) => set("job", v)} max={20} />
      </Field>
      <Field label="しょくぎょうアイコン" hint="写真が無いときは、これが あなたの顔になります">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {(Object.keys(jobIconLabel) as JobIconKey[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={draft.job_icon === key}
              onClick={() => set("job_icon", key)}
              className="c-choice flex flex-col items-center gap-1.5 px-1 py-2.5 text-[11px]"
            >
              <JobAvatar icon={key} name={jobIconLabel[key]} size="sm" />
              {jobIconLabel[key]}
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

function PhotoField({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(key: K, value: Draft[K]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [error, setError] = useState("");

  const onPick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("画像ファイルを選んでください");
    if (file.size > MAX_PHOTO_BYTES) return setError("10MB以下の画像を選んでください");
    setError("");
    setCropSrc(URL.createObjectURL(file));
  };

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    // 同じファイルをもう一度選んでも change が起きるように空にする
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      <JobAvatar icon={draft.job_icon} photoUrl={draft.photo_url} name="あなた" size="lg" />
      <div className="min-w-0">
        <p className="text-[15px]">
          しゃしん <span className="c-muted text-xs">任意</span>
        </p>
        <p className="c-muted text-xs">無くても しょくぎょうアイコンが出ます</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="c-button-sub h-10 text-sm">
            {draft.photo_url ? "かえる" : "しゃしんを選ぶ"}
          </button>
          {draft.photo_url && (
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(draft.photo_url!);
                set("photo_url", null);
              }}
              className="c-muted h-10 px-2 text-sm underline underline-offset-4"
            >
              はずす
            </button>
          )}
        </div>
        <p className="mt-1 min-h-[1rem] text-xs text-[#c62828]">{error}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <ImageCropDialog
        open={cropSrc !== null}
        src={cropSrc}
        onCancel={closeCrop}
        onConfirm={(blob) => {
          if (draft.photo_url) URL.revokeObjectURL(draft.photo_url);
          set("photo_url", URL.createObjectURL(blob));
          closeCrop();
        }}
      />
    </div>
  );
}

function WorkStep({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(key: K, value: Draft[K]) => void }) {
  const [word, setWord] = useState("");
  const [error, setError] = useState("");

  const addKeyword = () => {
    const w = word.trim();
    if (!w) return setError("キーワードを入れてから追加してください");
    if (w.length > 15) return setError("1つ15文字までです");
    if (draft.keywords.includes(w)) return setError("もう入っています");
    if (draft.keywords.length >= MAX_KEYWORDS) return setError(`キーワードは${MAX_KEYWORDS}つまでです`);
    set("keywords", [...draft.keywords, w]);
    setWord("");
    setError("");
  };

  return (
    <>
      <Field label="しごとの内容" hint="だれに、なにを しているか">
        <TextArea
          value={draft.bio}
          onChange={(v) => set("bio", v)}
          rows={4}
          max={400}
          placeholder="従業員10〜50名の会社のホームページと採用ページを作っています。"
        />
      </Field>
      <Field label="頼まれたら できること" hint="れい：ホームページ制作、更新の仕組みづくり">
        <TextArea value={draft.can_help_with} onChange={(v) => set("can_help_with", v)} rows={2} max={200} />
      </Field>
      <Field label="キーワード" hint={`名鑑で さがされるときの言葉。${MAX_KEYWORDS}つまで`}>
        <div className="flex gap-2">
          <input
            value={word}
            onChange={(e) => {
              setWord(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              // 日本語の変換を確定するEnterでは追加しない
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addKeyword();
              }
            }}
            placeholder="れい：採用ページ"
            aria-label="キーワード"
            className="c-input h-11"
          />
          <button type="button" onClick={addKeyword} className="c-button-sub h-11 shrink-0 text-sm">
            ついか
          </button>
        </div>
        <p className="mt-1 min-h-[1rem] text-xs text-[#c62828]">{error}</p>
        {draft.keywords.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {draft.keywords.map((k) => (
              <li key={k} className="c-chip inline-flex items-center gap-1 pr-1">
                {k}
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "keywords",
                      draft.keywords.filter((x) => x !== k),
                    )
                  }
                  aria-label={`${k}を外す`}
                  className="px-1 leading-none"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>
    </>
  );
}

function ContactStep({
  contact,
  setContact,
  errors,
}: {
  contact: ContactDraft;
  setContact: (c: ContactDraft) => void;
  errors: Record<string, string>;
}) {
  return (
    <>
      <p className="c-card border-dashed px-3 py-2.5 text-xs leading-relaxed">
        ※ ここに書いた れんらく先は、名鑑にもステータスにも出ません。ギルドマスターの しょうかいを
        あなたが承諾したとき、その相手にだけ見えます。
      </p>
      <Field label="メールアドレス" error={errors.email}>
        <TextInput
          type="email"
          value={contact.email}
          onChange={(v) => setContact({ ...contact, email: v })}
          placeholder="you@example.com"
          max={120}
        />
      </Field>
      <Field label="LINE の URL" error={errors.line_url}>
        <TextInput
          value={contact.line_url}
          onChange={(v) => setContact({ ...contact, line_url: v })}
          placeholder="https://line.me/..."
          max={200}
        />
      </Field>
      <Field label="Webサイト" error={errors.website_url}>
        <TextInput
          value={contact.website_url}
          onChange={(v) => setContact({ ...contact, website_url: v })}
          placeholder="https://example.com"
          max={200}
        />
      </Field>
    </>
  );
}

function VisibilityStep({
  draft,
  set,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  const toggle = (g: VisibleGroup) =>
    set(
      "visible_groups",
      draft.visible_groups.includes(g) ? draft.visible_groups.filter((x) => x !== g) : [...draft.visible_groups, g],
    );

  return (
    <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/20">
      <SwitchRow title="きほん" note="名前・写真・肩書・業種・地域" fixed="いつも公開" />
      {(Object.keys(groupLabel) as VisibleGroup[]).map((g) => (
        <SwitchRow
          key={g}
          title={groupLabel[g].title}
          note={groupLabel[g].note}
          on={draft.visible_groups.includes(g)}
          onToggle={() => toggle(g)}
        />
      ))}
      <SwitchRow
        title="しょうかいを受けつける"
        note="オフにすると、名鑑に「しょうかいは お休み中」と出ます"
        on={draft.accept_intro}
        onToggle={() => set("accept_intro", !draft.accept_intro)}
      />
    </ul>
  );
}

function ConfirmStep({
  draft,
  contact,
  onJump,
}: {
  draft: Draft;
  contact: ContactDraft;
  onJump: (s: StepKey) => void;
}) {
  const hasContact = contact.email || contact.line_url || contact.website_url;
  const rows: { step: StepKey; title: string; filled: boolean; visible: boolean | null }[] = [
    {
      step: "work",
      title: "しごと",
      filled: !!(draft.bio || draft.can_help_with || draft.keywords.length),
      visible: draft.visible_groups.includes("work"),
    },
    {
      step: "values",
      title: "おもい",
      filled: !!(draft.values_text || draft.vision || draft.social_issue),
      visible: draft.visible_groups.includes("values"),
    },
    {
      step: "connect",
      title: "つながり",
      filled: !!(draft.looking_for || draft.want_to_meet),
      visible: draft.visible_groups.includes("connect"),
    },
    { step: "contact", title: "れんらく先", filled: !!hasContact, visible: null },
  ];

  return (
    <>
      <div className="c-card flex items-center gap-3 p-4">
        <JobAvatar icon={draft.job_icon} photoUrl={draft.photo_url} name={draft.job} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-base tracking-wider">{draft.display_name}</span>
            <span className="c-muted text-xs">
              {draft.job}・{draft.region}
            </span>
          </p>
          <p className="mt-0.5 text-sm break-words">{draft.headline}</p>
          {draft.keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {draft.keywords.slice(0, 3).map((k) => (
                <span key={k} className="c-chip">
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/20">
        {rows.map((r) => (
          <li key={r.step} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="text-[15px]">{r.title}</p>
              <p className="c-muted text-xs">
                {r.filled ? "書きました" : "まだ書いていません"}
                {r.visible === null ? "・承諾した相手にだけ" : r.visible ? `・${guild.terms.member}に公開` : "・非公開"}
              </p>
            </div>
            <button type="button" onClick={() => onJump(r.step)} className="c-button-sub h-9 shrink-0 text-xs">
              {r.filled ? "なおす" : "書く"}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------------- 部品 ----------------
// Field・TextInput・TextArea・Select は form-parts.tsx（クエストを出す画面と共通）

function SwitchRow({
  title,
  note,
  on,
  onToggle,
  fixed,
}: {
  title: string;
  note: string;
  on?: boolean;
  onToggle?: () => void;
  fixed?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-[15px]">{title}</p>
        <p className="c-muted text-xs">{note}</p>
      </div>
      {fixed ? (
        <span className="c-muted shrink-0 text-xs">{fixed}</span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={title}
          onClick={onToggle}
          className="c-switch"
        />
      )}
    </li>
  );
}
