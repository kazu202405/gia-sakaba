"use client";

import { useState } from "react";

type Props = { label: string };

export function GuildBillingPortalButton({ label }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/guild/billing/portal?from=me", { method: "POST" });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "支払い管理を開けませんでした。");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "支払い管理を開けませんでした。");
      setPending(false);
    }
  }

  return <>
    <button type="button" disabled={pending} aria-busy={pending} onClick={() => void openPortal()} className="c-button-sub h-11 px-5 text-sm disabled:opacity-50">
      {pending ? "開いています…" : label}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-[#c62828]">{error}</p>}
  </>;
}
