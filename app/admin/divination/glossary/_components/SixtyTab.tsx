"use client";

// 60分類動物タブ。甲子〜癸亥の 60 干支 × 動物（修飾子付き）×グループ を表で表示。
// グループ（月/地球/太陽）でフィルタもできる。

import { useMemo, useState } from "react";
import { SIXTY_ANIMALS } from "@/lib/divination/animal/sixty";
import { ANIMAL_PROFILES, GROUP_STYLES, type AnimalGroup } from "@/lib/divination/animal/twelve";
import { KAN_TO_GOGYO, SHI_TO_GOGYO, GOGYO_COLORS } from "@/lib/divination/kanshi/constants";

type Filter = "all" | AnimalGroup;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",  label: "すべて" },
  { key: "月",   label: "月" },
  { key: "地球", label: "地球" },
  { key: "太陽", label: "太陽" },
];

export function SixtyTab() {
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo(() => {
    if (filter === "all") return SIXTY_ANIMALS;
    return SIXTY_ANIMALS.filter((a) => ANIMAL_PROFILES[a.baseAnimal].group === filter);
  }, [filter]);

  return (
    <section className="space-y-4">
      {/* フィルタ */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] tracking-[0.2em] text-gray-500 mr-1">グループ:</span>
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          const groupDot =
            f.key !== "all" ? GROUP_STYLES[f.key].dot : null;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] transition-colors ${
                isActive
                  ? "bg-[#1c3550] border-[#1c3550] text-white"
                  : "bg-white border-gray-300 text-gray-600 hover:border-[#1c3550]"
              }`}
            >
              {groupDot && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: groupDot }}
                />
              )}
              {f.label}
            </button>
          );
        })}
        <span className="text-[11px] text-gray-400 ml-auto">{items.length} 件</span>
      </div>

      {/* テーブル */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#f1f4f7] text-[11px] text-gray-600">
            <tr>
              <th className="text-left py-2 px-3 w-12 border-b border-gray-200">No.</th>
              <th className="text-left py-2 px-3 w-20 border-b border-gray-200">干支</th>
              <th className="text-left py-2 px-3 border-b border-gray-200">動物名（60分類）</th>
              <th className="text-left py-2 px-3 w-24 border-b border-gray-200">12動物</th>
              <th className="text-left py-2 px-3 w-20 border-b border-gray-200">グループ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const profile = ANIMAL_PROFILES[a.baseAnimal];
              const group = GROUP_STYLES[profile.group];
              const kan = a.kanshi[0] as keyof typeof KAN_TO_GOGYO;
              const shi = a.kanshi[1] as keyof typeof SHI_TO_GOGYO;
              const kanGogyo = KAN_TO_GOGYO[kan];
              const shiGogyo = SHI_TO_GOGYO[shi];
              return (
                <tr key={a.number} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-[12px] text-gray-500">{a.number}</td>
                  <td className="py-2 px-3 font-serif font-bold">
                    <span style={{ color: GOGYO_COLORS[kanGogyo].text }}>{kan}</span>
                    <span style={{ color: GOGYO_COLORS[shiGogyo].text }}>{shi}</span>
                  </td>
                  <td className="py-2 px-3 text-gray-800">{a.name}</td>
                  <td className="py-2 px-3 font-serif text-[#1c3550]">{a.baseAnimal}</td>
                  <td className="py-2 px-3">
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold"
                      style={{
                        backgroundColor: group.chipBg,
                        borderColor: group.chipBorder,
                        color: group.text,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: group.dot }}
                      />
                      {profile.group}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
