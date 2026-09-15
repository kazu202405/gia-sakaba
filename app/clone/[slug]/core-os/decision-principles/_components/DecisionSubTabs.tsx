"use client";

// 判断基準ページ内のサブタブ（原則 / 事例）。
// CoreOsNav の下に並び、URL ?view= で切り替える。

import Link from "next/link";
import { BookOpen, ScrollText } from "lucide-react";

interface Props {
  slug: string;
  view: "principle" | "case";
  principleCount: number;
  caseCount: number;
}

export function DecisionSubTabs({
  slug, view, principleCount, caseCount,
}: Props) {
  const base = `/clone/${slug}/core-os/decision-principles`;
  const tabs = [
    {
      key: "principle",
      href: base,
      label: "原則",
      desc: "あなたっぽい判断の核",
      count: principleCount,
      icon: BookOpen,
    },
    {
      key: "case",
      href: `${base}?view=case`,
      label: "事例ログ",
      desc: "原則を磨くための素材",
      count: caseCount,
      icon: ScrollText,
    },
  ] as const;

  return (
    <div className="flex gap-2 -mt-2">
      {tabs.map((t) => {
        const active = view === t.key;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-md border transition-colors ${
              active
                ? "bg-[#1c3550] border-[#1c3550] text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <t.icon className={`w-4 h-4 ${active ? "text-[#e8c98a]" : "text-gray-400"}`} />
            <div className="text-left">
              <div className="text-[12px] font-bold tracking-[0.04em]">
                {t.label}
                <span className={`ml-1.5 tabular-nums text-[11px] ${active ? "text-[#e8c98a]" : "text-gray-400"}`}>
                  {t.count}
                </span>
              </div>
              <div className={`text-[10px] tracking-[0.04em] ${active ? "text-white/70" : "text-gray-400"}`}>
                {t.desc}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
