"use client";

// ステータスをなおす画面：連絡先を種類を選んで追加する（10件まで）。1件ごとに見せる相手を選ぶ。
// ほかの項目と同じく、入力が正しくなったら少し待って自動保存する（丸ごと置き換え）。

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import {
  contactItemLabel,
  contactItemsError,
  contactKindOptions,
  type ContactItemKind,
  type ContactVisibility,
  type GuildContactItem,
} from "@/lib/guild/contact-items";
import { Window } from "./cards";

const MAX_ITEMS = 10;
// ステータスの他の窓と余白をそろえる
const WINDOW_CLASS = "p-5 pt-10 sm:p-7 sm:pt-11";
// 入力欄で Enter を押しても、外側のフォーム（保存して戻る）を送らない
const stopEnter = (event: React.KeyboardEvent) => { if (event.key === "Enter") event.preventDefault(); };

const VISIBILITY_OPTIONS: { value: ContactVisibility; label: string }[] = [
  { value: "members", label: "会員全員" },
  { value: "approved", label: "つながった人だけ" },
  { value: "private", label: "非公開" },
];

const PLACEHOLDER: Record<ContactItemKind, string> = {
  email: "example@example.com",
  line: "https://line.me/ti/p/...",
  instagram: "https://www.instagram.com/...",
  x: "https://x.com/...",
  facebook: "https://www.facebook.com/...",
  threads: "https://www.threads.net/@...",
  note: "https://note.com/...",
  website: "https://example.com",
  other: "https://...",
};

type Row = GuildContactItem & { key: number };

// 値がまだ空の行は「入力中」として保存に含めない（追加した直後に赤字を出さない・他の変更は保存できるように）
const filled = <T extends GuildContactItem>(rows: T[]) => rows.filter((row) => row.value.trim());
const toPayload = (rows: Row[]) => filled(rows).map((row) => ({
  kind: row.kind,
  label: row.kind === "other" ? row.label.trim() : "",
  value: row.value.trim(),
  visibility: row.visibility,
}));

export function ContactItemsEditor({ initial }: { initial: GuildContactItem[] | null }) {
  const nextKey = useRef(0);
  const [rows, setRows] = useState<Row[]>(() => (initial ?? []).map((item) => ({ ...item, key: nextKey.current++ })));
  const [state, setState] = useState<"saved" | "editing" | "saving" | "error">("saved");
  const [error, setError] = useState("");
  const lastSaved = useRef(JSON.stringify(toPayload(rows)));
  const latest = useRef(rows);
  useEffect(() => { latest.current = rows; }, [rows]);

  const save = useCallback(async (current: Row[]) => {
    const payload = toPayload(current);
    const serialized = JSON.stringify(payload);
    if (serialized === lastSaved.current) { setState("saved"); return; }
    const issue = contactItemsError(filled(current));
    if (issue) { setError(issue); setState("error"); return; }
    setState("saving"); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_save_my_contact_items", { p_items: payload });
      if (rpcError) throw rpcError;
      lastSaved.current = serialized;
      setState("saved");
      uiToast("連絡先を保存しました");
    } catch {
      setError("連絡先を保存できませんでした。少し待ってもう一度お試しください。");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (initial === null || JSON.stringify(toPayload(rows)) === lastSaved.current) return;
    const timer = window.setTimeout(() => { void save(rows); }, 1500);
    return () => window.clearTimeout(timer);
  }, [rows, save, initial]);

  // 「保存して戻る」などで自動保存の前に画面を離れたら、正しい入力だけはその場で送っておく
  useEffect(() => () => {
    const current = latest.current;
    const payload = toPayload(current);
    if (JSON.stringify(payload) === lastSaved.current || contactItemsError(filled(current))) return;
    void createClient().rpc("sakaba_save_my_contact_items", { p_items: payload });
  }, []);

  // 読み込みに失敗したときは編集させない（空のまま保存すると、登録済みの連絡先を消してしまうため）
  if (initial === null) {
    return <Window title="れんらく先" className={WINDOW_CLASS}>
      <p role="alert" className="text-sm text-[#c62828]">連絡先を読み込めませんでした。ページを開き直してください。</p>
    </Window>;
  }

  const update = (key: number, patch: Partial<GuildContactItem>) => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
    setError(""); setState("editing");
  };
  const remove = (key: number) => {
    setRows((current) => current.filter((row) => row.key !== key));
    setError(""); setState("editing");
  };
  const add = () => {
    if (rows.length >= MAX_ITEMS) return;
    setRows((current) => [...current, { key: nextKey.current++, kind: "instagram", label: "", value: "", visibility: "members", sort_order: current.length }]);
    setState("editing");
  };

  return <Window title="れんらく先" className={WINDOW_CLASS}>
    <p className="c-muted text-xs leading-relaxed">
      メール・SNS・ウェブサイトを{MAX_ITEMS}件まで載せられます。「つながった人だけ」にしたものは、つながり申請を承諾し合った相手にだけ表示されます。それまでは種類（Instagram など）があることだけが見え、URLやアドレスは渡りません。
    </p>
    {rows.length === 0 && <p className="c-muted mt-4 text-sm">まだ登録されていません。</p>}
    <ul className="mt-4 space-y-3">
      {rows.map((row, index) => <li key={row.key} className="c-card space-y-3 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <select
            aria-label={`${index + 1}件目の種類`}
            value={row.kind}
            onChange={(event) => update(row.key, { kind: event.target.value as ContactItemKind })}
            className="c-input h-11 min-w-0 flex-1"
          >
            {contactKindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => remove(row.key)}
            aria-label={`${contactItemLabel(row)}を削除`}
            title="削除"
            className="c-button-sub h-11 w-11 shrink-0 !p-0"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
          </button>
        </div>
        {row.kind === "other" && <input
          value={row.label}
          maxLength={40}
          onChange={(event) => update(row.key, { label: event.target.value })}
          onKeyDown={stopEnter}
          placeholder="表示名（例：YouTube・予約ページ）"
          aria-label={`${index + 1}件目の表示名`}
          className="c-input h-11"
        />}
        <input
          type={row.kind === "email" ? "email" : "url"}
          inputMode={row.kind === "email" ? "email" : "url"}
          value={row.value}
          maxLength={300}
          onChange={(event) => update(row.key, { value: event.target.value })}
          onKeyDown={stopEnter}
          placeholder={PLACEHOLDER[row.kind]}
          aria-label={`${contactItemLabel(row)}のアドレス`}
          className="c-input h-11"
        />
        <fieldset>
          <legend className="c-muted text-xs">見せる相手</legend>
          <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2">
            {VISIBILITY_OPTIONS.map((option) => <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={`contact-visibility-${row.key}`}
                checked={row.visibility === option.value}
                onChange={() => update(row.key, { visibility: option.value })}
                className="accent-[#1b2a41]"
              />
              {option.label}
            </label>)}
          </div>
        </fieldset>
      </li>)}
    </ul>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      {rows.length < MAX_ITEMS
        ? <button type="button" onClick={add} className="c-button-sub h-11 px-4">＋ 連絡先を追加</button>
        : <p className="c-muted text-xs">{MAX_ITEMS}件まで登録できます。</p>}
      <p role="status" className="c-muted text-xs">
        {state === "saving" ? "保存中…" : state === "editing" || rows.length !== filled(rows).length ? "入力が終わると自動保存します" : state === "saved" && rows.length > 0 ? "保存済み" : ""}
      </p>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-[#c62828]">{error}</p>}
    {state === "error" && error && !contactItemsError(filled(rows)) && <button type="button" onClick={() => void save(rows)} className="c-button-sub mt-2 h-10 px-4 text-sm">もう一度保存する</button>}
  </Window>;
}
