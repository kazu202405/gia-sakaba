"use client";

// ダッシュボード上部の「右腕の完成度 X/7」メーター。
// Core OS 7セクションの記入有無を可視化し、空いているセクションへ誘導する。
// ゲーミフィケーションでなく「右腕の脳がどこまで出来ているか」の実利フレーム。
// 入力の動機づけ（[[project_ai_clone_onboarding_input_ux_todo]] の①）。
//
// デフォルトは表示。ヘッダーのトグルで隠せて、その状態は localStorage に保存する
// （埋め終えた人が毎回畳めるように）。

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, ArrowRight, CheckCircle2, ChevronDown } from "lucide-react";
import { SECTION_GUIDES, type SectionKey } from "../core-os/_components/sectionGuides";

export interface CoreOsSectionStatus {
  key: SectionKey;
  label: string;
  href: string;
  filled: boolean;
}

const STORAGE_KEY = "clone-coreos-meter-collapsed";

export function CoreOsMeter({
  sections,
}: {
  sections: CoreOsSectionStatus[];
}) {
  const total = sections.length;
  const filled = sections.filter((s) => s.filled).length;
  const empty = sections.filter((s) => !s.filled);
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  const done = filled === total;

  // 初期は表示（open）。マウント後に localStorage を読んで「畳む」が記憶されていれば閉じる。
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setOpen(false);
    } catch {
      /* localStorage 不可環境は表示のまま */
    }
  }, []);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        if (next) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* noop */
      }
      return next;
    });
  };

  return (
    <section className="rounded-lg border border-[#e6d3a3] bg-[#fbf7ee] px-5 py-4">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <Brain className="h-4 w-4 flex-shrink-0 text-[#a9772b]" />
        <h2 className="font-serif text-sm tracking-[0.16em] text-[#1c3550]">
          右腕の完成度
        </h2>
        <span className="ml-auto text-sm font-bold tabular-nums text-[#1c3550]">
          {filled} <span className="text-gray-400">/ {total}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-[#a9772b] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          {/* プログレスバー */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#ecdcb4]">
            <div
              className="h-full rounded-full bg-[#2c8a78] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          {done ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#2c8a78]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Core OS は一通り揃っています。判断の土台ができました。
            </p>
          ) : (
            <>
              <p className="mt-3 text-[12px] leading-relaxed text-gray-600">
                埋めるほど、右腕AIの判断があなたらしくなります。空いているところから足していきましょう。
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {empty.map((s) => {
                  const payoff = SECTION_GUIDES[s.key]?.payoff ?? "";
                  return (
                    <li key={s.key}>
                      <Link
                        href={s.href}
                        className="group flex items-start gap-2 rounded-md border border-[#ecdcb4] bg-white px-3 py-2 transition-colors hover:border-[#d8c08a] hover:bg-[#fefcf6]"
                      >
                        <span className="mt-0.5 text-[12px] font-bold text-[#1c3550]">
                          {s.label}
                        </span>
                        {payoff && (
                          <span className="hidden flex-1 text-[11px] leading-relaxed text-gray-500 sm:block">
                            {payoff}
                          </span>
                        )}
                        <ArrowRight className="ml-auto mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#a9772b] transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
