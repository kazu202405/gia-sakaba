"use client";

// 登録直後の着地オンボ：右腕AIを使い始める最初の3ステップ。
//   ① LINE/Slack 連携 ② 最初の考え(Core OS)を入れる ③ 最初の1人を記録
// 3つ全部できたらサーバー側で非表示（onboardingDone で出し分け）。
// 途中でも右上「×」で畳める（localStorage 記憶）。Webだけで使う人を縛らないため。
// CoreOsMeter（考えの充足度 X/7）とは役割が別：こちらは「最初の一歩」、あちらは「育て続ける」。

import { useEffect, useState } from "react";
import Link from "next/link";
import { Rocket, CheckCircle2, Circle, ArrowRight, X } from "lucide-react";

export interface OnboardingStep {
  key: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

const STORAGE_KEY = "clone-onboarding-dismissed";

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;

  // 初期は表示。マウント後に localStorage を読んで「閉じる」が記憶されていれば隠す。
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setDismissed(true);
    } catch {
      /* localStorage 不可環境は表示のまま */
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
  };

  return (
    <section className="rounded-lg border border-[#bcd0cb] bg-[#eef5f2] px-5 py-4">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4 flex-shrink-0 text-[#2c8a78]" />
        <h2 className="font-serif text-sm tracking-[0.16em] text-[#1c3550]">
          右腕AIをはじめる
        </h2>
        <span className="ml-auto text-sm font-bold tabular-nums text-[#1c3550]">
          {doneCount} <span className="text-gray-400">/ {total}</span>
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="このガイドを閉じる"
          className="ml-1 flex-shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:bg-white/60 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-gray-600">
        この3つが終わると、右腕AIがあなたの代わりに覚えて、動きはじめます。
      </p>

      <ol className="mt-3 space-y-1.5">
        {steps.map((s, i) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={`group flex items-start gap-2.5 rounded-md border px-3 py-2.5 transition-colors ${
                s.done
                  ? "border-[#cfe0da] bg-white/50"
                  : "border-[#cfe0da] bg-white hover:border-[#a9ccc2] hover:bg-[#fbfdfc]"
              }`}
            >
              {s.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2c8a78]" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#9bbab1]" />
              )}
              <span className="flex min-w-0 flex-col">
                <span
                  className={`text-[13px] font-bold ${
                    s.done
                      ? "text-gray-400 line-through"
                      : "text-[#1c3550]"
                  }`}
                >
                  {i + 1}. {s.label}
                </span>
                <span className="text-[11px] leading-relaxed text-gray-500">
                  {s.hint}
                </span>
              </span>
              {!s.done && (
                <ArrowRight className="ml-auto mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#2c8a78] transition-transform group-hover:translate-x-0.5" />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
