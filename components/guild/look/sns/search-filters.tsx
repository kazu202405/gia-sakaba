"use client";

import { useState } from "react";
import { EMPTY_FILTER, INDUSTRIES, REGIONS, type SearchFilter } from "@/lib/guild/look/sns-mock";
import { CONSTRUCTION_TRADES, ESTATE_TRANSACTIONS, ESTATE_PROPERTIES } from "@/lib/guild/look/sns-construction";

type Props = { filter: SearchFilter; onChange: (patch: Partial<SearchFilter>) => void };
function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function SearchFilters({ filter, onChange }: Props) {
  const [tradeQuery, setTradeQuery] = useState("");
  const prefs = filter.prefectures ?? [];
  const trades = filter.constructionTrades ?? [];
  const visibleTrades = CONSTRUCTION_TRADES.filter((t) => `${t}工事業`.includes(tradeQuery.trim()));
  function selectPrefecture(region: string, pref: string) {
    // 地方全体から1県を外す時は、残る県を個別選択へ展開する。
    const fullRegion = filter.regions.includes(region);
    onChange({
      regions: filter.regions.filter((r) => r !== region),
      prefectures: toggle(fullRegion ? [...new Set([...prefs, ...REGIONS[region]])] : prefs, pref),
    });
  }
  return (
    <div className="sn-filters">
      <fieldset className="sn-filter-group">
        <legend>エリア <small>複数選択できます</small></legend>
        <div className="sn-chips" role="group" aria-label="エリアの検索対象">
          {([ ["service", "対応エリア"], ["location", "所在地"] ] as const).map(([value, label]) => (
            <button key={value} type="button" className="sn-chip" aria-pressed={(filter.areaMode ?? "service") === value} onClick={() => onChange({ areaMode: value })}>{label}</button>
          ))}
        </div>
        <p className="sn-filter-help">地方全体でも、都道府県ごとでも選べます。</p>
        {Object.entries(REGIONS).map(([region, regionsPrefs]) => {
          const selected = regionsPrefs.filter((p) => filter.regions.includes(region) || prefs.includes(p)).length;
          return (
            <details className="sn-filter-region" key={region}>
              <summary>{region}<span>{selected ? `${selected} / ${regionsPrefs.length} 選択中` : "都道府県を選ぶ"}</span></summary>
              <label className="sn-filter-check">
                <input type="checkbox" checked={selected === regionsPrefs.length} onChange={() => onChange({
                  regions: selected === regionsPrefs.length ? filter.regions.filter((r) => r !== region) : [...filter.regions.filter((r) => r !== region), region],
                  prefectures: prefs.filter((p) => !regionsPrefs.includes(p)),
                })} />{region}全体
              </label>
              <div className="sn-prefectures">
                {regionsPrefs.map((pref) => <label className="sn-filter-check" key={pref}><input type="checkbox" checked={filter.regions.includes(region) || prefs.includes(pref)} onChange={() => selectPrefecture(region, pref)} />{pref}</label>)}
              </div>
            </details>
          );
        })}
      </fieldset>
      <fieldset className="sn-filter-group">
        <legend>業種 <small>複数選択できます</small></legend>
        <div className="sn-chips">
          {INDUSTRIES.map((industry) => <button key={industry} type="button" className="sn-chip" aria-pressed={filter.industries.includes(industry)} onClick={() => onChange({
            industries: toggle(filter.industries, industry),
            ...(industry === "建設" ? { constructionTrades: [], constructionPermit: "any" as const } : {}),
            ...(industry === "不動産" ? { estateTransactions: [], estateProperties: [] } : {}),
          })}>{industry}</button>)}
        </div>
        {filter.industries.includes("建設") && <div className="sn-filter-sub">
          <h3>建設の業種 <small>29業種・複数選択</small></h3>
          <label className="sn-trade-search"><span className="sr-only">建設の業種名で絞る</span><input type="search" value={tradeQuery} onChange={(e) => setTradeQuery(e.target.value)} placeholder="内装・電気・塗装など" /></label>
          <div className="sn-trades" role="group" aria-label="建設の29業種">
            {visibleTrades.map((trade) => <label className="sn-filter-check" key={trade}><input type="checkbox" checked={trades.includes(trade)} onChange={() => onChange({ constructionTrades: toggle(trades, trade) })} />{trade}</label>)}
            {!visibleTrades.length && <p className="sn-filter-help">該当する業種がありません。</p>}
          </div>
          <fieldset className="sn-permit"><legend>建設業許可</legend>
            {([ ["any", "指定なし"], ["yes", "許可あり"], ["no", "許可なし"] ] as const).map(([value, label]) => <label className="sn-filter-check" key={value}><input type="radio" name="construction-permit" value={value} checked={(filter.constructionPermit ?? "any") === value} onChange={() => onChange({ constructionPermit: value })} />{label}</label>)}
          </fieldset>
          <p className="sn-filter-help">選んだ業種のいずれかと、その業種の許可状況で絞ります。未入力は「許可なし」に含みません。</p>
        </div>}
        {filter.industries.includes("不動産") && <div className="sn-filter-sub">
          <h3>取引の種類</h3>
          <div className="sn-chips" role="group" aria-label="不動産の取引の種類">{ESTATE_TRANSACTIONS.map((t) => <button key={t} className="sn-chip" type="button" aria-pressed={(filter.estateTransactions ?? []).includes(t)} onClick={() => onChange({ estateTransactions: toggle(filter.estateTransactions ?? [], t) })}>{t}</button>)}</div>
          <h3>物件の種類</h3>
          <div className="sn-estate-types" role="group" aria-label="不動産の物件の種類">{ESTATE_PROPERTIES.map((p) => <label className="sn-filter-check" key={p}><input type="checkbox" checked={(filter.estateProperties ?? []).includes(p)} onChange={() => onChange({ estateProperties: toggle(filter.estateProperties ?? [], p) })} />{p}</label>)}</div>
          <p className="sn-filter-help">売買・賃貸のどちらでも選べます。「店舗・テナント」には飲食店舗も含みます。</p>
        </div>}
      </fieldset>
      <fieldset className="sn-filter-group"><legend>その他の条件</legend>
        <label className="sn-filter-check"><input type="checkbox" checked={filter.licensedOnly} onChange={(e) => onChange({ licensedOnly: e.target.checked })} />許可・免許・登録が確認済み</label>
        <label className="sn-filter-check"><input type="checkbox" checked={filter.introducibleOnly} onChange={(e) => onChange({ introducibleOnly: e.target.checked })} />紹介できる人だけ</label>
      </fieldset>
    </div>
  );
}

export function ActiveSearchFilters({ filter, onChange }: Props) {
  const chips: { label: string; clear: Partial<SearchFilter> }[] = [
    ...filter.regions.map((v) => ({ label: `${v}全体`, clear: { regions: filter.regions.filter((x) => x !== v) } })),
    ...(filter.prefectures ?? []).map((v) => ({ label: v, clear: { prefectures: filter.prefectures?.filter((x) => x !== v) } })),
    ...filter.industries.map((v) => ({ label: v, clear: { industries: filter.industries.filter((x) => x !== v), ...(v === "建設" ? { constructionTrades: [], constructionPermit: "any" as const } : {}), ...(v === "不動産" ? { estateTransactions: [], estateProperties: [] } : {}) } })),
    ...(filter.constructionTrades ?? []).map((v) => ({ label: v, clear: { constructionTrades: filter.constructionTrades?.filter((x) => x !== v) } })),
    ...(filter.estateTransactions ?? []).map((v) => ({ label: v, clear: { estateTransactions: filter.estateTransactions?.filter((x) => x !== v) } })),
    ...(filter.estateProperties ?? []).map((v) => ({ label: v, clear: { estateProperties: filter.estateProperties?.filter((x) => x !== v) } })),
  ];
  if (filter.constructionPermit && filter.constructionPermit !== "any") chips.push({ label: `建設業許可${filter.constructionPermit === "yes" ? "あり" : "なし"}`, clear: { constructionPermit: "any" } });
  if (filter.licensedOnly) chips.push({ label: "許可・登録確認済み", clear: { licensedOnly: false } });
  if (filter.introducibleOnly) chips.push({ label: "紹介できる人", clear: { introducibleOnly: false } });
  if (!chips.length && !filter.query) return null;
  return <div className="sn-active-filters"><div className="sn-filter-heading"><b>{filter.areaMode === "location" ? "所在地" : "対応エリア"}で検索</b><button type="button" onClick={() => onChange({ ...EMPTY_FILTER, prefectures: [], constructionTrades: [], constructionPermit: "any", estateTransactions: [], estateProperties: [], areaMode: "service" })}>すべて解除</button></div><div className="sn-chips">{filter.query && <button type="button" className="sn-chip" onClick={() => onChange({ query: "" })} aria-label={`検索語「${filter.query}」を解除`}>{filter.query} ×</button>}{chips.map((c) => <button type="button" className="sn-chip" key={c.label} onClick={() => onChange(c.clear)} aria-label={`${c.label}を解除`}>{c.label} ×</button>)}</div></div>;
}
