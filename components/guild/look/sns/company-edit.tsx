"use client";

// 見本の会社情報の編集（設計書5-1〜5-4・6-7）。探すの条件（エリア・業種・業種の中の条件）は、すべてここで入れた値を見る。
// 保存の中身は lib/guild/look/sns-company.ts。電話などの見せる相手は項目ごとに選び、判定は sns-mock の canReveal。

import { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { uiToast } from "@/lib/ui-dialog";
import { CONSTRUCTION_TRADES, ESTATE_PROPERTIES, ESTATE_TRANSACTIONS, PERMIT_LABELS, type ConstructionTrade, type ConstructionWork } from "@/lib/guild/look/sns-construction";
import { PROFESSIONS } from "@/lib/guild/look/sns-expertise";
import { applyCompanyDraft, companyToDraft, toggleValue, validateCompanyDraft, type CompanyDraft, type CompanyDraftErrors } from "@/lib/guild/look/sns-company";
import { INDUSTRIES, PREFECTURES, REGIONS, REGION_NAMES, REVEALS, areaText, regionOf, type CompanyReveal, type Reveal } from "@/lib/guild/look/sns-mock";
import { SEND_MS } from "./flow";
import { Modal } from "./parts";
import { SnLink, useSn, useSnState } from "./store";

const PERMITS = ["general", "special", "none", "unknown"] as const;

/** 入力欄と、その下の赤字。文字の欄はすべてこれを使う */
function TextField({ label, value, onChange, error, type = "text", placeholder, note }: { label: string; value: string; onChange: (v: string) => void; error?: string; type?: "text" | "tel" | "email" | "url"; placeholder?: string; note?: string }) {
  return (
    <label className="sn-field">
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} aria-invalid={!!error} onChange={(e) => onChange(e.target.value)} />
      {note && <small className="sn-field-note">{note}</small>}
      {error && <small className="sn-error" role="alert">{error}</small>}
    </label>
  );
}

/** 連絡先の見せる相手（全員・知り合いだけ・見せない）。項目ごとに置く */
export function RevealPicker({ label, value, onChange }: { label: string; value: Reveal; onChange: (v: Reveal) => void }) {
  return (
    <div className="sn-segment sn-segment--reveal" role="group" aria-label={label}>
      {REVEALS.map((r) => <button type="button" key={r.key} aria-pressed={value === r.key} onClick={() => onChange(r.key)}>{r.label}</button>)}
    </div>
  );
}

function CheckGrid<T extends string>({ label, options, values, onToggle }: { label: string; options: readonly T[]; values: readonly T[]; onToggle: (v: T) => void }) {
  return (
    <div className="sn-field">
      <span>{label}</span>
      <div className="sn-choice-grid" role="group" aria-label={label}>
        {options.map((o) => (
          <label key={o} className="sn-choice" data-selected={values.includes(o)}>
            <input type="checkbox" checked={values.includes(o)} onChange={() => onToggle(o)} /><span>{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** 対応エリア：探すのエリアと同じ、地方→都道府県の選び方 */
function AreaPicker({ areas, onChange, error }: { areas: readonly string[]; onChange: (next: readonly string[]) => void; error?: string }) {
  const [region, setRegion] = useState(() => regionOf(areas[0] ?? "") ?? "関西");
  const prefs = REGIONS[region];
  const whole = prefs.every((p) => areas.includes(p));
  return (
    <div className="sn-field">
      <span>対応エリア（複数選べます）</span>
      <div className="sn-area-regions" role="group" aria-label="都道府県を表示する地方">
        {REGION_NAMES.map((r) => {
          const n = REGIONS[r].filter((p) => areas.includes(p)).length;
          return <button type="button" key={r} aria-pressed={region === r} onClick={() => setRegion(r)}>{r}{n > 0 && <span className="sn-area-picked">{n}</span>}</button>;
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

/** 建設：29業種から選び、業種ごとに許可を決める（探すの「建設業許可」は、この業種ごとの値を見る） */
function ConstructionFields({ works, permitNumber, onWorks, onNumber }: { works: readonly ConstructionWork[]; permitNumber: string; onWorks: (next: readonly ConstructionWork[]) => void; onNumber: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const toggleTrade = (trade: ConstructionTrade) =>
    onWorks(works.some((w) => w.trade === trade) ? works.filter((w) => w.trade !== trade) : [...works, { trade, permit: "unknown" }]);
  return (
    <section className="sn-form-sec">
      <h3>建設</h3>
      <div className="sn-field">
        <span>業種と建設業許可</span>
        <button type="button" className="sn-select-trades" onClick={() => setOpen(true)}>
          <span><small>29業種から選ぶ</small><b>{works.length > 0 ? `${works.length}業種を選んでいます` : "まだ選んでいません"}</b></span>
          <ChevronRight aria-hidden />
        </button>
        {works.map((w) => (
          <label key={w.trade} className="sn-work-row">
            <span>{w.trade}</span>
            <select value={w.permit} aria-label={`${w.trade}の許可`} onChange={(e) => onWorks(works.map((x) => (x.trade === w.trade ? { ...x, permit: e.target.value as ConstructionWork["permit"] } : x)))}>
              {PERMITS.map((p) => <option key={p} value={p}>{PERMIT_LABELS[p]}</option>)}
            </select>
          </label>
        ))}
      </div>
      <TextField label="許可番号" value={permitNumber} onChange={onNumber} placeholder="例：大阪府知事 第00000号" note="書き換えると「自己申告」に戻り、運営が確かめると「確認済み」になります" />
      {open && (
        <Modal title="建設の業種を選ぶ" onClose={() => setOpen(false)}>
          <div className="sn-choice-grid" role="group" aria-label="建設の29業種">
            {CONSTRUCTION_TRADES.map((t) => {
              const on = works.some((w) => w.trade === t);
              return <label key={t} className="sn-choice" data-selected={on}><input type="checkbox" checked={on} onChange={() => toggleTrade(t)} /><span>{t}</span></label>;
            })}
          </div>
          <div className="sn-modal-acts"><button type="button" className="sn-btn sn-btn--main" onClick={() => setOpen(false)}>決定</button></div>
        </Modal>
      )}
    </section>
  );
}

export function CompanyEditScreen() {
  const { myCompany, saveMyCompany } = useSnState();
  const { go } = useSn();
  const [draft, setDraft] = useState<CompanyDraft>(() => companyToDraft(myCompany));
  const [errors, setErrors] = useState<CompanyDraftErrors>({});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const set = (patch: Partial<CompanyDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const has = (industry: (typeof INDUSTRIES)[number]) => draft.industries.includes(industry);
  const setReveal = (field: keyof CompanyReveal) => (v: Reveal) => setDraft((d) => ({ ...d, reveal: { ...d.reveal, [field]: v } }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    const found = validateCompanyDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // 長い画面なので、直す場所まで連れていく（描き直しのあとに探す）
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], .sn-error')?.scrollIntoView({ block: "center" }));
      return;
    }
    lock.current = true;
    setBusy(true);
    window.setTimeout(() => {
      // 見る画面に反映される保存とトーストを同じ瞬間に。錠は外さない（画面が変わるまで押せない）
      saveMyCompany(applyCompanyDraft(myCompany, draft));
      uiToast("会社情報を保存しました");
      go("/me");
    }, SEND_MS);
  };

  return (
    <div className="sn-form">
      <form ref={formRef} onSubmit={save} noValidate>
        <div className="sn-sec"><div className="sn-sec-h"><h2>会社情報を編集</h2></div>
          <p className="sn-meta">「探す」の条件は、ここで入れた内容で探されます。番地・電話・FAX・メールは、見せる相手を項目ごとに選べます。</p>
        </div>
        <div className="sn-fields">
          <section className="sn-form-sec">
            <h3>会社の基本</h3>
            <TextField label="会社名（必須）" value={draft.name} onChange={(name) => set({ name })} error={errors.name} />
            <TextField label="会社名のふりがな" value={draft.kana} onChange={(kana) => set({ kana })} />
            <TextField label="郵便番号" value={draft.postalCode} onChange={(postalCode) => set({ postalCode })} error={errors.postalCode} placeholder="530-0001" />
            <label className="sn-field">
              <span>都道府県（必須）</span>
              <select value={draft.prefecture} aria-invalid={!!errors.prefecture} onChange={(e) => set({ prefecture: e.target.value })}>
                <option value="">選んでください</option>
                {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.prefecture && <small className="sn-error" role="alert">{errors.prefecture}</small>}
            </label>
            <TextField label="市区町村（必須）" value={draft.city} onChange={(city) => set({ city })} error={errors.city} placeholder="大阪市北区" />
            <TextField label="番地・建物" value={draft.street} onChange={(street) => set({ street })} />
            <RevealPicker label="郵便番号と番地を見せる相手" value={draft.reveal.street} onChange={setReveal("street")} />
            <TextField label="電話（必須）" type="tel" value={draft.phone} onChange={(phone) => set({ phone })} error={errors.phone} />
            <RevealPicker label="電話を見せる相手" value={draft.reveal.phone} onChange={setReveal("phone")} />
            <TextField label="FAX" type="tel" value={draft.fax} onChange={(fax) => set({ fax })} />
            <RevealPicker label="FAXを見せる相手" value={draft.reveal.fax} onChange={setReveal("fax")} />
            <TextField label="メール" type="email" value={draft.email} onChange={(email) => set({ email })} error={errors.email} />
            <RevealPicker label="メールを見せる相手" value={draft.reveal.email} onChange={setReveal("email")} />
            <TextField label="ホームページ" type="url" value={draft.url} onChange={(url) => set({ url })} error={errors.url} placeholder="https://" />
          </section>

          <section className="sn-form-sec">
            <h3>探されるときの内容</h3>
            <div className="sn-field">
              <span>業種（必須・複数選べます）</span>
              <div className="sn-chips" role="group" aria-label="業種">
                {INDUSTRIES.map((i) => <button type="button" key={i} className="sn-chip" aria-pressed={has(i)} onClick={() => set({ industries: toggleValue(draft.industries, i) })}>{i}</button>)}
              </div>
              {errors.industries && <small className="sn-error" role="alert">{errors.industries}</small>}
            </div>
            <TextField label="事業の内容（必須）" value={draft.business} onChange={(business) => set({ business })} error={errors.business} placeholder="例：電気工事業、売買仲介" />
            <AreaPicker areas={draft.areas} onChange={(areas) => set({ areas })} error={errors.areas} />
            <label className="sn-field">
              <span>得意なこと（1行に1つ）</span>
              <textarea rows={3} value={draft.specialties} placeholder={"例：\nLED改修"} onChange={(e) => set({ specialties: e.target.value })} />
            </label>
            <label className="sn-field">
              <span>会社の紹介</span>
              <textarea rows={3} maxLength={300} value={draft.about} onChange={(e) => set({ about: e.target.value })} />
            </label>
          </section>

          {has("建設") && <ConstructionFields works={draft.construction} permitNumber={draft.permitNumber} onWorks={(construction) => set({ construction })} onNumber={(permitNumber) => set({ permitNumber })} />}

          {has("不動産") && (
            <section className="sn-form-sec">
              <h3>不動産</h3>
              <CheckGrid label="取引の種類" options={ESTATE_TRANSACTIONS} values={draft.estateTransactions} onToggle={(v) => set({ estateTransactions: toggleValue(draft.estateTransactions, v) })} />
              <CheckGrid label="物件の種類" options={ESTATE_PROPERTIES} values={draft.estateProperties} onToggle={(v) => set({ estateProperties: toggleValue(draft.estateProperties, v) })} />
              <TextField label="宅建業の免許番号" value={draft.estateLicense} onChange={(estateLicense) => set({ estateLicense })} placeholder="例：大阪府知事（1）第00000号" />
            </section>
          )}

          {has("士業") && (
            <section className="sn-form-sec">
              <h3>士業・専門家</h3>
              <CheckGrid label="資格の種類" options={PROFESSIONS} values={draft.professions} onToggle={(v) => set({ professions: toggleValue(draft.professions, v) })} />
              <TextField label="登録番号" value={draft.professionNumber} onChange={(professionNumber) => set({ professionNumber })} />
            </section>
          )}
        </div>
        <div className="sn-sticky">
          {Object.keys(errors).length > 0 && <p className="sn-error" role="alert">赤字のところを直してください</p>}
          <div className="sn-modal-acts">
            <SnLink to="/me" className="sn-btn" aria-disabled={busy}>やめる</SnLink>
            <button type="submit" className="sn-btn sn-btn--main" disabled={busy}>{busy ? "保存しています…" : "保存する"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
