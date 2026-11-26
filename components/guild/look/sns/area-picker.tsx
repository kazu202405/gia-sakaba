"use client";

import { useState } from "react";
import { toggleValue } from "@/lib/guild/look/sns-company";
import { REGIONS, REGION_NAMES, areaText, regionOf } from "@/lib/guild/look/sns-mock";

/** 地方ごとに都道府県を選ぶ。全域の選択も都道府県の一覧として扱う。 */
export function AreaPicker({ label, areas, onChange, error }: {
  label?: string;
  areas: readonly string[];
  onChange: (next: readonly string[]) => void;
  error?: string;
}) {
  const [region, setRegion] = useState(() => regionOf(areas[0] ?? "") ?? "関西");
  const prefs = REGIONS[region];
  const whole = prefs.every((p) => areas.includes(p));
  return (
    <div className="sn-field">
      {label && <span>{label}</span>}
      <div className="sn-area-regions" role="group" aria-label="都道府県を表示する地方">
        {REGION_NAMES.map((r) => {
          const n = REGIONS[r].filter((p) => areas.includes(p)).length;
          return <button type="button" key={r} aria-pressed={region === r} onClick={() => setRegion(r)}>{r}{n > 0 && <span className="sn-area-picked" aria-label={`${n}都道府県選択中`}>{n}</span>}</button>;
        })}
      </div>
      <label className="sn-filter-check">
        <input type="checkbox" checked={whole} onChange={() => onChange(whole ? areas.filter((a) => !prefs.includes(a)) : [...areas.filter((a) => !prefs.includes(a)), ...prefs])} />
        {region}の全域
      </label>
      <div className="sn-choice-grid sn-choice-grid--prefs" role="group" aria-label={`${region}の都道府県`}>
        {prefs.map((p) => (
          <label key={p} className="sn-choice" data-selected={areas.includes(p)}>
            <input type="checkbox" checked={areas.includes(p)} onChange={() => onChange(toggleValue(areas, p))} /><span>{p}</span>
          </label>
        ))}
      </div>
      <p className="sn-area-summary" aria-live="polite"><b>選択中</b>{areas.length > 0 ? areaText(areas) : "まだ選んでいません"}</p>
      {error && <small className="sn-error" role="alert">{error}</small>}
    </div>
  );
}
