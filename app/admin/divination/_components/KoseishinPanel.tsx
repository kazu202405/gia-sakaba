"use client";

// 動物占い 5アニマルパネル。
//   - 本質：12 動物名＋60分類の修飾子付き動物名（深掘り）
//   - 意思決定／表面／隠れ：12 動物名のみ
//   - 希望：弦本流の正式アルゴリズム調整中のため placeholder 表示
// 計算ロジック詳細：memory/reference_animal_divination_logic.md

import type { KoseishinCharacter } from "@/lib/divination/animal/koseishin";
import { ROLE_DESCRIPTIONS } from "@/lib/divination/animal/koseishin";
import { GROUP_STYLES } from "@/lib/divination/animal/twelve";

interface Props {
  characters: KoseishinCharacter[];
}

// 役割ごとのカード色（5キャラ別）。グループ色とは別系統。
const ROLE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  本質:     { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]" },
  意思決定: { bg: "bg-[#e1ebf5]", border: "border-[#cdd6e0]", text: "text-[#1c4a7a]" },
  表面:     { bg: "bg-[#f1f4f7]", border: "border-[#d6dde5]", text: "text-[#1c3550]" },
  隠れ:     { bg: "bg-[#f3e9e6]", border: "border-[#d8c4be]", text: "text-[#8a4538]" },
  希望:     { bg: "bg-[#e6f1e8]", border: "border-[#c5d3c8]", text: "text-[#3d6651]" },
};

export function KoseishinPanel({ characters }: Props) {
  return (
    <section className="bg-white border border-gray-200 rounded-md overflow-hidden">
      {/* タイトル帯 — InyoPanel と揃えた Navy */}
      <header className="bg-[#1c3550] text-white px-5 py-3 flex items-baseline gap-3">
        <h2 className="font-serif text-base sm:text-lg font-bold tracking-[0.08em]">
          動物占い 5アニマル
        </h2>
        <span className="text-[10px] tracking-[0.2em] text-[#e8c98a]/80 ml-auto">
          月 / 地球 / 太陽 の3グループ
        </span>
      </header>

      <div className="p-5 sm:p-6">
        <p className="text-[12px] text-gray-600 mb-4 leading-relaxed">
          動物占いの 5 アニマル。本質のみ 60 分類で深掘りし、それ以外は基本 12 動物で表示します。
          各キャラは日柱・月柱・年柱の十二運から算出（希望キャラは弦本流の正式式を調整中）。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {characters.map((c) => (
            <CharacterCard key={c.role} character={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CharacterCard({ character }: { character: KoseishinCharacter }) {
  const style = ROLE_STYLES[character.role];

  if (character.unresolved) {
    return (
      <div className="border border-dashed border-gray-300 rounded p-3 bg-gray-50">
        <div className="text-[11px] font-semibold mb-2 text-gray-400">
          {character.role}
        </div>
        <div className="font-serif text-sm font-bold text-gray-400 mb-2 leading-tight">
          調整中
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          {ROLE_DESCRIPTIONS[character.role]}
        </p>
        <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
          正式アルゴリズムを調整中です。
        </p>
      </div>
    );
  }

  return (
    <div className={`border rounded p-3 ${style.bg} ${style.border}`}>
      <div className={`text-[11px] font-semibold mb-2 ${style.text}`}>
        {character.role}
      </div>

      {/* 12 動物名 + グループチップ */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="font-serif text-lg font-bold text-[#1c3550] leading-tight">
          {character.animal}
        </span>
        <GroupChip group={character.profile.group} />
      </div>

      {/* 本質のみ 60 分類の修飾子付き動物名 */}
      {character.sixty && (
        <div className="text-[11px] text-gray-700 leading-tight mb-2">
          <span className="font-mono text-[10px] text-gray-500 mr-1">No.{character.sixty.number}</span>
          {character.sixty.name}
        </div>
      )}

      {/* 十二運・算出元の小さい注釈 */}
      {character.juniUnsei && (
        <div className="text-[9px] text-gray-500 mb-2 leading-relaxed">
          {character.source}
        </div>
      )}

      {/* キーワード */}
      <div className="text-[11px] text-gray-600 mb-1">
        <span className="text-gray-400 mr-1">▸</span>{character.profile.keyword}
      </div>

      {/* 性格特徴（2-3個まで） */}
      <ul className="text-[10px] text-gray-600 leading-relaxed space-y-0.5">
        {character.profile.traits.slice(0, 3).map((t) => (
          <li key={t}>・{t}</li>
        ))}
      </ul>

      {/* 役割の説明（小さく） */}
      <p className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-200/50 leading-relaxed">
        {ROLE_DESCRIPTIONS[character.role]}
      </p>
    </div>
  );
}

/** グループチップ（月／地球／太陽 のラベル）。 */
function GroupChip({ group }: { group: "月" | "地球" | "太陽" }) {
  const s = GROUP_STYLES[group];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold"
      style={{ backgroundColor: s.chipBg, borderColor: s.chipBorder, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {group}
    </span>
  );
}
