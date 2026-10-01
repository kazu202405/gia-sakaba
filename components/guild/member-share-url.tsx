"use client";

// 会員のステータスのページ：この人がどんな人かを伝えるときに貼る「この方を知ってもらうURL」（コピーボタン）。
// URLは相手が共有をオンにしていて、すでに作ってあるときだけDBから届く。ないときは、その旨だけ出す。コピーするのはURLだけ。

import Link from "next/link";
import { useState } from "react";
import { shareUrl } from "@/lib/guild/shared-profile";
import { uiToast } from "@/lib/ui-dialog";

// isMe：自分の画面（人からの見え方の確認）。オフのときの文だけ自分向けにする
export function MemberShareUrl({ token, isMe = false }: { token: string | null; isMe?: boolean }) {
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
    <p className="c-label text-base">この方を知ってもらうURL</p>
    <p className="c-muted mt-1 text-xs leading-relaxed">この方がどんな方かを、LINEなどで会員でない方にも伝えられるURLです。貼るだけで、この方が共有を許可している内容が見えます。</p>
    {token
      ? <button type="button" onClick={() => void copy()} className="c-button-sub mt-3 h-11 px-5 text-sm">▶ URLをコピー</button>
      : isMe
        ? <p className="c-muted mt-3 text-sm">いまは共有をオフにしているため、ほかの人には「まだ共有URLを作っていません」と出ます。<Link href="/guild/me#share" className="ml-1 underline underline-offset-4">マイページで入れる</Link></p>
        : <p className="c-muted mt-3 text-sm">この方は、まだ共有URLを作っていません。</p>}
    {error && <p role="alert" className="mt-2 text-sm text-[#c62828]">{error}</p>}
  </div>;
}
