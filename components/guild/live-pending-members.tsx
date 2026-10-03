"use client";

// 管理画面の「参加の申請」（役職「その他」で入会を申請した人・0126）。オーナーだけに出る。
// - 承認 → すぐ普通の会員になる／見送り → 本人は入れないまま。招待した人には何も知らせない
// - 見送るはアプリ内モーダル（赤ボタン「見送る」）。押した瞬間に錠をかけ、一覧が読み直されるまで外さない

import { useEffect, useRef, useState } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import { hasApplicationDetail, type PendingMember } from "@/lib/guild/approval";
import { formatDate } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";

// 一覧の読み直しが返ってこなくても、ボタンが押せないままにならないための上限
const UNLOCK_FALLBACK_MS = 8000;

export function LivePendingMembers({ initial }: { initial: PendingMember[] }) {
  const router = useGuildRouter();
  // 錠は押した瞬間に ref でかける（state は反映が遅れるので、続けて押されると2回通ってしまう）
  const lockRef = useRef(false);
  const fallbackTimer = useRef<number | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [decided, setDecided] = useState<string[]>([]);
  const [error, setError] = useState("");
  const members = initial.filter((item) => !decided.includes(item.user_id));

  function unlock() {
    if (fallbackTimer.current !== null) { window.clearTimeout(fallbackTimer.current); fallbackTimer.current = null; }
    lockRef.current = false;
    setBusyKey(null);
  }

  // 一覧が読み直された（props が入れ替わった）ら錠を外す。保存の応答が返った瞬間には外さない
  useEffect(() => { unlock(); }, [initial]);
  useEffect(() => () => { if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current); }, []);

  async function decide(item: PendingMember, approve: boolean) {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusyKey(`${item.user_id}:${approve ? "approve" : "decline"}`);
    setError("");
    if (!approve) {
      const confirmed = await uiConfirm({
        title: "参加の申請を見送ります",
        message: `${item.display_name}さんは、酒場に入れないままになります。招待した人には知らせません。`,
        okLabel: "見送る",
        danger: true,
      });
      if (!confirmed) { unlock(); return; }
    }
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_decide_pending_member", {
        p_user_id: item.user_id,
        p_approve: approve,
        p_guild_slug: "gia",
      });
      if (rpcError) throw rpcError;
      setDecided((current) => [...current, item.user_id]);
      uiToast(approve ? `${item.display_name}さんを承認しました。すぐ会員になります` : `${item.display_name}さんの申請を見送りました`);
      fallbackTimer.current = window.setTimeout(unlock, UNLOCK_FALLBACK_MS);
      router.refresh();
    } catch {
      setError("申請を更新できませんでした。画面を読み直してもう一度お試しください。");
      unlock();
    }
  }

  return <Window title="参加の申請" action={<span className="c-muted text-xs">承認待ち {members.length}件</span>}>
    <p className="c-muted mb-4 text-xs leading-relaxed">役職を「その他」で選んだ人が並びます。承認するまで、本人は酒場の中を見られません。承認・見送りの結果は、招待した人には知らせません。</p>
    {error && <p role="alert" className="mb-4 text-sm text-[#c62828]">{error}</p>}
    {members.length === 0 ? <p className="c-muted text-sm">承認待ちはありません。</p> :
      <ul className="space-y-4">{members.map((item) => {
        const approveKey = `${item.user_id}:approve`;
        return <li key={item.user_id} className="c-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="text-base break-words">{item.display_name}</span>
            <span className="c-muted text-xs">{formatDate(item.applied_at)}に申請</span>
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex gap-2"><dt className="c-muted w-24 shrink-0 text-xs leading-6">会社名</dt><dd className="min-w-0 break-words">{item.company_name}</dd></div>
            {hasApplicationDetail(item) ? <>
              <div className="flex gap-2"><dt className="c-muted w-24 shrink-0 text-xs leading-6">役職</dt><dd className="min-w-0 break-words">{item.other_position_title}</dd></div>
              <div className="flex gap-2"><dt className="c-muted w-24 shrink-0 text-xs leading-6">お仕事の内容</dt><dd className="min-w-0 whitespace-pre-line break-words">{item.other_work_summary}</dd></div>
            </> : <p className="c-muted text-xs">集まりのゲストから参加した人です。役職・お仕事の内容は聞いていません。</p>}
            <div className="flex gap-2"><dt className="c-muted w-24 shrink-0 text-xs leading-6">招待した人</dt><dd className="min-w-0 break-words">{item.invited_by_name || "—"}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={busyKey !== null} aria-busy={busyKey === approveKey} onClick={() => void decide(item, true)} className="rpg-button h-11 px-5 text-sm disabled:opacity-50">{busyKey === approveKey ? "処理中…" : "▶ 承認する"}</button>
            <button type="button" disabled={busyKey !== null} onClick={() => void decide(item, false)} className="c-button-sub h-11 px-5 text-sm disabled:opacity-50">{busyKey === `${item.user_id}:decline` ? "処理中…" : "見送る"}</button>
          </div>
        </li>;
      })}</ul>}
  </Window>;
}
