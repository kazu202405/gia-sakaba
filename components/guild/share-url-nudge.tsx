"use client";

// ホームの「共有URLを用意しましょう」。共有URLをまだ使いはじめていない会員にだけ出す（出すかどうかはホームが判断）。
// 「あとで」は3日間だけ隠し、また出る。「使わない」は本人の意思表示で、案内だけが出なくなる
// （マイページの共有URLの窓は残るので、あとからいつでも使える）。使いはじめたときもサーバー側の印で出なくなる。

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";
import { isSnoozed, snoozeUntil, SHARE_NUDGE_STORAGE_KEY } from "@/lib/guild/share-nudge";

export function ShareUrlNudge() {
  // 保存先が読めるまでは出さない（「あとで」を押した人に一瞬出てしまうのを防ぐ）
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // 二重に押されないよう、押した瞬間にかける（stateは反映が遅れるので ref）
  const lock = useRef(false);

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

  async function decline() {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_decline_my_share_nudge", { p_guild_slug: "gia" });
      if (rpcError) throw rpcError;
      setVisible(false);
      uiToast("案内を消しました。使いたくなったら、マイページの共有URLの窓から用意できます");
    } catch {
      setError("保存できませんでした。通信を確認して、もう一度お試しください。");
      lock.current = false;
    } finally {
      setSaving(false);
    }
  }

  return <Window title="紹介してもらうために">
    <p className="text-[15px] leading-relaxed">あなたを紹介してもらうための「共有URL」を、まだ使っていません。</p>
    <p className="c-muted mt-2 text-sm leading-relaxed">LINEなどで貼ってもらうだけで、会員でない方にもステータスが見えます。ボタンを押すとURLが用意され、そのままコピーできます。連絡先・出身地・誕生日は出ません。</p>
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Link href="/guild/me#share" className="rpg-button inline-flex min-h-12 items-center px-5 text-sm">▶ 共有URLを用意する</Link>
      <button type="button" disabled={saving} onClick={later} className="c-button-sub inline-flex min-h-12 items-center px-4 text-sm disabled:opacity-50">あとで</button>
    </div>
    <p className="c-muted mt-3 text-xs leading-relaxed">「あとで」は3日間だけ隠します。
      <button type="button" disabled={saving} onClick={() => void decline()} className="ml-2 underline underline-offset-4 disabled:opacity-50">{saving ? "保存中…" : "使わない"}</button>
      を選ぶと、この案内は出なくなります（マイページからはいつでも使えます）。</p>
    {error && <p role="alert" className="mt-2 text-sm text-[#c62828]">{error}</p>}
  </Window>;
}
