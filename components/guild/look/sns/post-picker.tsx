"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { expandAreas } from "@/lib/guild/look/sns-mock";
import { DateInput } from "@/components/guild/form-parts";
import { AreaPicker } from "./area-picker";

export function PostSelectionDialog({ title, lead, onClose, children, actions }: {
  title: string;
  lead?: string;
  onClose: () => void;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const previous = document.body.style.overflow;
    dialog?.showModal();
    titleRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
      if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="sn-filter-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <header className="sn-filter-dialog-head">
        <div className="sn-filter-title">
          <h2 ref={titleRef} id={titleId} tabIndex={-1}>{title}</h2>
          <button type="button" className="sn-filter-icon" aria-label="変更せず閉じる" onClick={onClose}><X aria-hidden /></button>
        </div>
        {lead && <p>{lead}</p>}
      </header>
      <div className="sn-filter-dialog-body">{children}</div>
      <footer className="sn-filter-dialog-foot">{actions}</footer>
    </dialog>
  );
}

type PostChoice<Key extends string> = { key: Key; label: string; count?: number };

export function PostChoiceDialog<Key extends string>({ title, choices, initial, applyLabel, onApply, onClose }: {
  title: string;
  choices: readonly PostChoice<Key>[];
  initial?: Key;
  applyLabel: string;
  onApply: (selected: Key) => void;
  onClose: () => void;
}) {
  const name = useId();
  const [selected, setSelected] = useState(initial);

  function apply() {
    if (selected === undefined) return;
    onApply(selected);
    onClose();
  }

  return (
    <PostSelectionDialog title={title} onClose={onClose} actions={
      <button type="button" className="sn-btn sn-btn--main sn-btn--wide" disabled={selected === undefined} onClick={apply}>{applyLabel}</button>
    }>
      <div className="sn-post-choices" role="group" aria-label={title}>
        {choices.map(({ key, label, count }) => (
          <label className="sn-filter-check" key={key}>
            <input type="radio" name={name} value={key} checked={selected === key} onChange={() => setSelected(key)} />
            <span>{label}</span>
            {count !== undefined && <small>{count}件</small>}
          </label>
        ))}
      </div>
    </PostSelectionDialog>
  );
}

export function PostAreaDialog({ initial, onApply, onClose }: {
  initial: readonly string[];
  onApply: (selected: readonly string[]) => void;
  onClose: () => void;
}) {
  const [areas, setAreas] = useState<readonly string[]>(() => expandAreas(initial));
  return (
    <PostSelectionDialog title="探している地域" lead="全国・地方全域・都道府県から選べます。" onClose={onClose} actions={
      <button type="button" className="sn-btn sn-btn--main sn-btn--wide" onClick={() => { onApply(areas); onClose(); }}>決定する</button>
    }>
      <AreaPicker areas={areas} onChange={setAreas} allowNationwide />
    </PostSelectionDialog>
  );
}

export function PostSelectRow({ label, value, error, onClick }: { label: string; value: string; error?: string; onClick: () => void }) {
  const errorId = useId();
  return (
    <div>
      <button
        type="button"
        className="sn-post-select-row"
        aria-haspopup="dialog"
        data-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onClick={onClick}
      >
        <span className="sn-post-select-label">{label}</span>
        <span className="sn-post-select-value" data-picked={Boolean(value)}>{value || "選択する"}</span>
        <ChevronRight aria-hidden />
      </button>
      {error && <p id={errorId} className="sn-error sn-post-select-error" role="alert">{error}</p>}
    </div>
  );
}

// 返事の期限：先に「なし／あり」を選び、「あり」のときだけ日付の欄を出す（本番の依頼と見本で共通）。
// 「なし」に戻すと日付も消す。ボタンを label で包まない（iPhone では押すと日付の欄が開くため）
export function DeadlineChoice({ on, onToggle, value, onChange, min, error }: {
  on: boolean;
  onToggle: (on: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  error?: string;
}) {
  return (
    <div className="sn-field" role="group" aria-label="返事の期限">
      <span>返事の期限</span>
      <div className="sn-segment">
        {([[false, "なし"], [true, "あり"]] as const).map(([value, label]) => (
          <button key={label} type="button" aria-pressed={on === value} onClick={() => {
            onToggle(value);
            if (!value) onChange("");
          }}>{label}</button>
        ))}
      </div>
      {on && <DateInput value={value} onChange={onChange} label="返事の期限の日付" min={min} required />}
      {error && <p className="sn-error" role="alert">{error}</p>}
    </div>
  );
}
