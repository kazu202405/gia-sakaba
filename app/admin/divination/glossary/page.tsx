"use client";

// /admin/divination/glossary — 動物占い・算命学の用語解説辞典。
// 鑑定書を読む前後に用語の意味を確認したり、占術体系を勉強するための画面。
//
// タブ構成（縦長を避けて切り替え式）：
//   1. 60分類動物    sixty.ts の 60 エントリ
//   2. 12動物        twelve.ts のプロファイル
//   3. 十大主星      sanmei/descriptions.ts の JUDAI_DESCRIPTIONS
//   4. 十二大従星    DAIJUSEI_DESCRIPTIONS
//   5. 十二運星      JUNI_UNSEI_NAMES と 各体系へのマッピング
//   6. 十干          JIKKAN_CHARACTERS
//   7. 五行          GOGYO + 相生・相剋

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { EditorialHeader } from "../../_components/EditorialChrome";
import { SixtyTab } from "./_components/SixtyTab";
import { TwelveTab } from "./_components/TwelveTab";
import { JudaiTab } from "./_components/JudaiTab";
import { DaijuseiTab } from "./_components/DaijuseiTab";
import { JuniunseiTab } from "./_components/JuniunseiTab";
import { JikkanTab } from "./_components/JikkanTab";
import { GogyoTab } from "./_components/GogyoTab";

type TabKey = "judai" | "daijusei" | "juniunsei" | "jikkan" | "gogyo" | "sixty" | "twelve";

// 並び順：算命学側を基礎から（五行→十干→十二運→十二大従星→十大主星）と上っていき、
// 最後に動物占い側（60分類動物→12動物）へ降りていく流れ。
// …の予定だったが、ユーザー指示で「五行の後ろに60分類動物、その後ろに12動物」となり、
// 算命学パートは前半（主星系から）、動物占いは後半に集約。
const TABS: { key: TabKey; label: string; sub: string }[] = [
  { key: "judai",     label: "十大主星",     sub: "算命学・10種の本能" },
  { key: "daijusei",  label: "十二大従星",   sub: "算命学・12のエネルギー" },
  { key: "juniunsei", label: "十二運星",     sub: "人生サイクル 12段階" },
  { key: "jikkan",    label: "十干",         sub: "甲〜癸のキャラクター" },
  { key: "gogyo",     label: "五行",         sub: "木火土金水と相生相剋" },
  { key: "sixty",     label: "60分類動物",   sub: "甲子〜癸亥 60干支 × 動物" },
  { key: "twelve",    label: "12動物",       sub: "基本動物のプロファイル" },
];

export default function DivinationGlossaryPage() {
  const [active, setActive] = useState<TabKey>("judai");
  const current = TABS.find((t) => t.key === active)!;

  return (
    <div className="px-5 sm:px-8 py-6 sm:py-10 max-w-7xl mx-auto space-y-6">
      {/* 戻るリンク */}
      <Link
        href="/admin/divination"
        className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-[#1c3550]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        命式図解に戻る
      </Link>

      <EditorialHeader
        eyebrow="GIA / GLOSSARY"
        title="用語解説"
        description="動物占い・算命学の各体系を一覧で確認できます。鑑定書を読むときの辞書としてご活用ください。"
        right={
          <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.2em] text-gray-500">
            <BookOpen className="w-3.5 h-3.5 text-[#c08a3e]" />
            REFERENCE
          </span>
        }
      />

      {/* タブナビ */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map((t) => {
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                className={`relative inline-flex flex-col items-start px-4 py-2.5 text-left transition-colors ${
                  isActive ? "text-[#1c3550]" : "text-gray-500 hover:text-[#1c3550]"
                }`}
              >
                <span className="text-sm font-semibold whitespace-nowrap">{t.label}</span>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{t.sub}</span>
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#c08a3e]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 現在のタブのコンテンツ */}
      <div>
        {active === "sixty"     && <SixtyTab />}
        {active === "twelve"    && <TwelveTab />}
        {active === "judai"     && <JudaiTab />}
        {active === "daijusei"  && <DaijuseiTab />}
        {active === "juniunsei" && <JuniunseiTab />}
        {active === "jikkan"    && <JikkanTab />}
        {active === "gogyo"     && <GogyoTab />}
      </div>

      {/* 出典・注釈 */}
      <footer className="text-[11px] text-gray-400 leading-relaxed border-t border-gray-100 pt-4">
        {current.label}：{current.sub}。詳細は流派により異なる場合があります。
      </footer>
    </div>
  );
}
