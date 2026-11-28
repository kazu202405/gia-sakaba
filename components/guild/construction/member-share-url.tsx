"use client";

// 建設・不動産の店：メンバーのプロフィールの「紹介のためのURL」。酒場の MemberShareUrl と同じ動き（URLだけコピー）を、sn- の静かな見た目で出す。

import Link from "next/link";
import { useState } from "react";
import { shareUrl } from "@/lib/guild/shared-profile";
import { uiToast } from "@/lib/ui-dialog";
import { useGuildStore } from "@/components/guild/store-context";

export function ConstructionShareUrl({ token, isMe = false }: { token: string | null; isMe?: boolean }) {
  const store = useGuildStore();
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

  return <section className="sn-sec sn-mp-share">
    <div className="sn-sec-h"><h2>紹介のためのURL</h2></div>
    <p className="sn-meta">この方がどんな方かを伝えたいときに、LINEなどに貼るURLです。会員でない方にも、この方が共有を許可している内容が見えます。</p>
    {token
      ? <button type="button" onClick={() => void copy()} className="sn-btn">URLをコピー</button>
      : isMe
        ? <p className="sn-mp-muted">いまは共有をオフにしているため、ほかの人には「まだ共有URLを作っていません」と出ます。<Link href={store.path("/me#share")}>マイページで入れる</Link></p>
        : <p className="sn-mp-muted">この方は、まだ共有URLを作っていません。</p>}
    {error && <p role="alert" className="sn-error">{error}</p>}
  </section>;
}
