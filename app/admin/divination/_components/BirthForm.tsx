"use client";

// 鑑定対象の入力フォーム。名前 / 性別 / 生年月日 / （任意）時刻。
// 名前入力は SubjectPicker（goshima テナント内人物の検索＋選択）に置き換え、
// 選択時に他フィールドを autofill する。新規の人物はそのまま入力するだけで OK。
// 「保存」ボタンで /clone/<slug>/people への保存ダイアログを開く。

import { useEffect, useState } from "react";
import { Save, CheckCircle2 } from "lucide-react";
import { YEAR_OPTIONS, MONTH_OPTIONS, DAY_OPTIONS } from "./KanshiSearch";
import { DivinationSaveDialog } from "./DivinationSaveDialog";
import { SubjectPicker } from "./SubjectPicker";
import type { PersonSearchHit } from "../_save-shared";

export interface SubjectInput {
  name: string;
  gender: "男性" | "女性" | "未指定";
  year: number;
  month: number;
  day: number;
  hour: number | null;   // 0-23、未入力なら null
  minute: number | null; // 0-59、未入力なら null
  birthplace: string;    // 出生地（参考表示・計算には未使用）
}

interface Props {
  value: SubjectInput;
  onChange: (next: SubjectInput) => void;
  onSubmit: () => void;
}

// "YYYY-MM-DD" → {year, month, day}。パース失敗時は null。
function parseBirthdayISO(iso: string | null): { year: number; month: number; day: number } | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

// hour/minute → "HH:MM"（<input type="time"> の value 用）。null なら空文字。
function formatHHMM(hour: number | null, minute: number | null): string {
  if (hour === null) return "";
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute ?? 0).padStart(2, "0");
  return `${hh}:${mm}`;
}

// "HH:MM" → {hour, minute}。空文字なら両方 null。
function parseHHMM(value: string): { hour: number | null; minute: number | null } {
  if (!value) return { hour: null, minute: null };
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return { hour: null, minute: null };
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

// 保存値の "男性"/"女性"/"未指定"/null/その他文字列 を SubjectInput の型に正規化
function normalizeGender(raw: string | null): SubjectInput["gender"] | null {
  if (raw === "男性" || raw === "女性" || raw === "未指定") return raw;
  return null;
}

export function BirthForm({ value, onChange, onSubmit }: Props) {
  const patch = (p: Partial<SubjectInput>) => onChange({ ...value, ...p });
  const [saveOpen, setSaveOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // SubjectPicker で選択された人物の id と name。
  // 名前を編集すると linkedPersonName と乖離 → 自動解除。
  const [linkedPersonId, setLinkedPersonId] = useState<string | null>(null);
  const [linkedPersonName, setLinkedPersonName] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleNameChange = (next: string) => {
    patch({ name: next });
    // 名前が linkedPersonName と一致しなくなったらリンク解除
    if (linkedPersonName && next !== linkedPersonName) {
      setLinkedPersonId(null);
      setLinkedPersonName(null);
    }
  };

  const handlePickPerson = (person: PersonSearchHit) => {
    const bd = parseBirthdayISO(person.birthday);
    const g = normalizeGender(person.gender);
    onChange({
      name: person.name,
      gender: g ?? value.gender,
      year: bd?.year ?? value.year,
      month: bd?.month ?? value.month,
      day: bd?.day ?? value.day,
      hour: person.birthHour ?? value.hour,
      minute: person.birthMinute ?? value.minute,
      birthplace: person.birthplace ?? value.birthplace,
    });
    setLinkedPersonId(person.id);
    setLinkedPersonName(person.name);
  };

  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6">
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-[11px] tracking-[0.3em] text-[#c08a3e] font-semibold">
          SUBJECT / 鑑定対象
        </span>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="grid grid-cols-1 sm:grid-cols-12 gap-3"
      >
        <Field label="お名前" cls="sm:col-span-4">
          <SubjectPicker
            name={value.name}
            onNameChange={handleNameChange}
            onPick={handlePickPerson}
            linkedPersonId={linkedPersonId}
            placeholder="名前で検索 / 新規ならそのまま入力"
          />
        </Field>

        <Field label="性別" cls="sm:col-span-2">
          <select
            value={value.gender}
            onChange={(e) => patch({ gender: e.target.value as SubjectInput["gender"] })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:border-[#1c3550] focus:outline-none cursor-pointer"
          >
            <option value="未指定">未指定</option>
            <option value="男性">男性</option>
            <option value="女性">女性</option>
          </select>
        </Field>

        <Field label="生年" cls="sm:col-span-2">
          <NumSelect value={value.year} options={YEAR_OPTIONS} suffix="年"
            onChange={(v) => patch({ year: v })} />
        </Field>
        <Field label="月" cls="sm:col-span-1">
          <NumSelect value={value.month} options={MONTH_OPTIONS} suffix="月"
            onChange={(v) => patch({ month: v })} />
        </Field>
        <Field label="日" cls="sm:col-span-1">
          <NumSelect value={value.day} options={DAY_OPTIONS} suffix="日"
            onChange={(v) => patch({ day: v })} />
        </Field>

        <Field label="時刻 時:分（任意）" cls="sm:col-span-2">
          <input
            type="time"
            value={formatHHMM(value.hour, value.minute)}
            onChange={(e) => {
              const { hour, minute } = parseHHMM(e.target.value);
              patch({ hour, minute });
            }}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono bg-white focus:border-[#1c3550] focus:outline-none"
          />
        </Field>

        <Field label="出生地（参考）" cls="sm:col-span-8">
          <input
            type="text"
            value={value.birthplace}
            onChange={(e) => patch({ birthplace: e.target.value })}
            placeholder="例：大阪府吹田市"
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:border-[#1c3550] focus:outline-none"
          />
        </Field>

        <div className="sm:col-span-4 flex items-end justify-end gap-2">
          <button
            type="button"
            onClick={() => setSaveOpen(true)}
            disabled={value.name.trim().length === 0}
            title={value.name.trim().length === 0 ? "お名前を入力してください" : "/clone/goshima/people に保存"}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-[#1c3550] text-[#1c3550] text-sm font-semibold rounded hover:bg-[#1c3550]/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center px-5 py-2 bg-[#1c3550] text-white text-sm font-semibold rounded hover:bg-[#142640]"
          >
            鑑定する
          </button>
        </div>
      </form>

      <DivinationSaveDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        subject={value}
        onSaved={(msg) => setToast(msg)}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-4 py-3 bg-[#1c3550] text-white text-sm font-semibold rounded shadow-2xl">
          <CheckCircle2 className="w-4 h-4 text-[#e8c98a]" />
          <span>{toast}</span>
        </div>
      )}
    </section>
  );
}

function Field({ label, cls = "", children }: { label: string; cls?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${cls}`}>
      <span className="block text-[10px] tracking-[0.2em] text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function NumSelect({
  value, options, suffix, onChange,
}: {
  value: number; options: number[]; suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono bg-white focus:border-[#1c3550] focus:outline-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}{suffix ?? ""}</option>
      ))}
    </select>
  );
}
