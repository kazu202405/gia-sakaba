"use client";

// 12動物タブ。基本動物のプロファイルをグループ別（月／地球／太陽）にセクション分けして表示。

import {
  ANIMAL_PROFILES, GROUP_STYLES,
  type BasicAnimal, type AnimalGroup, type AnimalProfile,
} from "@/lib/divination/animal/twelve";

const GROUPS: AnimalGroup[] = ["月", "地球", "太陽"];

const GROUP_INTRO: Record<AnimalGroup, string> = {
  月:   "相手軸・他人を立てる・新月から満月へと形を変えるしなやかさ。表記はひらがな。",
  地球: "自分軸・自分の信念を貫く・自転する地球のように確かな歩み。表記は漢字。",
  太陽: "自由軸・直感とひらめき・いつも輝く太陽のような天才肌。表記はカタカナ。",
};

export function TwelveTab() {
  const grouped: Record<AnimalGroup, AnimalProfile[]> = { 月: [], 地球: [], 太陽: [] };
  for (const animal of Object.values(ANIMAL_PROFILES)) {
    grouped[animal.group].push(animal);
  }

  return (
    <section className="space-y-6">
      {GROUPS.map((g) => {
        const style = GROUP_STYLES[g];
        return (
          <div key={g}>
            {/* グループヘッダー */}
            <div className="flex items-baseline gap-3 mb-3">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-semibold"
                style={{
                  backgroundColor: style.chipBg,
                  borderColor: style.chipBorder,
                  color: style.text,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: style.dot }}
                />
                {g}グループ
              </span>
              <span className="text-[12px] text-gray-600">{GROUP_INTRO[g]}</span>
            </div>

            {/* カード grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {grouped[g].map((animal) => (
                <AnimalCard key={animal.name} profile={animal} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function AnimalCard({ profile }: { profile: AnimalProfile }) {
  const style = GROUP_STYLES[profile.group];
  return (
    <div
      className="border rounded p-3"
      style={{ backgroundColor: style.bg, borderColor: style.chipBorder }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-serif text-lg font-bold" style={{ color: style.text }}>
          {profile.name}
        </span>
        <span className="text-[10px] text-gray-500 font-mono">{profile.stage}</span>
      </div>
      <div className="text-[11px] text-gray-700 mb-2">{profile.keyword}</div>
      <ul className="text-[11px] text-gray-700 leading-relaxed space-y-0.5">
        {profile.traits.map((t) => (
          <li key={t}>・{t}</li>
        ))}
      </ul>
    </div>
  );
}
