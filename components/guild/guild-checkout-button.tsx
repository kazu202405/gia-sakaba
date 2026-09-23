"use client";

import { useState } from "react";

export function GuildCheckoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/guild/billing/checkout", { method: "POST" });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "決済画面を開けませんでした。");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "決済画面を開けませんでした。");
      setPending(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() => void checkout()}
        className="rpg-button h-12 w-full px-6 text-base disabled:opacity-50 sm:w-auto"
      >
        {pending ? "決済画面を準備中…" : "▶ 有料会員に申し込む"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-[#c62828]">{error}</p>}
    </div>
  );
}
