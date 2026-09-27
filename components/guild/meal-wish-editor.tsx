"use client";

import { useState } from "react";
import { MEAL_WISH_MAX_LENGTH } from "@/lib/guild/meal-wishes";

export function MealWishEditor({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const [savedText, setSavedText] = useState(initialText);
  const [pending, setPending] = useState<"save" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    if (pending) return;
    setPending("save"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/guild/meal-wish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wish_text: text }),
      });
      const result = await response.json() as { wish_text?: string; error?: string };
      if (!response.ok || !result.wish_text) throw new Error(result.error || "保存できませんでした。");
      setText(result.wish_text); setSavedText(result.wish_text);
      setMessage("会食の希望を保存しました。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存できませんでした。");
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    if (pending) return;
    setPending("delete"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/guild/meal-wish", { method: "DELETE" });
      const result = await response.json() as { deleted?: boolean; error?: string };
      if (!response.ok || !result.deleted) throw new Error(result.error || "削除できませんでした。");
      setText(""); setSavedText(""); setConfirmDelete(false);
      setMessage("会食の希望を削除しました。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "削除できませんでした。");
    } finally {
      setPending(null);
    }
  }

  return <div className="space-y-4">
    <label htmlFor="meal-wish" className="block text-sm">会って話したい人や、話してみたいテーマ</label>
    <textarea id="meal-wish" value={text} onChange={(event) => setText(event.target.value)} maxLength={MEAL_WISH_MAX_LENGTH}
      rows={7} className="c-input w-full resize-y p-3 text-[15px] leading-relaxed" placeholder="例：地域で新しい仕事を始めた経営者と、採用の工夫について話したいです。" />
    <p className="c-muted text-xs">自由に書けます。見られるのはあなたとギルドマスターだけです。{text.length}/{MEAL_WISH_MAX_LENGTH}字</p>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={pending !== null || !text.trim() || text.trim() === savedText} onClick={() => void save()}
        className="rpg-button min-h-11 px-5 text-sm disabled:opacity-50">{pending === "save" ? "保存中…" : savedText ? "▶ 希望を書き直す" : "▶ 希望を送る"}</button>
      {savedText && !confirmDelete && <button type="button" disabled={pending !== null} onClick={() => setConfirmDelete(true)} className="c-button-sub min-h-11 px-4 text-sm disabled:opacity-50">希望を削除</button>}
      {confirmDelete && <div className="flex flex-wrap items-center gap-2 text-sm"><span>この希望を削除しますか？</span><button type="button" disabled={pending !== null} onClick={() => void remove()} className="c-button-sub min-h-10 px-3 disabled:opacity-50">{pending === "delete" ? "削除中…" : "削除する"}</button><button type="button" disabled={pending !== null} onClick={() => setConfirmDelete(false)} className="c-button-sub min-h-10 px-3">やめる</button></div>}
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
  </div>;
}
