"use client";

// 会員のステータスのページ：この人を紹介するときに貼る「紹介のためのURL」（コピーボタン）。
// URLは相手が共有をオンにしていて、すでに作ってあるときだけDBから届く。ないときは、その旨だけ出す。コピーするのはURLだけ。

import { useState } from "react";
import { shareUrl } from "@/lib/guild/shared-profile";
import { uiToast } from "@/lib/ui-dialog";

export function MemberShareUrl({ token }: { token: string | null }) {
  const [error, setError] = useState("");

  async function copy() {
    if (!token) return;
    setError("");
    try {
      await navigator.clipboard.writeText(shareUrl(window.location.origin, token));
      uiToast("URLをコピーしました");
    } catch {
      setError("コピーできませんでした。もう一度お試しください。");
    }
  }

  return <div className="c-dashed-top mt-5 pt-5">
    <p className="c-label text-base">紹介のためのURL</p>
    <p className="c-muted mt-1 text-xs leading-relaxed">LINEなどで、この方を紹介するときに貼るURLです。会員でない方にも、この方が共有している内容が見えます。</p>
    {token
      ? <button type="button" onClick={() => void copy()} className="c-button-sub mt-3 h-11 px-5 text-sm">▶ URLをコピー</button>
      : <p className="c-muted mt-3 text-sm">この方は、まだ共有URLを作っていません。</p>}
    {error && <p role="alert" className="mt-2 text-sm text-[#c62828]">{error}</p>}
  </div>;
}
