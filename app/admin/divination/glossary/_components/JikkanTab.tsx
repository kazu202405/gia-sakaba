"use client";

// 十干タブ。甲〜癸の 10 種を陽干・陰干に分けてカード表示。
// 陰占の「日干（あなたの核）」セクションで出てくるキャラクター辞典。

import {
  JIKKAN, JIKKAN_READING, KAN_TO_GOGYO, KAN_TO_INYO, GOGYO_COLORS,
  type Jikkan,
} from "@/lib/divination/kanshi/constants";
import { JIKKAN_CHARACTERS } from "@/lib/divination/sanmei/descriptions";

const YANG_KAN: Jikkan[] = ["甲", "丙", "戊", "庚", "壬"];
const YIN_KAN:  Jikkan[] = ["乙", "丁", "己", "辛", "癸"];

export function JikkanTab() {
  return (
    <section className="space-y-5">
      <p className="text-[12px] text-gray-600 leading-relaxed">
        十干（じっかん）は天の気を 10 種類に分けたもので、五行（木火土金水）×陰陽の組み合わせで成り立ちます。
        日柱の天干＝「日干」がその人の本質（核）を表し、命式読み解きの中心になります。
      </p>

      <KanSection title="陽干（5種）" subtitle="エネルギーが外向き・大きい・能動的" kans={YANG_KAN} />
      <KanSection title="陰干（5種）" subtitle="エネルギーが内向き・繊細・受容的" kans={YIN_KAN} />
    </section>
  );
}

function KanSection({
  title, subtitle, kans,
}: { title: string; subtitle: string; kans: Jikkan[] }) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[11px] tracking-[0.3em] font-semibold text-[#c08a3e]">{title}</span>
        <span className="text-[12px] text-gray-600">{subtitle}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {kans.map((kan) => (
          <JikkanCard key={kan} kan={kan} />
        ))}
      </div>
    </div>
  );
}

function JikkanCard({ kan }: { kan: Jikkan }) {
  const char = JIKKAN_CHARACTERS[kan];
  const gogyo = KAN_TO_GOGYO[kan];
  const inyo = KAN_TO_INYO[kan];
  const reading = JIKKAN_READING[JIKKAN.indexOf(kan)];
  const color = GOGYO_COLORS[gogyo];

  return (
    <div
      className="border rounded p-3 bg-white"
      style={{ borderColor: color.bg }}
    >
      <div className="flex items-baseline gap-2 mb-1">
        <span
          className="font-serif text-2xl font-bold leading-none"
          style={{ color: color.text }}
        >
          {kan}
        </span>
        <span className="text-[10px] text-gray-500">{reading}</span>
      </div>
      <div className="text-[11px] text-gray-500 mb-2" style={{ color: color.text }}>
        {gogyo}の{inyo}
      </div>
      <div className="text-[12px] font-semibold text-[#1c3550] mb-2">
        {char.image}
      </div>
      <p className="text-[11px] text-gray-700 leading-relaxed mb-2">
        {char.description}
      </p>
      <ul className="text-[10px] text-gray-600 leading-relaxed space-y-0.5">
        {char.traits.map((t) => (
          <li key={t}>・{t}</li>
        ))}
      </ul>
    </div>
  );
}
