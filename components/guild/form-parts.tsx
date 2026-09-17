// 酒場の入力画面で共通に使う部品（ステータス作成・クエストを出す）。
// 見た目は components/guild/guild-theme.css の .c-input。

import { cn } from "@/lib/utils";

/** 入力エラーがあったら、最初のエラーの欄まで移動する。
 *  スマホでは送信ボタンが下にあり赤字が上に出るので、押しても何も起きないように見えるため */
export function scrollToFirstError() {
  requestAnimationFrame(() => {
    document.querySelector("[data-field-error='true']")?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

export function Field({
  label,
  hint,
  required = false,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-field-error={error ? "true" : undefined}>
      <p className="text-[15px] tracking-wider">
        {label}
        {required && <span className="ml-1.5 text-xs text-[#c62828]">必須</span>}
      </p>
      {hint && <p className="c-muted mt-0.5 text-xs">{hint}</p>}
      <div className="mt-2">{children}</div>
      {error !== undefined && <p className="mt-1 min-h-[1rem] text-xs text-[#c62828]">{error}</p>}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  max,
  type = "text",
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max: number;
  type?: string;
  label?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      maxLength={max}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="c-input h-11"
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows,
  max,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  rows: number;
  max: number;
  placeholder?: string;
  label?: string;
}) {
  return (
    <>
      <textarea
        value={value}
        rows={rows}
        maxLength={max}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="c-input leading-relaxed"
      />
      <p className="c-muted text-right text-[11px] tabular-nums">
        {value.length}/{max}
      </p>
    </>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = "選んでください",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[] | string[];
  label: string;
  placeholder?: string;
}) {
  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="c-input h-11">
      <option value="">{placeholder}</option>
      {normalized.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * チェックボックス。ブラウザそのままだと 角が丸く、iOSでは 見た目も変わるので 自分で四角く描く。
 * 中の input は 残したまま隠す（キーボードと 読み上げは そのまま使えるように）。
 */
export function CheckBox({
  checked,
  onChange,
  disabled = false,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex items-start gap-3", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border-2 border-[#1b2a41] bg-[#fffdf6] text-sm leading-none peer-focus-visible:outline-3 peer-focus-visible:outline-[#c8a55a]"
      >
        {checked ? "✓" : ""}
      </span>
      <span className="min-w-0">{children}</span>
    </label>
  );
}

/** 日付の入力。iOS Safari では そのままだと 枠から はみ出すので、幅を 親に合わせる */
export function DateInput({
  value,
  onChange,
  label,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  min?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      min={min}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="c-input c-date h-11"
    />
  );
}
