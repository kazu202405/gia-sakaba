"use client";

// 算命学以外の占術パネル群：タロット誕生日カード / 数秘術 / 誕生日カラー。
// 鑑定書としては「補助情報」レイヤー。1 ファイルにまとめてある。

import type { TarotBirthdayResult } from "@/lib/divination/tarot/birthday";
import type { NumerologyResult } from "@/lib/divination/numerology/birthday";
import type { BirthdayColorResult } from "@/lib/divination/color/birthday";

// ── タロット誕生日カード ─────────────────────────────────

export function TarotPanel({ tarot }: { tarot: TarotBirthdayResult }) {
  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6">
      <SectionHeader
        eyebrow="TAROT / タロット誕生日カード"
        title={`大アルカナ 22 枚から ${tarot.targetYear} 年の流れまで`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardBox label="パーソナリティカード"
          number={tarot.personalityCard.number}
          name={tarot.personalityCard.name}
          keyword={tarot.personalityCard.keyword}
          meaning={tarot.personalityCard.meaning}
          tone="primary" />
        <CardBox label="ソウルカード"
          number={tarot.soulCard.number}
          name={tarot.soulCard.name}
          keyword={tarot.soulCard.keyword}
          meaning={tarot.soulCard.meaning}
          tone="soul" />
        <CardBox label={`イヤーカード（${tarot.targetYear}）`}
          number={tarot.yearCard.number}
          name={tarot.yearCard.name}
          keyword={tarot.yearCard.keyword}
          meaning={tarot.yearCard.meaning}
          tone="year" />
      </div>
    </section>
  );
}

function CardBox({
  label, number, name, keyword, meaning, tone,
}: {
  label: string; number: number; name: string;
  keyword: string; meaning: string;
  tone: "primary" | "soul" | "year";
}) {
  const styles = {
    primary: "border-[#1c3550]/30 bg-[#f1f4f7]",
    soul:    "border-[#c08a3e]/30 bg-[#fbf3e3]",
    year:    "border-[#e6d3a3] bg-white",
  }[tone];
  return (
    <div className={`border rounded p-3 ${styles}`}>
      <div className="text-[10px] tracking-[0.2em] text-gray-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="font-mono text-xs text-gray-400">No.{number}</span>
        <span className="font-serif text-lg font-bold text-[#1c3550]">{name}</span>
      </div>
      <p className="text-[11px] text-gray-500 mb-1">{keyword}</p>
      <p className="text-[12px] text-gray-700 leading-relaxed">{meaning}</p>
    </div>
  );
}

// ── 数秘術 ───────────────────────────────────────────

export function NumerologyPanel({ num }: { num: NumerologyResult }) {
  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6">
      <SectionHeader
        eyebrow="NUMEROLOGY / 数秘術"
        title="ライフパス・バースデー・パーソナルイヤー"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <NumBox label="ライフパスナンバー" value={num.lifePathNumber} caption={num.isMasterNumber ? "マスター" : "人生のテーマ"} />
        <NumBox label="バースデーナンバー" value={num.birthdayNumber} caption="生まれ持った才能" />
        <NumBox label={`パーソナルイヤー（${num.personalYearTarget}）`} value={num.personalYear} caption="今年のテーマ" />
      </div>

      <p className="text-[12px] text-gray-700 leading-relaxed mb-4">
        <span className="font-serif font-bold text-[#1c3550] mr-2">{num.lifePathNumber}</span>
        {num.lifePathMeaning}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <h4 className="text-[11px] tracking-[0.2em] text-gray-500 mb-1.5">ピナクル（人生の4つの頂点期）</h4>
          <ul className="space-y-1 text-[12px] text-gray-700">
            {num.pinnacleNumbers.map((p, i) => (
              <li key={i}>
                <span className="text-gray-500 mr-2">{p.period}</span>
                <span className="font-serif font-bold text-[#1c3550]">{p.number}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-[11px] tracking-[0.2em] text-gray-500 mb-1.5">チャレンジナンバー</h4>
          <div className="flex gap-3 text-[12px] text-gray-700">
            {num.challengeNumbers.map((c, i) => (
              <div key={i} className="text-center">
                <div className="font-serif text-xl font-bold text-[#1c3550]">{c}</div>
                <div className="text-[10px] text-gray-500">第{i + 1}期</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NumBox({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <div className="border border-gray-200 rounded p-3 text-center">
      <div className="text-[10px] tracking-[0.2em] text-gray-500 mb-1">{label}</div>
      <div className="font-serif text-3xl font-bold text-[#1c3550] leading-none">{value}</div>
      <div className="text-[11px] text-gray-500 mt-1">{caption}</div>
    </div>
  );
}

// ── 誕生日カラー ─────────────────────────────────────

export function ColorPanel({ color }: { color: BirthdayColorResult }) {
  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6">
      <SectionHeader
        eyebrow="COLOR / 誕生日カラー"
        title="誕生月 × 数秘 × 星座 のパーソナルカラー"
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ColorBox label="誕生月カラー"
          name={color.monthColor.name} hex={color.monthColor.hex}
          meaning={color.monthColor.meaning} />
        <ColorBox label={`数秘カラー（LP${color.numerologyColor.lifePathNumber}）`}
          name={color.numerologyColor.name} hex={color.numerologyColor.hex}
          meaning={`${color.numerologyColor.chakra} / ${color.numerologyColor.meaning}`} />
        <ColorBox label={`星座カラー（${color.zodiacColor.zodiac}）`}
          name={color.zodiacColor.name} hex={color.zodiacColor.hex}
          meaning={color.zodiacColor.meaning} />
      </div>
    </section>
  );
}

function ColorBox({ label, name, hex, meaning }: { label: string; name: string; hex: string; meaning: string }) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <div className="text-[10px] tracking-[0.2em] text-gray-500 mb-2">{label}</div>
      <div className="flex items-center gap-3 mb-2">
        <span
          className="inline-block w-10 h-10 rounded border border-gray-200"
          style={{ backgroundColor: hex }}
          aria-hidden
        />
        <div>
          <div className="font-serif text-sm font-bold text-[#1c3550]">{name}</div>
          <div className="text-[10px] text-gray-400 font-mono">{hex}</div>
        </div>
      </div>
      <p className="text-[12px] text-gray-700 leading-relaxed">{meaning}</p>
    </div>
  );
}

// ── 共通 ──────────────────────────────────────────────

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <span className="text-[11px] tracking-[0.3em] text-[#c08a3e] font-semibold">{eyebrow}</span>
      <h2 className="font-serif text-lg font-bold text-[#1c3550] mt-1">{title}</h2>
    </div>
  );
}
