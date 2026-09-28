"use client";

import { useState } from "react";
import { formatScheduleShort, fromJstInputValue, toJstInputValue } from "@/lib/guild/gathering-schedule";
import { MEAL_AVAILABILITY_LIMIT, MEAL_AVAILABILITY_NOTE_LIMIT, type MealAvailability } from "@/lib/guild/meal-availability";

export function MealAvailabilityEditor({ initial }: { initial: MealAvailability[] }) {
  const [slots, setSlots] = useState(initial);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function add() {
    if (pending) return;
    const starts_at = fromJstInputValue(start);
    const ends_at = fromJstInputValue(end);
    if (!starts_at || !ends_at || new Date(ends_at).getTime() - new Date(starts_at).getTime() < 30 * 60000) {
      setError("開始と終了を入力してください。終了は開始より30分以上後にしてください。"); return;
    }
    setPending("add"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/guild/meal-availability", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starts_at, ends_at, note }),
      });
      const result = await response.json() as { slot?: MealAvailability; error?: string };
      if (!response.ok || !result.slot) throw new Error(result.error || "保存できませんでした。");
      setSlots((current) => [...current, result.slot!].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      setStart(""); setEnd(""); setNote(""); setMessage("空き日時を登録しました。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存できませんでした。");
    } finally { setPending(null); }
  }

  async function remove(id: string) {
    if (pending) return;
    setPending(id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/guild/meal-availability", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      const result = await response.json() as { deleted?: boolean; error?: string };
      if (!response.ok || !result.deleted) throw new Error(result.error || "削除できませんでした。");
      setSlots((current) => current.filter((slot) => slot.id !== id));
      setMessage("空き日時を削除しました。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "削除できませんでした。");
    } finally { setPending(null); }
  }

  return <div className="space-y-5">
    <p className="text-sm leading-relaxed">会食を組めそうな日時を登録できます。候補はあなたと管理者だけに見えます。登録しただけで会食は確定しません。</p>
    {slots.length === 0 ? <p className="c-muted text-sm">まだ空き日時はありません。</p> : <ul className="space-y-2">
      {slots.map((slot) => <li key={slot.id} className="c-card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="min-w-0 text-sm"><span className="tabular-nums">{formatScheduleShort(slot.starts_at)} ～ {toJstInputValue(slot.ends_at).slice(11)}</span>
          {slot.note && <p className="c-muted mt-1 break-words text-xs">{slot.note}</p>}</div>
        <button type="button" disabled={pending !== null} onClick={() => void remove(slot.id)} className="c-button-sub min-h-10 px-3 text-xs disabled:opacity-50">{pending === slot.id ? "削除中…" : "削除"}</button>
      </li>)}
    </ul>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">空いている時間の開始<input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} className="c-input c-date mt-1" /></label>
      <label className="block text-sm">終了<input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} className="c-input c-date mt-1" /></label>
    </div>
    <label className="block text-sm">ひとこと（任意）<input type="text" value={note} onChange={(event) => setNote(event.target.value)} maxLength={MEAL_AVAILABILITY_NOTE_LIMIT} placeholder="例：梅田周辺なら参加しやすいです" className="c-input mt-1" /></label>
    <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={pending !== null || !start || !end || slots.length >= MEAL_AVAILABILITY_LIMIT} onClick={() => void add()} className="rpg-button min-h-11 px-5 text-sm disabled:opacity-50">{pending === "add" ? "追加中…" : "▶ 空き日時を追加"}</button><span className="c-muted text-xs">{slots.length}/{MEAL_AVAILABILITY_LIMIT}件・今後180日以内</span></div>
    {message && <p role="status" className="text-sm">{message}</p>}
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
  </div>;
}
