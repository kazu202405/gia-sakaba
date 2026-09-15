"use client";

// 陽占（人体星図 + 宇宙盤）パネル。
// 鑑定書右半分：3×3 の 9マス陣に 5主星（頭・右手・中心・左手・腹）と
// 3大従星（左肩・右足・左足）を配置。NW（北西）の「右肩」は見守り星の
// 位置で、現状は未実装のためプレースホルダー（破線枠 + ダッシュ）。
// 旧版は人体シルエットの上に絶対配置だったが、伝統的マトリクス表示に
// 戻して上下関係と方位（北西〜南東）を読み取りやすくした。

import type { YojoResult } from "@/lib/divination/sanmei/yojo";
import {
  JUDAI_DESCRIPTIONS, DAIJUSEI_DESCRIPTIONS,
  type Judai, type Daijusei,
} from "@/lib/divination/sanmei/descriptions";

interface Props {
  yojo: YojoResult;
}

export function YojoPanel({ yojo }: Props) {
  const j = yojo.jintai;
  const u = yojo.uchuban;
  const centerInfo = JUDAI_DESCRIPTIONS[j.center];

  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6">
      <SectionHeader eyebrow="YOJO / 陽占" title="社会に出たときの自分・外側の顔" />

      {/* 9マス陣（3×3）— 算命学陽占の伝統的なマトリクス表示。
            NW=右肩(見守り星・未実装で空) / N=頭 / NE=左肩
            W=右手               / C=中心 / E=左手
            SW=右足              / S=腹   / SE=左足  */}
      <div className="mx-auto mb-5 grid grid-cols-3 gap-2 max-w-[420px]">
        {/* 上段 — NW は見守り星（未実装）のため通常画面では破線プレースホルダー、
              PNG 出力時は print-hide-keep-space で見えなくする（grid 位置は保つ） */}
        <StarCell label="右肩" empty />
        <StarCell judai={j.head}            label="頭"   accent="judai" />
        <StarCell daijusei={u.leftShoulder} label="左肩" accent="daijusei" />
        {/* 中段 */}
        <StarCell judai={j.rightHand}       label="右手" accent="judai" />
        <StarCell judai={j.center}          label="中心" accent="center" />
        <StarCell judai={j.leftHand}        label="左手" accent="judai" />
        {/* 下段 */}
        <StarCell daijusei={u.rightFoot}    label="右足" accent="daijusei" />
        <StarCell judai={j.belly}           label="腹"   accent="judai" />
        <StarCell daijusei={u.leftFoot}     label="左足" accent="daijusei" />
      </div>

      {/* print-hide ラッパー: ここから下（エネルギー合計／中心星詳細／
           陽占の特徴まとめ／大従星詳細）は人渡し用PNGでは非表示。 */}
      <div className="print-hide">
        {/* エネルギー合計 */}
        <div className="text-center mb-5 py-2 border-y border-gray-100">
          <span className="text-[11px] tracking-[0.2em] text-gray-500 mr-3">大従星エネルギー合計</span>
          <span className="font-serif text-2xl font-bold text-[#1c3550]">{u.totalEnergy}</span>
          <span className="text-[12px] text-gray-500 ml-1">/ 36 点</span>
        </div>

        {/* 中心星の詳細 */}
        <div className="rounded bg-[#fbf3e3] border border-[#e6d3a3] px-4 py-3 mb-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[10px] tracking-[0.2em] text-[#8a5a1c]">中心星</span>
            <span className="font-serif text-lg font-bold text-[#1c3550]">{j.center}</span>
            <span className="text-[11px] text-gray-600">{centerInfo.keyword}</span>
          </div>
          <p className="text-[12px] text-gray-700 leading-relaxed">{centerInfo.personality}</p>
          <div className="text-[11px] text-gray-600 mt-2 grid grid-cols-2 gap-x-3">
            <div><span className="text-gray-400 mr-1">強み：</span>{centerInfo.strength}</div>
            <div><span className="text-gray-400 mr-1">課題：</span>{centerInfo.weakness}</div>
          </div>
        </div>

        {/* 陽占の特徴まとめ（中心星以外） */}
        {yojo.otherStars.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[11px] tracking-[0.2em] text-gray-500 mb-2">陽占の特徴まとめ</h3>
            <ul className="space-y-2">
              {yojo.otherStars.map((star) => {
                const info = JUDAI_DESCRIPTIONS[star];
                return (
                  <li key={star} className="text-[12px] text-gray-700 leading-relaxed">
                    <span className="font-serif font-bold text-[#1c3550] mr-2">{star}</span>
                    <span className="text-gray-500 mr-2">{info.keyword}</span>
                    <span>{info.personality.split("。")[0]}。</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* 大従星の詳細 */}
        <div>
          <h3 className="text-[11px] tracking-[0.2em] text-gray-500 mb-2">十二大従星</h3>
          <ul className="space-y-1.5">
            <DaijuseiLine pos="左肩（年柱・目上）" star={u.leftShoulder} />
            <DaijuseiLine pos="左足（月柱・現実）" star={u.leftFoot} />
            <DaijuseiLine pos="右足（日柱・自分）" star={u.rightFoot} />
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── パーツ ──────────────────────────────────────

// 5主星の位置 → 算命学の人間関係ラベル
// 頭=北・親/目上、右手=西・家庭、中心=本質、左手=東・社会、腹=南・目下/子供
const JUDAI_RELATION_BY_LABEL: Record<string, string> = {
  "頭": "親・目上",
  "右手": "家庭",
  "中心": "本質",
  "左手": "社会",
  "腹": "目下・子供",
};

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <span className="text-[11px] tracking-[0.3em] text-[#c08a3e] font-semibold">{eyebrow}</span>
      <h2 className="font-serif text-lg font-bold text-[#1c3550] mt-1">{title}</h2>
    </div>
  );
}

/** 9マス陣の1セル。
 *  - empty=true: 右肩（見守り星・未実装）のプレースホルダー（破線枠 + ダッシュ）。
 *                通常画面では表示、PNG 出力時は print-hide-keep-space で透明化。
 *  - judai: 5主星セル。info は位置関係（親・目上 等）で人渡し PNG にも残す
 *  - daijusei: 3大従星セル。info は stage・E値で print-hide により PNG では非表示 */
function StarCell({
  judai, daijusei, label, accent, empty,
}: {
  judai?: Judai;
  daijusei?: Daijusei;
  label: string;
  accent?: "judai" | "center" | "daijusei";
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div className="print-hide-keep-space border border-dashed border-gray-300 rounded p-2 text-center bg-gray-50/40 min-h-[78px] flex flex-col items-center justify-center">
        <div className="text-[9px] text-gray-400 tracking-wider leading-none mb-1">{label}</div>
        <div className="text-[12px] text-gray-300">—</div>
      </div>
    );
  }

  const star = judai ?? daijusei!;
  const info = judai
    ? JUDAI_RELATION_BY_LABEL[label] ?? ""
    : `${DAIJUSEI_DESCRIPTIONS[daijusei!].stage}・E${DAIJUSEI_DESCRIPTIONS[daijusei!].energy}`;

  const style =
    accent === "center"
      ? "bg-[#fbf3e3] border-[#e6d3a3]"
      : accent === "daijusei"
        ? "bg-[#eef2f7] border-[#cdd6e0]"
        : "bg-white border-[#d6dde5]";

  return (
    <div className={`border rounded p-2 text-center shadow-sm min-h-[78px] flex flex-col justify-center ${style}`}>
      <div className="text-[9px] text-gray-500 tracking-wider leading-none mb-0.5">{label}</div>
      <div className="font-serif text-[13px] font-bold leading-tight text-[#1c3550]">{star}</div>
      {/* info: judai は人間関係ラベル（親・目上 等）で人渡しPNGにも残す。
           daijusei は stage・E値で社内向けのため print-hide。 */}
      <div className={`${accent === "daijusei" ? "print-hide " : ""}text-[9px] text-gray-500 leading-tight mt-0.5`}>{info}</div>
    </div>
  );
}

function DaijuseiLine({ pos, star }: { pos: string; star: Daijusei }) {
  const info = DAIJUSEI_DESCRIPTIONS[star];
  return (
    <li className="text-[12px] text-gray-700 leading-relaxed">
      <span className="text-gray-500 mr-2">{pos}</span>
      <span className="font-serif font-bold text-[#1c3550] mr-2">{star}</span>
      <span className="print-hide text-[11px] text-gray-500">（{info.stage}・E{info.energy}）</span>
      <span className="ml-2">{info.trait}</span>
    </li>
  );
}
