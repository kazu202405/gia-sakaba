"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { GuestGatheringHost as GuestGatheringHostData } from "@/lib/guild/guest-gathering";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";

export function GuestGatheringHost({ questId, initial }: { questId: string; initial: GuestGatheringHostData }) {
  const router = useRouter();
  const [localToken, setLocalToken] = useState<{ baseline: string | null; value: string } | null>(null);
  const token = localToken?.baseline === initial.token ? localToken.value : initial.token;
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const href = token ? `/e/${token}` : null;

  async function publish(rotate: boolean) {
    if (busy) return;
    if (rotate) {
      const confirmed = await uiConfirm({
        title: "招待リンクを作り直します",
        message: "以前のリンクは使えなくなります。申込済みの人の情報は残ります。",
        okLabel: "作り直す",
      });
      if (!confirmed) return;
    }
    setBusy(true); setError("");
    const { data, error: rpcError } = await createClient().rpc("sakaba_publish_guest_gathering", {
      p_quest_id: questId, p_rotate: rotate,
    });
    setBusy(false);
    if (rpcError || typeof data !== "string") { setError("招待リンクを作れませんでした。募集状況を確認して、再度お試しください。"); return; }
    setLocalToken({ baseline: initial.token, value: data });
    uiToast(rotate ? "招待リンクを作り直しました" : "招待リンクを作りました");
    router.refresh();
  }

  async function copy() {
    if (!href) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}${href}`); uiToast("招待リンクをコピーしました"); }
    catch { setError("コピーできませんでした。下のURLを選択してコピーしてください。"); }
  }

  return <Window title="ゲスト向け招待リンク">
    <p className="text-sm leading-relaxed">この集まりはクエスト掲示板には出ません。URLを送った人は、会員でなくても内容と、掲載に同意した申込者の紹介を見られます。</p>
    {!href ? <button type="button" disabled={busy} onClick={() => void publish(false)} className="rpg-button mt-5 min-h-12 px-5 disabled:opacity-50">{busy ? "作成中…" : "▶ 招待リンクを作る"}</button> : <div className="mt-5 space-y-3">
      <label className="block text-sm">共有するURL<input readOnly value={`${origin}${href}`} onFocus={(e) => e.currentTarget.select()} className="c-input mt-2 w-full text-xs" /></label>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => void copy()} className="rpg-button min-h-11 px-4">▶ URLをコピー</button>
        <Link href={href} target="_blank" rel="noopener noreferrer" className="c-button-sub inline-flex min-h-11 items-center px-4">招待ページを見る ↗</Link>
        <button type="button" disabled={busy} onClick={() => void publish(true)} className="c-muted min-h-11 text-xs underline disabled:opacity-50">リンクを作り直す</button>
      </div>
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-[#c62828]">{error}</p>}
    {initial.guests.length > 0 && <div className="c-dashed-top mt-6 pt-5">
      <h3 className="text-base">ゲスト申込 {initial.guests.length}人</h3>
      <p className="c-muted mt-1 text-xs">メールアドレスは主催者だけに表示します。参加者向けページには出ません。</p>
      <ul className="mt-4 space-y-3">{initial.guests.map((guest) => <li key={guest.email} className="c-card px-4 py-3 text-sm">
        <p className="c-label">{guest.name}</p>
        <p className="mt-1 break-all">{guest.email}</p>
        {guest.introduction && <p className="c-muted mt-2 whitespace-pre-line break-words">{guest.introduction}</p>}
        <p className="c-muted mt-1 text-xs">{guest.show_introduction ? "参加者向けページに紹介を表示" : "紹介は非表示"}</p>
      </li>)}</ul>
    </div>}
  </Window>;
}
