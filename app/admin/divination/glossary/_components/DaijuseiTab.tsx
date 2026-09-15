"use client";

// 十二大従星タブ。人生サイクル順（番号 1〜12）で縦カード並び。
// 左サイドに縦タイムライン（誕生前 → 子供時代 → 青年期 → 大人時代 → 老年期 → 死後・精神世界）を表示。

import {
  DAIJUSEI_DESCRIPTIONS,
  JUNI_UNSEI_NAMES, JUNI_TO_DAIJUSEI,
  type Daijusei, type DaijuseiInfo, type LifePhase,
} from "@/lib/divination/sanmei/descriptions";

// 大従星 → 元の十二運名（人生段階の確認用）
const DAIJUSEI_TO_UNSEI: Record<Daijusei, string> = Object.fromEntries(
  JUNI_UNSEI_NAMES.map((u) => [JUNI_TO_DAIJUSEI[u], u])
) as Record<Daijusei, string>;

// 人生フェーズごとのトーン（タイムラインの色分けに使う）。
const PHASE_TONES: Record<LifePhase, { dot: string; bg: string; text: string }> = {
  誕生前:          { dot: "#8a96ab", bg: "#eef0f5", text: "#5a6680" },
  子供時代:        { dot: "#5b9070", bg: "#e6f0e7", text: "#2f6b3a" },
  青年期:          { dot: "#d97a32", bg: "#fbeede", text: "#8a4a18" },
  大人時代:        { dot: "#c08a3e", bg: "#fbf3e3", text: "#8a5a1c" },
  老年期:          { dot: "#3f7fc1", bg: "#e1ebf5", text: "#1c4a7a" },
  "死後・精神世界": { dot: "#8a4538", bg: "#f3e9e6", text: "#8a4538" },
};

export function DaijuseiTab() {
  // 番号順にソート
  const sorted = (Object.entries(DAIJUSEI_DESCRIPTIONS) as [Daijusei, DaijuseiInfo][])
    .sort(([, a], [, b]) => a.number - b.number);

  return (
    <section className="space-y-4">
      <p className="text-[12px] text-gray-600 leading-relaxed">
        十二大従星は算命学のエネルギー指標で、人の一生のサイクル 12 段階に対応します。
        左の縦タイムラインで、各星が人生のどの時期を表すかが分かります。
        星の良し悪しはなく、それぞれが人生に必要なエネルギーです。
      </p>

      <div className="relative">
        {sorted.map(([star, info], idx) => {
          const prev = idx > 0 ? sorted[idx - 1][1] : null;
          const next = idx < sorted.length - 1 ? sorted[idx + 1][1] : null;
          const showPhaseLabel = !prev || prev.lifePhase !== info.lifePhase;
          const isLastInPhase = !next || next.lifePhase !== info.lifePhase;
          const tone = PHASE_TONES[info.lifePhase];

          return (
            <div
              key={star}
              className="grid grid-cols-[88px_1fr] sm:grid-cols-[120px_1fr] gap-3"
            >
              {/* 左：タイムライン */}
              <div className="relative pt-3">
                {/* フェーズラベル（フェーズの最初の星にだけ表示） */}
                {showPhaseLabel && (
                  <div className="mb-2">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor: tone.bg,
                        borderColor: tone.dot,
                        color: tone.text,
                      }}
                    >
                      {info.lifePhase}
                    </span>
                  </div>
                )}

                {/* 縦線とドット */}
                <div className="relative flex items-start gap-2 h-full">
                  <div className="relative w-3 flex-shrink-0 flex flex-col items-center">
                    {/* 上から続く線 */}
                    {idx > 0 && (
                      <div
                        className="absolute top-0 w-px h-3"
                        style={{ backgroundColor: tone.dot, opacity: 0.4 }}
                      />
                    )}
                    {/* ドット */}
                    <div
                      className="relative z-10 w-3 h-3 rounded-full border-2 bg-white mt-3"
                      style={{ borderColor: tone.dot }}
                    />
                    {/* 下に続く線 */}
                    {idx < sorted.length - 1 && (
                      <div
                        className="absolute top-6 bottom-[-24px] w-px"
                        style={{ backgroundColor: tone.dot, opacity: 0.4 }}
                      />
                    )}
                  </div>

                  <div className="pt-3">
                    <div className="text-[10px] text-gray-500 leading-tight">{info.stage}</div>
                    <div className="text-[10px] text-gray-400 leading-tight">{info.ageRange}</div>
                  </div>
                </div>
              </div>

              {/* 右：星カード */}
              <div className={isLastInPhase ? "pb-6" : "pb-3"}>
                <DaijuseiCard star={star} info={info} unsei={DAIJUSEI_TO_UNSEI[star]} tone={tone} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed pt-2">
        ※ ★ の数が多いほど現実世界を動かす外向きのエネルギーが強いことを示します。
        ★ の少ない星は精神性や内面のエネルギーが強く、それぞれに大きな価値があります。
      </p>
    </section>
  );
}

function DaijuseiCard({
  star, info, unsei, tone,
}: {
  star: Daijusei;
  info: DaijuseiInfo;
  unsei: string;
  tone: { dot: string; bg: string; text: string };
}) {
  return (
    <div className="border rounded-md p-4 bg-white" style={{ borderColor: tone.dot + "55" }}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-gray-400">{info.number}</span>
          <span className="font-serif text-xl font-bold text-[#1c3550]">{star}</span>
          <span className="text-[10px] text-gray-500">{info.reading}</span>
          <span className="text-[11px] text-gray-600">／{info.subtitle}</span>
        </div>
        <EnergyMeter energy={info.energy} dotColor={tone.dot} />
      </div>

      {/* キーワード */}
      <div className="text-[12px] mb-2 font-semibold" style={{ color: tone.text }}>
        ▸ {info.keyword}
      </div>

      {/* 由来（十二運） */}
      <div className="text-[10px] text-gray-500 mb-3">
        十二運：<span className="font-serif font-bold">{unsei}</span> ／ 段階：{info.stage}（{info.ageRange}）
      </div>

      {/* 1行解説 */}
      <p className="text-[12px] text-gray-700 leading-relaxed mb-3">{info.trait}</p>

      {/* 特徴箇条書き */}
      <ul className="text-[11px] text-gray-700 leading-relaxed space-y-0.5 mb-3">
        {info.traits.map((t) => (
          <li key={t}>・{t}</li>
        ))}
      </ul>

      {/* 向く仕事 */}
      <div className="text-[11px] pt-2 border-t border-gray-100">
        <span className="text-gray-400 mr-1">向く仕事:</span>
        <span className="text-gray-700">{info.suitableWork}</span>
      </div>
    </div>
  );
}

/** エネルギーメーター：星★とバーで強度を視覚化。 */
function EnergyMeter({ energy, dotColor }: { energy: number; dotColor: string }) {
  // 1〜12 → 1〜5 段階の星に圧縮（1-3=1, 4-6=2, 7-9=3, 10-11=4, 12=5）
  const stars =
    energy >= 12 ? 5 :
    energy >= 10 ? 4 :
    energy >= 7  ? 3 :
    energy >= 4  ? 2 : 1;

  return (
    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
      <div className="text-[11px] font-mono font-bold text-[#1c3550]">
        E{energy}
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="text-[11px] leading-none"
            style={{ color: i < stars ? dotColor : "#d6dde5" }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}
