"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, ChevronDown, ChevronRight, MapPin, SlidersHorizontal, X } from "lucide-react";
import { EMPTY_FILTER, INDUSTRIES, REGIONS, searchCompanies, searchPeople, type SearchFilter } from "@/lib/guild/look/sns-mock";
import { CONSTRUCTION_TRADES, ESTATE_TRANSACTIONS, ESTATE_PROPERTIES } from "@/lib/guild/look/sns-construction";

type Props = { filter: SearchFilter; onChange: (patch: Partial<SearchFilter>) => void };
type Panel = "area" | "industry" | "other";
function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
function summary(values: readonly string[], fallback: string) {
  return values.length ? `${values[0]}${values.length > 1 ? ` ほか${values.length - 1}` : ""}` : fallback;
}

/** 結果の上には入口だけ。条件は下書きに選び、「結果を表示」で反映する。 */
export function SearchFilters({ filter, onChange, resultType }: Props & { resultType: "people" | "companies" }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const area = [...filter.regions, ...(filter.prefectures ?? [])];
  const extraCount = Number(filter.licensedOnly) + Number(filter.introducibleOnly);
  return <>
    <div className="sn-filter-bar" aria-label="検索の絞り込み">
      <button type="button" className="sn-filter-trigger" data-active={area.length > 0 || filter.areaMode === "location"} aria-haspopup="dialog" onClick={() => setPanel("area")}><MapPin aria-hidden /><span><small>エリア</small><b>{summary(area, "全国")}</b></span><ChevronDown aria-hidden /></button>
      <button type="button" className="sn-filter-trigger" data-active={filter.industries.length > 0} aria-haspopup="dialog" onClick={() => setPanel("industry")}><span><small>業種</small><b>{summary(filter.industries, "すべて")}</b></span><ChevronDown aria-hidden /></button>
      <button type="button" className="sn-filter-trigger sn-filter-trigger--other" data-active={extraCount > 0} aria-haspopup="dialog" onClick={() => setPanel("other")}><SlidersHorizontal aria-hidden /><span>条件{extraCount > 0 && <b className="sn-filter-badge">{extraCount}</b>}</span></button>
    </div>
    {panel && <FilterEditor initial={filter} panel={panel} resultType={resultType} onApply={onChange} onClose={() => setPanel(null)} />}
  </>;
}

/** ネイティブdialogでフォーカスを制御。スクロールするのは本文1か所だけ。 */
function FilterEditor({ initial, panel, resultType, onApply, onClose }: { initial: SearchFilter; panel: Panel; resultType: "people" | "companies"; onApply: Props["onChange"]; onClose: () => void }) {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState<"main" | "trades">("main");
  const [tradeQuery, setTradeQuery] = useState("");
  const [region, setRegion] = useState(initial.regions[0] ?? Object.keys(REGIONS).find((r) => REGIONS[r].some((p) => initial.prefectures?.includes(p))) ?? "関西");
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const set = (patch: Partial<SearchFilter>) => setDraft((f) => ({ ...f, ...patch }));
  const prefs = draft.prefectures ?? [];
  const trades = draft.constructionTrades ?? [];
  const regionPrefs = REGIONS[region];
  const selectedPrefs = regionPrefs.filter((p) => draft.regions.includes(region) || prefs.includes(p));
  const visibleTrades = CONSTRUCTION_TRADES.filter((t) => `${t}工事業`.includes(tradeQuery.trim()));
  const count = resultType === "people" ? searchPeople(draft).length : searchCompanies(draft).length;
  const title = step === "trades" ? "建設の業種を選ぶ" : ({ area: "エリアを選ぶ", industry: "業種を選ぶ", other: "その他の条件" })[panel];
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = previous; trigger?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    document.getElementById(titleId)?.focus({ preventScroll: true });
  }, [step, titleId]);
  function resetPanel() {
    if (step === "trades") { set({ constructionTrades: [] }); setTradeQuery(""); }
    else if (panel === "area") set({ regions: [], prefectures: [], areaMode: "service" });
    else if (panel === "industry") set({ industries: [], constructionTrades: [], constructionPermit: "any", estateTransactions: [], estateProperties: [] });
    else set({ licensedOnly: false, introducibleOnly: false });
  }
  function selectPrefecture(pref: string) {
    set({ regions: draft.regions.filter((r) => r !== region), prefectures: toggle(draft.regions.includes(region) ? [...new Set([...prefs, ...regionPrefs])] : prefs, pref) });
  }
  const editor = <dialog ref={ref} className="sn-filter-dialog" aria-labelledby={titleId}
    onCancel={(e) => { e.preventDefault(); if (step === "trades") setStep("main"); else onClose(); }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <header className="sn-filter-dialog-head">
      <div className="sn-filter-title">
        {step === "trades" && <button type="button" className="sn-filter-icon" aria-label="業種の条件に戻る" onClick={() => setStep("main")}><ArrowLeft aria-hidden /></button>}
        <h2 id={titleId} tabIndex={-1}>{title}</h2><button type="button" className="sn-filter-icon" aria-label="変更せず閉じる" onClick={onClose}><X aria-hidden /></button>
      </div>
      <p>{step === "trades" ? "29業種から複数選択できます" : panel === "area" ? "地方全体でも、都道府県ごとでも選べます" : panel === "industry" ? "必要な業種・得意分野で絞り込めます" : "紹介や登録の確認状況で絞り込めます"}</p>
      {step === "trades" && <label className="sn-trade-search"><span className="sr-only">建設の業種名で絞る</span><input type="search" value={tradeQuery} onChange={(e) => setTradeQuery(e.target.value)} placeholder="内装・電気・塗装など" /></label>}
    </header>
    <div ref={bodyRef} className="sn-filter-dialog-body">
      {step === "trades" ? <>
        <div className="sn-choice-grid sn-choice-grid--trades" role="group" aria-label="建設の29業種">{visibleTrades.map((trade) => <label key={trade} className="sn-choice" data-selected={trades.includes(trade)}><input type="checkbox" checked={trades.includes(trade)} onChange={() => set({ constructionTrades: toggle(trades, trade) })} /><span>{trade}</span></label>)}</div>
        {!visibleTrades.length && <p className="sn-empty">該当する業種がありません。<br />別の業種名で探してください。</p>}
      </> : panel === "area" ? <>
        <div className="sn-segment" role="group" aria-label="エリアの検索対象">{([ ["service", "対応エリア"], ["location", "所在地"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={(draft.areaMode ?? "service") === value} onClick={() => set({ areaMode: value })}>{label}</button>)}</div>
        <div className="sn-area-regions" role="group" aria-label="都道府県を表示する地方">{Object.keys(REGIONS).map((r) => {
          const n = REGIONS[r].filter((p) => draft.regions.includes(r) || prefs.includes(p)).length;
          return <button type="button" key={r} aria-pressed={region === r} onClick={() => setRegion(r)}>{r}{n > 0 && <span className="sn-area-picked" aria-label={`${n}都道府県選択中`}>{n}</span>}</button>;
        })}</div>
        <div className="sn-area-heading"><h3>{region}</h3><label className="sn-filter-check"><input type="checkbox" checked={selectedPrefs.length === regionPrefs.length} onChange={() => set({ regions: selectedPrefs.length === regionPrefs.length ? draft.regions.filter((r) => r !== region) : [...draft.regions.filter((r) => r !== region), region], prefectures: prefs.filter((p) => !regionPrefs.includes(p)) })} />全域を選ぶ</label></div>
        <div className="sn-choice-grid sn-choice-grid--prefs" role="group" aria-label={`${region}の都道府県`}>{regionPrefs.map((pref) => <label key={pref} className="sn-choice" data-selected={selectedPrefs.includes(pref)}><input type="checkbox" checked={selectedPrefs.includes(pref)} onChange={() => selectPrefecture(pref)} /><span>{pref}</span></label>)}</div>
        <p className="sn-area-summary" aria-live="polite"><b>選択中</b>{[...draft.regions.map((r) => `${r}全域`), ...prefs].join("・") || "全国（指定なし）"}</p>
      </> : panel === "industry" ? <>
        <div className="sn-choice-grid sn-choice-grid--industries" role="group" aria-label="業種">{INDUSTRIES.map((industry) => <button type="button" key={industry} className="sn-choice" aria-pressed={draft.industries.includes(industry)} onClick={() => set({ industries: toggle(draft.industries, industry), ...(industry === "建設" ? { constructionTrades: [], constructionPermit: "any" } : {}), ...(industry === "不動産" ? { estateTransactions: [], estateProperties: [] } : {}) })}>{industry}{draft.industries.includes(industry) && <Check aria-hidden />}</button>)}</div>
        {draft.industries.includes("建設") && <section className="sn-industry-section">
          <h3>建設</h3><button type="button" className="sn-select-trades" onClick={() => setStep("trades")}><span><small>業種を選ぶ <em>29業種</em></small><b>{summary(trades, "すべての業種")}</b></span><ChevronRight aria-hidden /></button>
          <fieldset className="sn-permit"><legend>建設業許可</legend><div className="sn-segment">{([ ["any", "指定なし"], ["yes", "あり"], ["no", "なし"] ] as const).map(([value, label]) => <label key={value} data-selected={(draft.constructionPermit ?? "any") === value}><input type="radio" name="construction-permit" value={value} checked={(draft.constructionPermit ?? "any") === value} onChange={() => set({ constructionPermit: value })} /><span>{label}</span></label>)}</div></fieldset>
          <p className="sn-filter-help">選んだ業種の許可で絞ります。未入力は「なし」に含みません。</p>
        </section>}
        {draft.industries.includes("不動産") && <section className="sn-industry-section"><h3>不動産</h3>
          <fieldset className="sn-filter-group"><legend>取引の種類</legend><div className="sn-choice-grid" role="group" aria-label="不動産の取引の種類">{ESTATE_TRANSACTIONS.map((t) => <label key={t} className="sn-choice" data-selected={(draft.estateTransactions ?? []).includes(t)}><input type="checkbox" checked={(draft.estateTransactions ?? []).includes(t)} onChange={() => set({ estateTransactions: toggle(draft.estateTransactions ?? [], t) })} /><span>{t}</span></label>)}</div></fieldset>
          <fieldset className="sn-filter-group"><legend>物件の種類</legend><div className="sn-choice-grid" role="group" aria-label="不動産の物件の種類">{ESTATE_PROPERTIES.map((p) => <label key={p} className="sn-choice" data-selected={(draft.estateProperties ?? []).includes(p)}><input type="checkbox" checked={(draft.estateProperties ?? []).includes(p)} onChange={() => set({ estateProperties: toggle(draft.estateProperties ?? [], p) })} /><span>{p}</span></label>)}</div></fieldset>
          <p className="sn-filter-help">「店舗・テナント」には飲食店舗も含みます。</p>
        </section>}
      </> : <div className="sn-extra-conditions">
        <label className="sn-filter-check"><input type="checkbox" checked={draft.licensedOnly} onChange={(e) => set({ licensedOnly: e.target.checked })} /><span>許可・免許・登録が確認済み<small>確認済みの登録情報がある会社に絞る</small></span></label>
        <label className="sn-filter-check"><input type="checkbox" checked={draft.introducibleOnly} onChange={(e) => set({ introducibleOnly: e.target.checked })} /><span>紹介できる人だけ<small>知り合い、または知り合い経由でつながれる人</small></span></label>
      </div>}
    </div>
    <footer className="sn-filter-dialog-foot"><button type="button" className="sn-filter-reset" onClick={resetPanel}>クリア</button><button type="button" className="sn-filter-apply" onClick={() => { if (step === "trades") setStep("main"); else { onApply(draft); onClose(); } }}>{step === "trades" ? `この業種で決定${trades.length ? `（${trades.length}）` : ""}` : `結果を表示（${count}件）`}</button></footer>
  </dialog>;
  return createPortal(editor, document.querySelector(".sn") ?? document.body);
}

export function ActiveSearchFilters({ filter, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
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
  if (filter.areaMode === "location") chips.unshift({ label: "所在地で検索", clear: { areaMode: "service" } });
  if (filter.query) chips.unshift({ label: filter.query, clear: { query: "" } });
  if (!chips.length) return null;
  return <div className="sn-active-filters" aria-label="選択中の検索条件"><div className="sn-chips">
    {(expanded ? chips : chips.slice(0, 3)).map((c) => <button type="button" className="sn-chip" key={c.label} onClick={() => onChange(c.clear)} aria-label={`${c.label}を解除`}>{c.label}<X size={12} aria-hidden /></button>)}
    {chips.length > 3 && <button type="button" className="sn-filter-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "閉じる" : `ほか${chips.length - 3}件`}</button>}
    <button type="button" className="sn-filter-more" onClick={() => onChange({ ...EMPTY_FILTER, prefectures: [], constructionTrades: [], constructionPermit: "any", estateTransactions: [], estateProperties: [], areaMode: "service" })}>すべて解除</button>
  </div></div>;
}
