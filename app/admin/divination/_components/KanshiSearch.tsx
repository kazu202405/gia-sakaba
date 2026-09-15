"use client";

// 暦検索パネル — 任意の日付を入れて、年柱・月柱・日柱の干支と
// その日の陰陽五行的運勢を表示する。デフォルトは「今日」。
//
// 構成：
//   [干支3カラム]            ─ 素材データ。年柱・月柱・日柱の干支と五行。
//   [五行バランス]            ─ 6要素を五行カウントしバーで可視化。
//   [今日の気質（汎用・総合）] ─ 6要素全体のバランスから導く総合解釈。
//   [汎用 今年／今月／今日]   ─ 各柱（年・月・日）単独の汎用解釈。
//   [個別 今年／今月／今日]   ─ 任意。本人日干との通変による個別解釈。

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  getYearKanshi, getMonthKanshi, getDayKanshi,
} from "@/lib/divination/kanshi/calc";
import {
  KAN_TO_GOGYO, SHI_TO_GOGYO, GOGYO, GOGYO_COLORS,
  type Gogyo, type Jikkan,
} from "@/lib/divination/kanshi/constants";
import { calculateFortuneBalance } from "@/lib/divination/fortune/balance";
import {
  STRONG_GOGYO_DESC, ABSENT_GOGYO_DESC,
  OPPRESSED_DESC, DRAINED_DESC,
  STRONG_ABSENT_DESC, SPECIAL_DESC,
} from "@/lib/divination/fortune/descriptions";
import {
  calculatePillarFortune, calculatePersonalPillarFortune,
  type PillarFortune, type PersonalPillarFortune,
} from "@/lib/divination/fortune/timeframe";

interface Props {
  /** 任意。日付選択を結果鑑定の生年月日入力にコピーするためのコールバック。 */
  onPick?: (date: { year: number; month: number; day: number }) => void;
  /** 任意。鑑定対象の生年月日（個別運勢用）。指定があれば下段に「自分にとっての今日」を表示。 */
  subject?: { year: number; month: number; day: number; name?: string } | null;
}

export function KanshiSearch({ onPick, subject }: Props) {
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [day, setDay] = useState<number>(today.getDate());

  const pillars = useMemo(() => {
    const [yKan, yShi] = getYearKanshi(year, month, day);
    const [mKan, mShi] = getMonthKanshi(year, month, day, yKan);
    const [dKan, dShi] = getDayKanshi(year, month, day);
    return {
      year: { kan: yKan, shi: yShi },
      month: { kan: mKan, shi: mShi },
      day: { kan: dKan, shi: dShi },
    };
  }, [year, month, day]);

  const balance = useMemo(() => calculateFortuneBalance(pillars), [pillars]);

  // 汎用解釈（強い五行・不在の五行・特殊状態から導出）
  const generalDesc = useMemo(() => pickGeneralDescription(balance), [balance]);

  // 汎用：時間軸ごとの単独運勢（年柱／月柱／日柱）
  const pillarFortunes: PillarFortune[] = useMemo(() => [
    calculatePillarFortune("今年", pillars.year.kan, pillars.year.shi),
    calculatePillarFortune("今月", pillars.month.kan, pillars.month.shi),
    calculatePillarFortune("今日", pillars.day.kan, pillars.day.shi),
  ], [pillars]);

  // 本人日干（個別解釈の起点）
  const selfDayKan: Jikkan | null = useMemo(() => {
    if (!subject) return null;
    const [kan] = getDayKanshi(subject.year, subject.month, subject.day);
    return kan;
  }, [subject]);

  // 個別：時間軸ごとの本人 vs 各柱
  const personalPillars: PersonalPillarFortune[] | null = useMemo(() => {
    if (!selfDayKan) return null;
    return [
      calculatePersonalPillarFortune(selfDayKan, "今年", pillars.year.kan, pillars.year.shi),
      calculatePersonalPillarFortune(selfDayKan, "今月", pillars.month.kan, pillars.month.shi),
      calculatePersonalPillarFortune(selfDayKan, "今日", pillars.day.kan, pillars.day.shi),
    ];
  }, [selfDayKan, pillars]);

  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-[#c08a3e]" />
        <h2 className="text-[11px] tracking-[0.3em] text-[#c08a3e] font-semibold">
          KOYOMI / 暦検索
        </h2>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <SelectField label="年" value={year} options={YEAR_OPTIONS} onChange={setYear} width="w-24" suffix="年" />
        <SelectField label="月" value={month} options={MONTH_OPTIONS} onChange={setMonth} width="w-16" suffix="月" />
        <SelectField label="日" value={day} options={DAY_OPTIONS} onChange={setDay} width="w-16" suffix="日" />
        <button
          type="button"
          onClick={() => {
            const t = new Date();
            setYear(t.getFullYear());
            setMonth(t.getMonth() + 1);
            setDay(t.getDate());
          }}
          className="text-[12px] text-gray-600 underline-offset-2 hover:underline"
        >
          今日に戻す
        </button>
        {onPick && (
          <button
            type="button"
            onClick={() => onPick({ year, month, day })}
            className="ml-auto text-[12px] text-[#1c3550] border border-[#1c3550]/30 rounded px-3 py-1 hover:bg-[#1c3550]/5"
          >
            この日付を鑑定対象に
          </button>
        )}
      </div>

      {/* 干支3カラム（素材データ） */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <KanshiCell label="年柱" kan={pillars.year.kan} shi={pillars.year.shi} />
        <KanshiCell label="月柱" kan={pillars.month.kan} shi={pillars.month.shi} />
        <KanshiCell label="日柱" kan={pillars.day.kan} shi={pillars.day.shi} />
      </div>

      <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
        ※ 年柱は立春、月柱は節入り日で切り替わるため、暦上の月日と一致しないことがあります。
      </p>

      {/* ── 五行バランス＋解釈 ───────────────────── */}
      <div className="mt-6 pt-6 border-t border-gray-200 space-y-5">
        <div>
          <h3 className="text-[11px] tracking-[0.3em] text-[#c08a3e] font-semibold mb-3">
            FORTUNE / 五行バランス
          </h3>
          <GogyoBalanceBar counts={balance.counts} />
          <BalanceSummary balance={balance} />
        </div>

        {/* 汎用解釈 */}
        <div className="bg-[#fafbfc] border border-gray-200 rounded p-4 sm:p-5">
          <div className="text-[10px] tracking-[0.2em] text-gray-500 mb-1">
            {year}年{month}月{day}日 ／ この日の気質
          </div>
          <div className="font-serif text-lg sm:text-xl font-bold text-[#1c3550] mb-2">
            {generalDesc.headline}
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed mb-3">
            {generalDesc.body}
          </p>
          {generalDesc.advice && (
            <div className="text-[12px] text-[#1c3550] border-l-2 border-[#c08a3e] pl-3 leading-relaxed">
              <span className="font-semibold mr-1">行動ヒント：</span>
              {generalDesc.advice}
            </div>
          )}

          {/* 圧迫・消耗の注意（強い五行があるとき） */}
          {balance.strongestCount >= 2 && (balance.oppressed.length > 0 || balance.drained.length > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] text-gray-600">
              {balance.oppressed.map((g) => (
                <div key={`op-${g}`} className="flex items-start gap-1.5">
                  <span className="font-semibold whitespace-nowrap" style={{ color: GOGYO_COLORS[g].text }}>
                    {g}が圧迫：
                  </span>
                  <span>{OPPRESSED_DESC[g]}</span>
                </div>
              ))}
              {balance.drained.map((g) => (
                <div key={`dr-${g}`} className="flex items-start gap-1.5">
                  <span className="font-semibold whitespace-nowrap" style={{ color: GOGYO_COLORS[g].text }}>
                    {g}が消耗：
                  </span>
                  <span>{DRAINED_DESC[g]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 汎用：時間軸ごとの単独運勢（年柱・月柱・日柱） */}
        <div>
          <h4 className="text-[10px] tracking-[0.25em] text-gray-500 font-semibold mb-2">
            FORTUNE BY TIMEFRAME / 各時間軸の汎用運勢
          </h4>
          <div className="space-y-2">
            {pillarFortunes.map((f) => (
              <PillarFortuneCard key={f.label} fortune={f} />
            ))}
          </div>
        </div>

        {/* 個別：時間軸ごとの本人 vs 各柱（生年月日があるときのみ） */}
        {personalPillars && subject && (
          <div>
            <h4 className="text-[10px] tracking-[0.25em] text-[#1c3550] font-semibold mb-2">
              PERSONAL BY TIMEFRAME ／{" "}
              {subject.name ? `${subject.name} さん` : `${subject.year}/${subject.month}/${subject.day} 生まれ`}
              にとっての各時間軸
            </h4>
            <div className="space-y-2">
              {personalPillars.map((f) => (
                <PersonalPillarFortuneCard key={f.label} fortune={f} />
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
              ※ 本人の日干（{personalPillars[0].selfGogyo}）と各柱の天干との通変で判定。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// ── 解釈テキストの選択ロジック ──────────────────────────────
// 強い五行・不在の五行・偏りから「最もぴったり来る」雛形を1つ選ぶ。
// 優先順位：極端 → 均衡 → 強×不在の組合せ → 強い五行単独 → 不在の五行単独 → なだらか
function pickGeneralDescription(
  balance: ReturnType<typeof calculateFortuneBalance>,
): { headline: string; body: string; advice: string } {
  // 極端（一つの五行が4つ以上）
  if (balance.strongestCount >= 4) return { ...SPECIAL_DESC.veryStrong };

  // 完全均衡寄り：全五行登場 & 偏り小
  if (balance.absent.length === 0 && balance.evenness >= 70) {
    return { ...SPECIAL_DESC.balanced };
  }

  // 強い五行と不在の五行が両方ともユニーク（最も解釈しやすい構図）
  if (balance.strongest.length === 1 && balance.absent.length >= 1) {
    const strong = balance.strongest[0];
    // 不在が複数あるときは、強い五行と「最も対立する」もの（剋関係）を優先
    const absent = pickMostRelevantAbsent(strong, balance.absent);
    const key = `${strong}-${absent}`;
    if (STRONG_ABSENT_DESC[key]) {
      const strongDesc = STRONG_GOGYO_DESC[strong];
      return {
        headline: strongDesc.headline,
        body: STRONG_ABSENT_DESC[key],
        advice: strongDesc.advice,
      };
    }
  }

  // 強い五行が1つだけ立つ（不在に該当パターン無し or 不在なし）
  if (balance.strongest.length === 1 && balance.strongestCount >= 2) {
    return { ...STRONG_GOGYO_DESC[balance.strongest[0]] };
  }

  // 強い五行が複数（タイ）
  if (balance.strongest.length >= 2 && balance.strongestCount >= 2) {
    return { ...SPECIAL_DESC.tied };
  }

  // 不在の五行だけが目立つ（突出はないが穴がある）
  if (balance.absent.length >= 1) {
    return { ...ABSENT_GOGYO_DESC[balance.absent[0]] };
  }

  // 突出もなし、欠けもなし、均衡度も低い → なだらか
  return { ...SPECIAL_DESC.flat };
}

// 強い五行と「最も対立する」不在の五行を選ぶ。
// 1) 強の剋す対象が不在ならそれを最優先（STRONG_ABSENT_DESC の代表的な組合せ）
// 2) 強の親（消耗側）が不在ならそれ
// 3) 残りは absent の先頭
function pickMostRelevantAbsent(strong: Gogyo, absentList: Gogyo[]): Gogyo {
  const oppressed = (GOGYO as readonly Gogyo[]).find(
    (g) => g !== strong && relationKoku(strong, g),
  );
  if (oppressed && absentList.includes(oppressed)) return oppressed;
  const parent = (GOGYO as readonly Gogyo[]).find(
    (g) => relationSou(g, strong),
  );
  if (parent && absentList.includes(parent)) return parent;
  return absentList[0];
}

// 補助：A→B（A が B を剋す）
function relationKoku(a: Gogyo, b: Gogyo): boolean {
  // 相剋順：木→土→水→火→金→木
  const order: Gogyo[] = ["木", "土", "水", "火", "金"];
  const idx = order.indexOf(a);
  return order[(idx + 1) % 5] === b;
}

// 補助：A→B（A が B を生む）
function relationSou(a: Gogyo, b: Gogyo): boolean {
  const order: Gogyo[] = ["木", "火", "土", "金", "水"];
  const idx = order.indexOf(a);
  return order[(idx + 1) % 5] === b;
}

// ── 五行バランスバー（横並び・カウント比率） ──────────────
function GogyoBalanceBar({ counts }: { counts: Record<Gogyo, number> }) {
  const total = 6; // 年干＋年支＋月干＋月支＋日干＋日支 = 6
  return (
    <div className="space-y-1.5 mb-3">
      {(GOGYO as readonly Gogyo[]).map((g) => {
        const c = counts[g];
        const pct = (c / total) * 100;
        const color = GOGYO_COLORS[g];
        return (
          <div key={g} className="flex items-center gap-2">
            <div
              className="w-6 text-center font-serif font-bold text-sm shrink-0 rounded px-1 py-0.5"
              style={{ backgroundColor: color.bg, color: color.text }}
            >
              {g}
            </div>
            <div className="flex-1 bg-gray-100 rounded-sm h-4 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color.hex }}
              />
            </div>
            <div className="w-10 text-right text-[11px] text-gray-600 font-mono shrink-0">
              {c} / 6
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BalanceSummary({ balance }: { balance: ReturnType<typeof calculateFortuneBalance> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600 mb-1">
      <span>
        強い：
        {balance.strongestCount >= 2 ? (
          balance.strongest.map((g) => (
            <span
              key={g}
              className="inline-block ml-1 px-1.5 py-0.5 rounded font-semibold"
              style={{ backgroundColor: GOGYO_COLORS[g].bg, color: GOGYO_COLORS[g].text }}
            >
              {g}
            </span>
          ))
        ) : (
          <span className="ml-1 text-gray-400">突出なし</span>
        )}
      </span>
      <span>
        不在：
        {balance.absent.length > 0 ? (
          balance.absent.map((g) => (
            <span
              key={g}
              className="inline-block ml-1 px-1.5 py-0.5 rounded font-semibold border"
              style={{ borderColor: GOGYO_COLORS[g].hex, color: GOGYO_COLORS[g].text }}
            >
              {g}
            </span>
          ))
        ) : (
          <span className="ml-1 text-gray-400">なし（五行一巡）</span>
        )}
      </span>
      <span className="ml-auto">
        均衡度：
        <span className="font-mono font-semibold text-[#1c3550] ml-1">{balance.evenness}</span>
        <span className="text-gray-400 ml-0.5">/100</span>
      </span>
    </div>
  );
}

// 年月日プルダウンの選択肢。年は 1900〜2099 の 200 通り、月は 1〜12、日は 1〜31。
const YEAR_OPTIONS = Array.from({ length: 200 }, (_, i) => 1900 + i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

export function SelectField({
  label, value, options, onChange, width, suffix,
}: {
  label: string; value: number; options: number[];
  onChange: (v: number) => void; width: string; suffix?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.2em] text-gray-500 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${width} border border-gray-300 rounded px-2 py-1.5 text-sm font-mono bg-white focus:border-[#1c3550] focus:outline-none cursor-pointer`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}{suffix ?? ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export { YEAR_OPTIONS, MONTH_OPTIONS, DAY_OPTIONS };

function KanshiCell({ label, kan, shi }: { label: string; kan: string; shi: string }) {
  const kanG = KAN_TO_GOGYO[kan as keyof typeof KAN_TO_GOGYO];
  const shiG = SHI_TO_GOGYO[shi as keyof typeof SHI_TO_GOGYO];
  return (
    <div className="border border-gray-200 rounded p-3 bg-[#fafbfc] text-center">
      <div className="text-[10px] tracking-[0.2em] text-gray-500 mb-1">{label}</div>
      <div className="font-serif text-2xl font-bold text-[#1c3550] tracking-wide">
        {kan}{shi}
      </div>
      <div className="text-[11px] text-gray-500 mt-1">
        {kan}：{kanG} / {shi}：{shiG}
      </div>
    </div>
  );
}

// ── 汎用：1柱の運勢カード（年柱・月柱・日柱を縦に積む用） ───────
function PillarFortuneCard({ fortune }: { fortune: PillarFortune }) {
  const c = GOGYO_COLORS[fortune.dominant];
  return (
    <div className="border border-gray-200 rounded bg-white p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wider"
          style={{ backgroundColor: c.bg, color: c.text }}
        >
          {fortune.label}
        </span>
        <span className="font-mono text-[13px] text-[#1c3550] font-semibold">
          {fortune.kan}{fortune.shi}
        </span>
        <span className="text-[10px] text-gray-500">
          ({fortune.kanGogyo}／{fortune.shiGogyo}・{fortune.relation})
        </span>
      </div>
      <div className="font-serif text-[15px] sm:text-base font-bold text-[#1c3550] mb-1">
        {fortune.headline}
      </div>
      <p className="text-[12px] text-gray-700 leading-relaxed mb-2">
        {fortune.body}
      </p>
      <div className="text-[11px] text-[#1c3550] border-l-2 border-[#c08a3e] pl-2 leading-relaxed">
        <span className="font-semibold mr-1">行動ヒント：</span>
        {fortune.advice}
      </div>
    </div>
  );
}

// ── 個別：本人 vs 1柱の運勢カード ─────────────────────────
function PersonalPillarFortuneCard({ fortune }: { fortune: PersonalPillarFortune }) {
  const c = GOGYO_COLORS[fortune.selfGogyo];
  return (
    <div className="border border-[#1c3550]/20 rounded bg-[#1c3550]/5 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wider"
          style={{ backgroundColor: c.bg, color: c.text }}
        >
          {fortune.label}
        </span>
        <span className="text-[11px] text-[#1c3550] font-semibold">
          通変：{fortune.relation}
        </span>
        <span className="text-[10px] text-gray-500">
          (本人{fortune.selfGogyo} vs {fortune.pillarKanGogyo})
        </span>
      </div>
      <div className="font-serif text-[15px] sm:text-base font-bold text-[#1c3550] mb-1">
        {fortune.headline}
      </div>
      <p className="text-[12px] text-gray-700 leading-relaxed mb-2">
        {fortune.body}
      </p>
      <div className="text-[11px] text-[#1c3550] border-l-2 border-[#c08a3e] pl-2 leading-relaxed">
        <span className="font-semibold mr-1">行動ヒント：</span>
        {fortune.advice}
      </div>
    </div>
  );
}
