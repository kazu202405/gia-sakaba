"use client";

// 十二運星タブ。人生サイクル順（胎→養→長生→…→絶）で 12 段階を表示。
// 各運星に対応する大従星（算命学）・動物（動物占い）も併記して 3 体系を横断できるようにする。

import {
  DAIJUSEI_DESCRIPTIONS, JUNI_TO_DAIJUSEI,
  type JuniUnsei,
} from "@/lib/divination/sanmei/descriptions";
import {
  JUNI_TO_ANIMAL, ANIMAL_PROFILES, GROUP_STYLES,
} from "@/lib/divination/animal/twelve";

// 人生サイクルとしての並び（受胎から消滅まで）。
const CYCLE_ORDER: JuniUnsei[] = [
  "胎", "養", "長生", "沐浴", "冠帯", "臨官",
  "帝旺", "衰", "病", "死", "墓", "絶",
];

// 各運星の人生段階の補足説明。
const CYCLE_NOTES: Record<JuniUnsei, string> = {
  胎:   "宿る・新たな命の始まり",
  養:   "育てられる・守られて成長する",
  長生: "誕生・生まれて世に出る",
  沐浴: "産湯・剥き出しのエネルギー",
  冠帯: "成人・社会に出始める",
  臨官: "壮年・地位を確立する",
  帝旺: "頂点・人生の絶頂期",
  衰:   "下り坂・若さを失い始める",
  病:   "病・無理が利かなくなる",
  死:   "死・現実から離れる",
  墓:   "墓・収まる・蓄積する",
  絶:   "無・あの世・無一物",
};

export function JuniunseiTab() {
  return (
    <section className="space-y-4">
      <p className="text-[12px] text-gray-600 leading-relaxed">
        十二運星は四柱推命の概念で、人の一生のサイクルを 12 段階に分けたものです。
        算命学では大従星に置き換えられ、動物占いでは 12 動物に対応します。
        この 3 体系は同じ十二運がルーツになっています。
      </p>

      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#f1f4f7] text-[11px] text-gray-600">
            <tr>
              <th className="text-left py-2 px-3 w-10 border-b border-gray-200">順</th>
              <th className="text-left py-2 px-3 w-20 border-b border-gray-200">十二運</th>
              <th className="text-left py-2 px-3 border-b border-gray-200">人生段階</th>
              <th className="text-left py-2 px-3 w-32 border-b border-gray-200">大従星（算命学）</th>
              <th className="text-left py-2 px-3 w-16 border-b border-gray-200">E値</th>
              <th className="text-left py-2 px-3 w-24 border-b border-gray-200">12動物</th>
              <th className="text-left py-2 px-3 w-20 border-b border-gray-200">グループ</th>
            </tr>
          </thead>
          <tbody>
            {CYCLE_ORDER.map((unsei, idx) => {
              const daijusei = JUNI_TO_DAIJUSEI[unsei];
              const animal = JUNI_TO_ANIMAL[unsei];
              const daijuseiInfo = DAIJUSEI_DESCRIPTIONS[daijusei];
              const profile = ANIMAL_PROFILES[animal];
              const groupStyle = GROUP_STYLES[profile.group];
              return (
                <tr key={unsei} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-[12px] text-gray-500">{idx + 1}</td>
                  <td className="py-2 px-3 font-serif font-bold text-[#1c3550]">{unsei}</td>
                  <td className="py-2 px-3 text-[12px] text-gray-700">{CYCLE_NOTES[unsei]}</td>
                  <td className="py-2 px-3 font-serif text-[#1c3550]">
                    {daijusei}
                    <div className="text-[10px] text-gray-500 font-sans">{daijuseiInfo.stage}</div>
                  </td>
                  <td className="py-2 px-3 font-mono text-[12px] font-bold text-[#c08a3e]">
                    {daijuseiInfo.energy}
                  </td>
                  <td className="py-2 px-3 font-serif text-[#1c3550]">{animal}</td>
                  <td className="py-2 px-3">
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold"
                      style={{
                        backgroundColor: groupStyle.chipBg,
                        borderColor: groupStyle.chipBorder,
                        color: groupStyle.text,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: groupStyle.dot }}
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

      <p className="text-[11px] text-gray-400 leading-relaxed">
        ※ 十二運星 → 大従星 → 12動物 の対応は、それぞれの占術体系で名称が異なるだけで、
        起点は同じ「人生サイクル 12 段階」です。
      </p>
    </section>
  );
}
