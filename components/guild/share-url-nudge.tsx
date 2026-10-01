"use client";

// ホームの「共有URLを作りましょう」。共有URLをまだ使いはじめていない会員にだけ出す（出すかどうかはホームが判断）。
// 「二度と表示しない」は付けない（気づいてもらうのが目的）。「あとで」は3日間だけ隠し、また出る。
// 使いはじめた（コピー・確認・設定変更）と、サーバー側の印で自然に出なくなる。

import Link from "next/link";
import { useEffect, useState } from "react";
import { Window } from "./cards";
import { isSnoozed, snoozeUntil, SHARE_NUDGE_STORAGE_KEY } from "@/lib/guild/share-nudge";

export function ShareUrlNudge() {
  // 保存先が読めるまでは出さない（「あとで」を押した人に一瞬出てしまうのを防ぐ）
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raw: string | null = null;
    try { raw = window.localStorage.getItem(SHARE_NUDGE_STORAGE_KEY); } catch { /* 読めなければ出す */ }
    setVisible(!isSnoozed(raw, Date.now()));
  }, []);

  if (!visible) return null;

  function later() {
    setVisible(false);
    try { window.localStorage.setItem(SHARE_NUDGE_STORAGE_KEY, String(snoozeUntil(Date.now()))); } catch { /* 保存できなくても、この画面では消える */ }
  }

  return <Window title="紹介してもらうために">
    <p className="text-[15px] leading-relaxed">あなたを紹介してもらうための「共有URL」を、まだ使っていません。</p>
    <p className="c-muted mt-2 text-sm leading-relaxed">LINEなどで貼ってもらうだけで、会員でない方にもステータスが見えます。ボタンを押すとURLが用意され、そのままコピーできます。連絡先・出身地・誕生日は出ません。</p>
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Link href="/guild/me#share" className="rpg-button inline-flex min-h-12 items-center px-5 text-sm">▶ 共有URLを用意する</Link>
      <button type="button" onClick={later} className="c-button-sub inline-flex min-h-12 items-center px-4 text-sm">あとで</button>
    </div>
    <p className="c-muted mt-2 text-xs">「あとで」は3日間だけ隠します。</p>
  </Window>;
}
