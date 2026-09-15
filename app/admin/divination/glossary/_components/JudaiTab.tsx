"use client";

// 十大主星タブ。算命学の 10 主星を「5本能 × 陰陽」のグループに分けて表示。
// 各本能には対応する五行（木火土金水）があり、それぞれの色で統一する。
// 木=守備／火=伝達／土=引力／金=攻撃／水=習得 が算命学の標準対応。

import { JUDAI_DESCRIPTIONS, type Judai } from "@/lib/divination/sanmei/descriptions";
import { GOGYO_COLORS, type Gogyo } from "@/lib/divination/kanshi/constants";

interface HonnouGroup {
  name: string;
  gogyo: Gogyo;       // 対応する五行
  description: string;
  yang: Judai;        // 陽の主星
  yin: Judai;         // 陰の主星
}

// 5 本能 × 陰陽 = 10 主星。五行は伝統的な対応関係。
const HONNOU_GROUPS: HonnouGroup[] = [
  {
    name: "守備本能",
    gogyo: "木",
    description: "自分の領域や価値観を守り、ペースを大切にする本能",
    yang: "貫索星",
    yin:  "石門星",
  },
  {
    name: "伝達本能",
    gogyo: "火",
    description: "感じたこと・考えたことを表現して人に伝える本能",
    yang: "鳳閣星",
    yin:  "調舒星",
  },
  {
    name: "引力本能",
    gogyo: "土",
    description: "人や財を引き寄せ、関わりの中で生きる本能",
    yang: "禄存星",
    yin:  "司禄星",
  },
  {
    name: "攻撃本能",
    gogyo: "金",
    description: "目標に向かって進み、相手と関わる中で力を発揮する本能",
    yang: "車騎星",
    yin:  "牽牛星",
  },
  {
    name: "習得本能",
    gogyo: "水",
    description: "学び・知識・経験を取り込んで自分を更新する本能",
    yang: "龍高星",
    yin:  "玉堂星",
  },
];

export function JudaiTab() {
  return (
    <section className="space-y-5">
      <p className="text-[12px] text-gray-600 leading-relaxed">
        十大主星は算命学の中核で、その人の性格・才能・行動パターンを表します。
        5 つの本能（守備・伝達・引力・攻撃・習得）はそれぞれ五行（木火土金水）に対応し、
        各本能に陽性・陰性の星があって合計 10 種類。陽占の人体星図に並ぶのがこの主星です。
      </p>

      {HONNOU_GROUPS.map((g) => {
        const color = GOGYO_COLORS[g.gogyo];
        return (
          <div key={g.name}>
            <div className="flex items-baseline gap-3 mb-3 flex-wrap">
              {/* 五行マーク */}
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 font-serif text-base font-bold"
                style={{
                  borderColor: color.hex,
                  backgroundColor: color.bg,
                  color: color.text,
                }}
                aria-label={`五行：${g.gogyo}`}
              >
                {g.gogyo}
              </span>
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full border text-[12px] font-semibold"
                style={{
                  backgroundColor: color.bg,
                  borderColor: color.hex,
                  color: color.text,
                }}
              >
                {g.name}
              </span>
              <span className="text-[12px] text-gray-600">{g.description}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <JudaiCard
                star={g.yang} polarity="陽"
                color={color}
              />
              <JudaiCard
                star={g.yin} polarity="陰"
                color={color}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}

function JudaiCard({
  star, polarity, color,
}: {
  star: Judai;
  polarity: "陽" | "陰";
  color: { hex: string; bg: string; text: string };
}) {
  const info = JUDAI_DESCRIPTIONS[star];
  return (
    <div
      className="border rounded-lg overflow-hidden bg-white shadow-sm"
      style={{ borderColor: color.hex + "33" }}
    >
      {/* ── ヘッダー（五行カラーの淡背景）─────── */}
      <div
        className="px-4 py-3 border-b"
        style={{
          backgroundColor: color.bg + "80",
          borderBottomColor: color.hex + "22",
        }}
      >
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="font-serif text-xl font-bold leading-none"
              style={{ color: color.text }}
            >
              {star}
            </span>
            <span className="text-[10px] text-gray-500">{info.reading}</span>
          </div>
          <span
            className="text-[10px] tracking-[0.2em] font-semibold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "white", color: color.text }}
          >
            {polarity}性
          </span>
        </div>
        <div
          className="font-serif text-[13px] font-semibold"
          style={{ color: color.text }}
        >
          {info.subtitle}
        </div>
      </div>

      {/* ── 本能キーワードチップ ─────── */}
      <div className="px-4 pt-3">
        <span
          className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: color.bg, color: color.text }}
        >
          {info.keyword}
        </span>
      </div>

      {/* ── 性格説明 ─────── */}
      <div className="px-4 pt-2 pb-3">
        <p className="text-[12px] text-gray-700 leading-relaxed">{info.personality}</p>
      </div>

      {/* ── 特徴（箇条書き、色ドット付き）─────── */}
      <div className="px-4 pb-3">
        <SectionLabel color={color}>特徴</SectionLabel>
        <ul className="space-y-1 mt-1.5">
          {info.traits.map((t) => (
            <li
              key={t}
              className="flex items-start gap-2 text-[11px] text-gray-700 leading-relaxed"
            >
              <span
                className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color.hex }}
              />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── 強み・課題（横並び、色分け）─────── */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <div className="bg-[#eef4ef] border border-[#c5d3c8] rounded px-2 py-1.5">
          <div className="text-[9px] font-semibold tracking-[0.15em] text-[#3d6651] mb-0.5">
            強み
          </div>
          <div className="text-[11px] text-gray-700 leading-tight">{info.strength}</div>
        </div>
        <div className="bg-[#f9f1ef] border border-[#d8c4be] rounded px-2 py-1.5">
          <div className="text-[9px] font-semibold tracking-[0.15em] text-[#8a4538] mb-0.5">
            課題
          </div>
          <div className="text-[11px] text-gray-700 leading-tight">{info.weakness}</div>
        </div>
      </div>

      {/* ── 向く仕事（フッター）─────── */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <div className="text-[9px] font-semibold tracking-[0.15em] text-gray-500 mb-0.5">
          向く仕事
        </div>
        <div className="text-[11px] text-gray-700 leading-relaxed">
          {info.suitableWork}
        </div>
      </div>
    </div>
  );
}

/** 五行カラーのアクセントを左に置いた小見出し。 */
function SectionLabel({
  color, children,
}: {
  color: { hex: string; text: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2.5 h-px"
        style={{ backgroundColor: color.hex }}
        aria-hidden
      />
      <span
        className="text-[10px] font-semibold tracking-[0.15em]"
        style={{ color: color.text }}
      >
        {children}
      </span>
    </div>
  );
}
