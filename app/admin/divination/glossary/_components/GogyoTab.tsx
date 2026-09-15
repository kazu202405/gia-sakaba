"use client";

// 五行タブ。木火土金水の 5 要素と相生（生む）・相剋（剋す）の関係を表示。
// 動物占い・算命学・四柱推命すべての基礎概念。

import {
  GOGYO, GOGYO_COLORS, GOGYO_SOUSHOU, GOGYO_SOUKOKU,
  KAN_TO_GOGYO, SHI_TO_GOGYO,
  JIKKAN, JUNISHI,
  type Gogyo, type Jikkan, type Junishi,
} from "@/lib/divination/kanshi/constants";

interface GogyoMeta {
  season: string;
  direction: string;
  keyword: string;
  description: string;
  organ: string;  // 五臓（東洋医学との対応）
}

const META: Record<Gogyo, GogyoMeta> = {
  木: { season: "春", direction: "東", keyword: "成長・発展", organ: "肝",
        description: "草木が天に向かって伸びるエネルギー。新たな始まり、成長、向上心を表します。" },
  火: { season: "夏", direction: "南", keyword: "表現・情熱", organ: "心",
        description: "燃え盛る炎のエネルギー。情熱、感情、表現力、外への発信を表します。" },
  土: { season: "土用", direction: "中央", keyword: "受容・安定", organ: "脾",
        description: "万物を育む大地のエネルギー。安定感、受容力、調和、現実性を表します。" },
  金: { season: "秋", direction: "西", keyword: "洗練・決断", organ: "肺",
        description: "金属が研ぎ澄まされるエネルギー。決断力、規律、論理性、収穫を表します。" },
  水: { season: "冬", direction: "北", keyword: "知性・流動", organ: "腎",
        description: "流れて深まる水のエネルギー。知性、柔軟性、深い思考、潜在力を表します。" },
};

// 各五行に対応する天干・地支のリスト
const KAN_BY_GOGYO: Record<Gogyo, Jikkan[]> = { 木: [], 火: [], 土: [], 金: [], 水: [] };
for (const kan of JIKKAN) {
  KAN_BY_GOGYO[KAN_TO_GOGYO[kan]].push(kan);
}

const SHI_BY_GOGYO: Record<Gogyo, Junishi[]> = { 木: [], 火: [], 土: [], 金: [], 水: [] };
for (const shi of JUNISHI) {
  SHI_BY_GOGYO[SHI_TO_GOGYO[shi]].push(shi);
}

export function GogyoTab() {
  return (
    <section className="space-y-6">
      <p className="text-[12px] text-gray-600 leading-relaxed">
        五行（ごぎょう）は東洋哲学の基礎で、自然界のすべてを 5 つの要素で説明する考え方です。
        動物占い・算命学・四柱推命の根底にあり、お互いを生かす「相生」と抑える「相剋」の関係でバランスをとります。
      </p>

      {/* 5 要素カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {GOGYO.map((g) => (
          <GogyoCard key={g} gogyo={g} />
        ))}
      </div>

      {/* 相生・相剋の関係 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RelationBox
          title="相生（そうしょう）— 生む関係"
          description="A が B を生み、B が C を生む循環。お互いを助け合い、エネルギーを与え合う良い流れ。"
          cycle={["木", "火", "土", "金", "水"]}
          relation={GOGYO_SOUSHOU}
        />
        <RelationBox
          title="相剋（そうこく）— 剋す関係"
          description="A が B を抑え、B が C を抑える流れ。バランスをとるための制御関係。"
          cycle={["木", "土", "水", "火", "金"]}
          relation={GOGYO_SOUKOKU}
        />
      </div>
    </section>
  );
}

function GogyoCard({ gogyo }: { gogyo: Gogyo }) {
  const meta = META[gogyo];
  const color = GOGYO_COLORS[gogyo];
  const kans = KAN_BY_GOGYO[gogyo];
  const shis = SHI_BY_GOGYO[gogyo];

  return (
    <div
      className="border rounded p-3"
      style={{ backgroundColor: color.bg, borderColor: color.hex }}
    >
      <div className="flex items-baseline gap-2 mb-2">
        <span
          className="font-serif text-2xl font-bold leading-none"
          style={{ color: color.text }}
        >
          {gogyo}
        </span>
        <span className="text-[10px] text-gray-500">{meta.season} / {meta.direction}</span>
      </div>
      <div className="text-[11px] font-semibold mb-2" style={{ color: color.text }}>
        {meta.keyword}
      </div>
      <p className="text-[11px] text-gray-700 leading-relaxed mb-2">{meta.description}</p>
      <div className="text-[10px] text-gray-500 leading-relaxed space-y-0.5">
        <div><span className="text-gray-400 mr-1">天干:</span>{kans.join("・")}</div>
        <div><span className="text-gray-400 mr-1">地支:</span>{shis.join("・")}</div>
        <div><span className="text-gray-400 mr-1">五臓:</span>{meta.organ}</div>
      </div>
    </div>
  );
}

function RelationBox({
  title, description, cycle, relation,
}: {
  title: string;
  description: string;
  cycle: Gogyo[];
  relation: Record<Gogyo, Gogyo>;
}) {
  return (
    <div className="border border-gray-200 rounded-md bg-white p-4">
      <h3 className="font-serif text-sm font-bold text-[#1c3550] mb-1">{title}</h3>
      <p className="text-[11px] text-gray-600 mb-3 leading-relaxed">{description}</p>

      {/* サイクル可視化 */}
      <div className="flex flex-wrap items-center justify-center gap-1 mb-3">
        {cycle.map((g, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full font-serif text-sm font-bold border-2"
              style={{
                color: GOGYO_COLORS[g].text,
                borderColor: GOGYO_COLORS[g].hex,
                backgroundColor: GOGYO_COLORS[g].bg,
              }}
            >
              {g}
            </span>
            {i < cycle.length - 1 && <span className="text-gray-400 text-xs">→</span>}
          </span>
        ))}
        <span className="text-gray-400 text-xs">→</span>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full font-serif text-sm font-bold border-2 opacity-50"
          style={{
            color: GOGYO_COLORS[cycle[0]].text,
            borderColor: GOGYO_COLORS[cycle[0]].hex,
            backgroundColor: GOGYO_COLORS[cycle[0]].bg,
          }}
        >
          {cycle[0]}
        </span>
      </div>

      {/* 詳細表 */}
      <table className="w-full text-[11px] border-collapse">
        <tbody>
          {GOGYO.map((g) => (
            <tr key={g} className="border-t border-gray-100">
              <td className="py-1.5 px-2 font-serif font-bold w-12"
                style={{ color: GOGYO_COLORS[g].text }}>
                {g}
              </td>
              <td className="py-1.5 px-2 text-gray-500 w-8 text-center">→</td>
              <td className="py-1.5 px-2 font-serif font-bold"
                style={{ color: GOGYO_COLORS[relation[g]].text }}>
                {relation[g]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
