"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import {
  DIMENSIONS,
  INDUSTRIES,
  PRECHECKS,
  BUDGET_RANGES,
} from "@/lib/diagnosis/questions";
import {
  scoreDiagnosis,
  type Answers,
  type DiagnosisResult,
} from "@/lib/diagnosis/score";
import { DiagnosisReport } from "./DiagnosisReport";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FUNNEL_STEPS = DIMENSIONS.length; // 5
const TOTAL_STEPS = FUNNEL_STEPS + 1; // 6（前提チェックを最終ステップに）

// step 0 = イントロ, 1..5 = ファネル各項目, 6 = 前提チェック＋悩み, 送信で result へ
export function DiagnosisForm() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [budget, setBudget] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [worry, setWorry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const topRef = useRef<HTMLDivElement>(null);

  // 次へ／戻るで先頭に自動スクロール（毎回上にスクロールする手間をなくす）
  useEffect(() => {
    if (step > 0) {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  if (result) {
    return (
      <DiagnosisReport
        result={result}
        answers={answers}
        name={name}
        industry={industry}
        budget={budget}
        worry={worry}
        submissionId={submissionId}
        onRestart={() => {
          setResult(null);
          setSubmissionId(null);
          setStep(0);
          setAnswers({});
          setIndustry("");
          setBudget("");
          setName("");
          setEmail("");
          setCompany("");
          setWorry("");
        }}
      />
    );
  }

  const contactReady = name.trim().length > 0 && EMAIL_RE.test(email.trim());
  const emailInvalid = email.trim().length > 0 && !EMAIL_RE.test(email.trim());

  const select = (qid: string, points: number) =>
    setAnswers((a) => ({ ...a, [qid]: points }));

  const submit = async () => {
    setSubmitting(true);
    const res = scoreDiagnosis(answers);
    let id: string | null = null;
    try {
      const r = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          industry,
          budget,
          worry,
          answers,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        id = data.id ?? null;
      }
    } catch {
      // 保存に失敗しても結果は見せる
    }
    setSubmissionId(id);
    setResult(res);
    setSubmitting(false);
  };

  // ─── イントロ（名前・メール必須＋会社名・業種） ───
  if (step === 0) {
    return (
      <div ref={topRef} className="max-w-xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
            <span>DIAGNOSIS</span>
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
          </div>
          <h1 className="font-serif text-[26px] sm:text-[32px] font-bold text-[var(--gia-deck-navy)] tracking-[0.04em] leading-[1.4] mt-4">
            売上導線診断
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            集客 → 見込み客化 → 商談化 → 成約 → 継続・紹介。
            <br className="hidden sm:block" />
            あなたの売上導線の“どこを伸ばせば一番効くか”を採点し、
            <br className="hidden sm:block" />
            <strong className="text-[var(--gia-deck-navy)]">
              まず打つべき一手
            </strong>
            を明確にします。
          </p>
          <p className="text-[11px] text-[var(--gia-deck-sub)] mt-3">
            所要 約3分／無料／結果はその場で表示
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-[var(--gia-deck-line)] p-6 sm:p-8 shadow-[0_1px_2px_rgba(28,53,80,0.04)]">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--gia-deck-navy)] mb-1.5">
                お名前
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：山田 太郎"
                className="w-full rounded-xl border border-[var(--gia-deck-line)] px-4 py-3 text-sm text-[var(--gia-deck-ink)] focus:outline-none focus:border-[var(--gia-deck-navy)]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--gia-deck-navy)] mb-1.5">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="例：you@example.com"
                className="w-full rounded-xl border border-[var(--gia-deck-line)] px-4 py-3 text-sm text-[var(--gia-deck-ink)] focus:outline-none focus:border-[var(--gia-deck-navy)]/40"
              />
              <p className="text-[11px] text-[var(--gia-deck-sub)] mt-1.5">
                診断結果の控えと、個別アドバイスのお届けに使います。
              </p>
              {emailInvalid && (
                <p className="text-[11px] text-rose-600 mt-1">
                  メールアドレスの形式を確認してください（例：you@example.com）
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--gia-deck-navy)] mb-1.5">
                会社名
                <span className="text-[11px] font-normal text-[var(--gia-deck-sub)] ml-1">
                  （任意）
                </span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="例：株式会社○○"
                className="w-full rounded-xl border border-[var(--gia-deck-line)] px-4 py-3 text-sm text-[var(--gia-deck-ink)] focus:outline-none focus:border-[var(--gia-deck-navy)]/40"
              />
            </div>
          </div>

          <p className="text-sm font-semibold text-[var(--gia-deck-navy)] mb-3">
            業種・タイプ
            <span className="text-[11px] font-normal text-[var(--gia-deck-sub)] ml-1">
              （任意）
            </span>
          </p>
          <div className="flex flex-wrap gap-2 mb-7">
            {INDUSTRIES.map((label) => (
              <button
                key={label}
                onClick={() => setIndustry(label)}
                className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                  industry === label
                    ? "border-[var(--gia-deck-navy)] bg-[var(--gia-deck-navy)] text-white"
                    : "border-[var(--gia-deck-line)] text-[var(--gia-deck-ink)] hover:border-[var(--gia-deck-navy)]/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!contactReady}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold py-4 px-6 hover:bg-[var(--gia-deck-navy-deep)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            診断をはじめる
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const isPrecheckStep = step === TOTAL_STEPS;
  const progress = Math.round((step / TOTAL_STEPS) * 100);

  // ─── 前提チェック＋悩み（最終ステップ） ───
  if (isPrecheckStep) {
    return (
      <div ref={topRef} className="max-w-xl mx-auto">
        <StepProgress step={step} total={TOTAL_STEPS} progress={progress} />
        <div className="mb-6">
          <p className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em] uppercase">
            最後に ― 前提チェック
          </p>
          <h2 className="font-serif text-2xl font-bold text-[var(--gia-deck-navy)] tracking-[0.04em] mt-1">
            単価・体制
          </h2>
          <p className="text-[12px] text-[var(--gia-deck-sub)] mt-1.5">
            導線スコアとは別に、単価と「捌けているか」を見ます（任意）。
          </p>
        </div>

        <div className="space-y-5">
          {PRECHECKS.map((q, qi) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={qi}
              selected={answers[q.id]}
              onSelect={select}
            />
          ))}

          <div className="bg-white rounded-2xl border border-[var(--gia-deck-line)] p-5 sm:p-6 shadow-[0_1px_2px_rgba(28,53,80,0.04)]">
            <p className="text-sm font-semibold text-[var(--gia-deck-navy)] mb-1">
              これから良くしたいこと・実現したいことは？
              <span className="text-[11px] font-normal text-[var(--gia-deck-sub)] ml-1">
                （任意・AIがこれを踏まえてアドバイスします）
              </span>
            </p>
            <textarea
              value={worry}
              onChange={(e) => setWorry(e.target.value)}
              rows={2}
              placeholder="例：問い合わせを安定させて、紹介でも回るようにしたい"
              className="w-full mt-2 rounded-xl border border-[var(--gia-deck-line)] px-4 py-3 text-sm text-[var(--gia-deck-ink)] focus:outline-none focus:border-[var(--gia-deck-navy)]/40 resize-none"
            />
          </div>

          <div className="bg-white rounded-2xl border border-[var(--gia-deck-line)] p-5 sm:p-6 shadow-[0_1px_2px_rgba(28,53,80,0.04)]">
            <p className="text-sm font-semibold text-[var(--gia-deck-navy)]">
              売上アップに使える予算（月額）
              <span className="text-[11px] font-normal text-[var(--gia-deck-sub)] ml-1">
                （任意）
              </span>
            </p>
            <p className="text-[12px] text-[var(--gia-deck-sub)] mt-0.5 mb-3">
              予算に合った打ち手を提案するために使います。ざっくりでOKです。
            </p>
            <div className="mb-3">
              <ChipGroup
                options={BUDGET_RANGES}
                value={budget}
                onSelect={setBudget}
              />
            </div>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="または自由入力（例：月3万円くらい）"
              className="w-full rounded-xl border border-[var(--gia-deck-line)] px-4 py-2.5 text-sm text-[var(--gia-deck-ink)] focus:outline-none focus:border-[var(--gia-deck-navy)]/40"
            />
          </div>
        </div>

        <NavButtons
          onBack={() => setStep((s) => s - 1)}
          onNext={submit}
          nextLabel="結果を見る"
          nextDisabled={false}
          submitting={submitting}
        />
      </div>
    );
  }

  // ─── ファネル各項目 ───
  const dim = DIMENSIONS[step - 1];
  const allAnswered = dim.questions.every((q) => answers[q.id] !== undefined);

  return (
    <div ref={topRef} className="max-w-xl mx-auto">
      <StepProgress step={step} total={TOTAL_STEPS} progress={progress} />
      <div className="mb-6">
        <p className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em] uppercase">
          {dim.no} / {FUNNEL_STEPS} ― {dim.subtitle}
        </p>
        <h2 className="font-serif text-2xl font-bold text-[var(--gia-deck-navy)] tracking-[0.04em] mt-1">
          {dim.title}
        </h2>
      </div>

      <div className="space-y-5">
        {dim.questions.map((q, qi) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={qi}
            selected={answers[q.id]}
            onSelect={select}
          />
        ))}
      </div>

      <NavButtons
        onBack={() => setStep((s) => s - 1)}
        onNext={() => setStep((s) => s + 1)}
        nextLabel="次へ"
        nextDisabled={!allAnswered}
        submitting={false}
      />
    </div>
  );
}

// ─── 小コンポーネント ───
function StepProgress({
  step,
  total,
  progress,
}: {
  step: number;
  total: number;
  progress: number;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-[11px] text-[var(--gia-deck-sub)] mb-2">
        <span>
          ステップ {step} / {total}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--gia-deck-line)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--gia-deck-gold)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onSelect,
}: {
  options: readonly string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const sel = value === o;
        return (
          <button
            key={o}
            onClick={() => onSelect(sel ? "" : o)}
            className={`text-[13px] px-3.5 py-1.5 rounded-full border transition-colors ${
              sel
                ? "border-[var(--gia-deck-navy)] bg-[var(--gia-deck-navy)] text-white"
                : "border-[var(--gia-deck-line)] text-[var(--gia-deck-ink)] hover:border-[var(--gia-deck-navy)]/40"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function QuestionCard({
  q,
  index,
  selected,
  onSelect,
}: {
  q: { id: string; text: string; choices: { label: string; points: number }[] };
  index: number;
  selected: number | undefined;
  onSelect: (qid: string, points: number) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--gia-deck-line)] p-5 sm:p-6 shadow-[0_1px_2px_rgba(28,53,80,0.04)]">
      <p className="text-sm font-semibold text-[var(--gia-deck-navy)] mb-3.5">
        <span className="text-[var(--gia-deck-sub)] mr-1.5">Q{index + 1}.</span>
        {q.text}
      </p>
      <div className="grid gap-2">
        {q.choices.map((c) => {
          const isSel = selected === c.points;
          return (
            <button
              key={c.label}
              onClick={() => onSelect(q.id, c.points)}
              className={`flex items-center gap-2.5 text-left text-sm px-4 py-3 rounded-xl border transition-colors ${
                isSel
                  ? "border-[var(--gia-deck-navy)] bg-[var(--gia-deck-navy)]/[0.04] text-[var(--gia-deck-navy)] font-medium"
                  : "border-[var(--gia-deck-line)] text-[var(--gia-deck-ink)] hover:border-[var(--gia-deck-navy)]/40"
              }`}
            >
              <span
                className={`flex items-center justify-center w-4 h-4 rounded-full border flex-shrink-0 ${
                  isSel
                    ? "border-[var(--gia-deck-navy)] bg-[var(--gia-deck-navy)]"
                    : "border-[var(--gia-deck-line)]"
                }`}
              >
                {isSel && <Check className="w-3 h-3 text-white" />}
              </span>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  submitting,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled: boolean;
  submitting: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mt-7">
      <button
        onClick={onBack}
        disabled={submitting}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--gia-deck-sub)] hover:text-[var(--gia-deck-navy)] transition-colors px-3 py-2 disabled:opacity-40"
      >
        <ArrowLeft className="w-4 h-4" />
        戻る
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled || submitting}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold py-3.5 px-7 hover:bg-[var(--gia-deck-navy-deep)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            結果を作成中…
          </>
        ) : (
          <>
            {nextLabel}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
