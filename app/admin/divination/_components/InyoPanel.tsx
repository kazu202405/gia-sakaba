"use client";

// 陰占（命式）パネル。
// 鑑定書左半分：命式テーブル / 日干説明 / 五行バランス / 天中殺 を表示。
// 命式テーブルはユーザー提供サンプル画像に寄せたフォーマル仕上げ：
//   - 上部に Navy 帯のタイトル「陰占（生まれ持った設計図・内面）」
//   - 行ラベル列 + 4 柱（時柱は入力時のみ）の格子
//   - 各文字は五行カラーで大きく表示、右脇に読み（きのえ）と「木陽」属性
//   - 蔵干は主気＋中気＋余気を横並びで表示

import type { InyoResult, InyoPillar, ZoukanEntry } from "@/lib/divination/sanmei/inyo";
import { JIKKAN_CHARACTERS, JUNISHI_KEYWORDS } from "@/lib/divination/sanmei/descriptions";
import {
  GOGYO, GOGYO_COLORS,
  getKanReading, getShiReading,
  type Gogyo, type Jikkan, type Junishi,
} from "@/lib/divination/kanshi/constants";
import { getAnimalByKanshi } from "@/lib/divination/animal/sixty";

interface Props {
  inyo: InyoResult;
}

export function InyoPanel({ inyo }: Props) {
  const char = JIKKAN_CHARACTERS[inyo.dayKan];

  return (
    <section className="bg-white border border-gray-200 rounded-md overflow-hidden">
      {/* タイトル帯 — Navy 一面、Editorial 格式 */}
      <header className="bg-[#1c3550] text-white px-5 py-3 flex items-baseline gap-3">
        <span className="text-[10px] tracking-[0.3em] text-[#e8c98a]">INYO</span>
        <h2 className="font-serif text-base sm:text-lg font-bold tracking-[0.08em]">
          陰占（生まれ持った設計図・内面）
        </h2>
      </header>

      <div className="p-5 sm:p-6">
        {/* 命式テーブル */}
        <MeishikiTable pillars={inyo.pillars} />

        {/* 五行バランス */}
        <div className="mb-5">
          <h3 className="text-[11px] tracking-[0.2em] text-gray-500 mb-2">五行のバランス</h3>
          <div className="space-y-1.5">
            {GOGYO.map((g) => (
              <GogyoBar key={g} gogyo={g}
                count={inyo.gogyo.counts[g]}
                percent={inyo.gogyo.percentages[g]} />
            ))}
          </div>
          {inyo.gogyo.flow.length > 0 && (
            <p className="text-[12px] text-gray-600 mt-3">
              <span className="text-gray-400 mr-1">五行の流れ：</span>
              {inyo.gogyo.flow.join(" → ")}
            </p>
          )}
          {(inyo.gogyo.strong.length > 0 || inyo.gogyo.weak.length > 0) && (
            <p className="text-[12px] text-gray-600 mt-1">
              {inyo.gogyo.strong.length > 0 && (
                <span className="mr-3">
                  <span className="text-gray-400 mr-1">強い：</span>{inyo.gogyo.strong.join("・")}
                </span>
              )}
              {inyo.gogyo.weak.length > 0 && (
                <span className="print-hide">
                  <span className="text-gray-400 mr-1">欠：</span>{inyo.gogyo.weak.join("・")}
                </span>
              )}
            </p>
          )}
        </div>

        {/* 陰占から見える性質 / print-hide: 人渡し用PNGでは非表示 */}
        <div className="print-hide grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {inyo.pillars.slice(0, 3).map((p) => (
            <PillarTraitCard key={p.label}
              label={p.label}
              kan={p.kan}
              shi={p.shi}
              kanGogyo={p.kanGogyo}
              kanKeyword={JIKKAN_CHARACTERS[p.kan]?.description ?? ""}
              shiKeyword={JUNISHI_KEYWORDS[p.shi] ?? ""}
            />
          ))}
        </div>

        {/* 天中殺 / print-hide: 人渡し用PNGでは非表示 */}
        <div className="print-hide rounded bg-[#f6e3e3] border border-[#d8c4be] px-4 py-3">
          <div className="text-[11px] tracking-[0.2em] text-[#8a4538] mb-1">天中殺</div>
          <div className="font-serif text-base font-bold text-[#8a4538]">
            {inyo.tenchuuSatsu[0]}・{inyo.tenchuuSatsu[1]}
          </div>
          <p className="text-[12px] text-gray-700 mt-1 leading-relaxed">
            精神世界が活性化する時期。新しい始まりよりも、内省と準備に適しています。
          </p>
        </div>
      </div>
    </section>
  );
}

// ── 命式テーブル ──────────────────────────────────────────
// サンプル画像準拠：
//   - 列ヘッダー（年柱／月柱／日柱／時柱）は薄グレー帯
//   - 行ラベル列も薄グレー
//   - 各文字は五行カラー大文字、右脇に読み（きのえ）と「木陽」の2行ミニ表記
//   - 蔵干セルは主気＋中気＋余気を横並びで（各セルが独立した色付き）

function MeishikiTable({ pillars }: { pillars: InyoPillar[] }) {
  return (
    <div className="-mx-1">
      <table className="w-full text-sm border-collapse" style={{ tableLayout: "fixed" }}>
        <thead>
          <tr className="bg-[#f1f4f7]">
            <th className="w-10 sm:w-16 border border-gray-200 py-2 px-1 sm:px-2" aria-hidden />
            {pillars.map((p) => (
              <th
                key={p.label}
                className="border border-gray-200 py-2 px-1 sm:px-2 text-center text-[11px] sm:text-[12px] font-semibold text-[#1c3550] tracking-wide"
              >
                {p.label}{p.label === "時柱" ? "（推定）" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <TableRow label="天干">
            {pillars.map((p) => (
              <CharCell key={p.label}>
                <BigChar char={p.kan} gogyo={p.kanGogyo}
                  reading={getKanReading(p.kan)}
                  attr={`${p.kanGogyo}${p.kanInyo}`} />
              </CharCell>
            ))}
          </TableRow>

          <TableRow label="地支">
            {pillars.map((p) => (
              <CharCell key={p.label}>
                <BigChar char={p.shi} gogyo={p.shiGogyo}
                  reading={getShiReading(p.shi)}
                  attr={`${p.shiGogyo}${p.shiInyo}`} />
              </CharCell>
            ))}
          </TableRow>

          <TableRow label="蔵干">
            {pillars.map((p) => (
              <CharCell key={p.label}>
                <div className="flex justify-center items-start gap-1 sm:gap-2 flex-wrap">
                  {p.zoukanList.map((z, i) => (
                    <MidChar key={i}
                      char={z.kan}
                      gogyo={z.gogyo}
                      attr={`${z.gogyo}${z.inyo}`}
                    />
                  ))}
                </div>
              </CharCell>
            ))}
          </TableRow>

          <TableRow label="通変星" rowClassName="print-hide">
            {pillars.map((p) => (
              <td key={p.label}
                className="border border-gray-200 text-center py-2 px-1 sm:px-2 align-middle">
                <span className="font-serif text-[12px] sm:text-[15px] font-bold text-[#1c3550]">{p.tsuhensei}</span>
              </td>
            ))}
          </TableRow>

          <TableRow label="十二運星" rowClassName="print-hide">
            {pillars.map((p) => (
              <td key={p.label}
                className="border border-gray-200 text-center py-2 px-1 sm:px-2 align-middle">
                <span className="font-serif text-[12px] sm:text-[15px] font-bold text-gray-700">{p.juniUnsei}</span>
              </td>
            ))}
          </TableRow>
        </tbody>
      </table>
    </div>
  );
}

function TableRow({
  label, children, rowClassName,
}: { label: string; children: React.ReactNode; rowClassName?: string }) {
  return (
    <tr className={rowClassName}>
      <th className="bg-[#fafbfc] border border-gray-200 text-[10px] sm:text-[11px] tracking-[0.1em] sm:tracking-[0.15em] text-gray-600 font-normal py-2 px-1 sm:px-2 text-center">
        {label}
      </th>
      {children}
    </tr>
  );
}

function CharCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="border border-gray-200 py-2 px-1 sm:px-2 align-middle">
      {children}
    </td>
  );
}

/** 大きな漢字＋脇に小さく読みと属性。モバイルは縦積み、sm以上は横並び。
 *  print-hide: 読み仮名 / 五行属性 は人渡し用PNGでは非表示。 */
function BigChar({
  char, gogyo, reading, attr,
}: { char: Jikkan | Junishi; gogyo: Gogyo; reading: string; attr: string }) {
  const color = GOGYO_COLORS[gogyo];
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-1">
      <span className="font-serif text-[26px] sm:text-[40px] font-bold leading-none"
        style={{ color: color.text }}>
        {char}
      </span>
      <span className="print-hide flex flex-col items-center sm:items-start leading-tight text-[8px] sm:text-[9px] text-gray-500 mt-0.5 sm:mt-0">
        <span>{reading}</span>
        <span style={{ color: color.text }}>{attr}</span>
      </span>
    </div>
  );
}

/** 中サイズの漢字＋下に小さく属性（蔵干用、複数並び）。
 *  print-hide: 属性表記は人渡し用PNGでは非表示。 */
function MidChar({
  char, gogyo, attr,
}: { char: Jikkan; gogyo: Gogyo; attr: string }) {
  const color = GOGYO_COLORS[gogyo];
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className="font-serif text-[16px] sm:text-[24px] font-bold leading-none"
        style={{ color: color.text }}>
        {char}
      </span>
      <span className="print-hide text-[8px] sm:text-[9px] leading-tight mt-0.5" style={{ color: color.text }}>
        {attr}
      </span>
    </div>
  );
}

// ── 下部セクションの共通パーツ ─────────────────────────────

function GogyoBar({ gogyo, count, percent }: { gogyo: Gogyo; count: number; percent: number }) {
  const color = GOGYO_COLORS[gogyo];
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 text-[12px] font-serif font-bold" style={{ color: color.text }}>{gogyo}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-sm overflow-hidden">
        <div className="h-full rounded-sm transition-all"
          style={{ width: `${percent}%`, backgroundColor: color.hex }} />
      </div>
      <span className="text-[11px] text-gray-600 font-mono w-16 text-right">
        {count}（{percent}%）
      </span>
    </div>
  );
}

function PillarTraitCard({
  label, kan, shi, kanGogyo, kanKeyword, shiKeyword,
}: {
  label: string; kan: Jikkan; shi: Junishi; kanGogyo: Gogyo;
  kanKeyword: string; shiKeyword: string;
}) {
  const color = GOGYO_COLORS[kanGogyo];
  const animal = getAnimalByKanshi(kan, shi);
  return (
    <div className="border border-gray-200 rounded p-3">
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[10px] tracking-[0.2em] text-gray-500">{label}</span>
        <span className="font-serif text-sm font-bold" style={{ color: color.text }}>{kan}{shi}</span>
      </div>
      <p className="text-[12px] text-gray-700 leading-relaxed">{kanKeyword}</p>
      <p className="text-[11px] text-gray-500 mt-1.5">地支：{shiKeyword}</p>
      {animal && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-gray-400">No.{animal.number}</span>
          <span className="text-[12px] font-bold text-[#1c3550]">{animal.name}</span>
        </div>
      )}
    </div>
  );
}
