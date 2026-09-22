"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GuildPendingGatheringApplication } from "@/lib/guild/server-data";
import { formatDate, positionLabel } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";

export function LiveGatheringApprovals({ initial }: { initial: GuildPendingGatheringApplication[] }) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [decided, setDecided] = useState<string[]>([]);
  const [error, setError] = useState("");
  const applications = initial.filter((item) => !decided.includes(`${item.quest_id}:${item.user_id}`));

  async function decide(item: GuildPendingGatheringApplication, approve: boolean) {
    if (pendingKey) return;
    const confirmed = await uiConfirm({
      title: approve ? "参加を承認します" : "申し込みを見送ります",
      message: approve
        ? `${item.display_name}さんの参加を承認します。初回の承認は、次回以降の限定の集まりにも適用されます。`
        : `${item.display_name}さんには「今回は見送りになりました」とおしらせします。`,
      okLabel: approve ? "承認する" : "見送る",
      danger: !approve,
    });
    if (!confirmed) return;

    const key = `${item.quest_id}:${item.user_id}`;
    setPendingKey(key); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_decide_gathering_application", {
        p_quest_id: item.quest_id,
        p_user_id: item.user_id,
        p_approve: approve,
      });
      if (rpcError) throw rpcError;
      setDecided((current) => [...current, key]);
      uiToast(approve ? "参加を承認し、本人に知らせました" : "申し込みを見送り、本人に知らせました");
      router.refresh();
    } catch {
      setError("申し込みを更新できませんでした。画面を読み直してもう一度お試しください。");
    } finally {
      setPendingKey(null);
    }
  }

  return <Window title="集まりの申し込み" action={<span className="c-muted text-xs">承認待ち {applications.length}件</span>}>
    <p className="c-muted mb-4 text-xs leading-relaxed">はじめて申し込んだ人だけが並びます。承認または見送りの結果は、本人のおしらせに届きます。</p>
    {error && <p role="alert" className="mb-4 text-sm text-[#c62828]">{error}</p>}
    {applications.length === 0 ? <p className="c-muted text-sm">承認待ちはありません。</p> :
      <ul className="space-y-4">{applications.map((item) => {
        const key = `${item.quest_id}:${item.user_id}`;
        return <li key={key} className="c-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link href={`/guild/members/${item.user_id}`} className="text-base underline underline-offset-4">{item.display_name}</Link>
            <span className="c-muted text-xs">{formatDate(item.created_at)}に申し込み</span>
          </div>
          <p className="c-muted mt-1 text-xs">{item.company_name}・{positionLabel[item.position]}</p>
          {item.position === "other" && <p className="c-chip mt-2 inline-block text-xs">役職が「その他」です。経営者か確認してください</p>}
          <p className="mt-3 text-sm"><Link href={`/guild/quests/${item.quest_id}`} className="underline underline-offset-4">{item.quest_title}</Link></p>
          {item.message && <p className="mt-3 whitespace-pre-line break-words text-sm">申込時のひとこと：{item.message}</p>}
          {item.want_to_solve && <p className="c-muted mt-2 break-words text-xs">いま解決したいこと：{item.want_to_solve}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={pendingKey !== null} onClick={() => void decide(item, true)} className="rpg-button h-11 px-5 text-sm disabled:opacity-50">{pendingKey === key ? "処理中…" : "▶ 承認する"}</button>
            <button type="button" disabled={pendingKey !== null} onClick={() => void decide(item, false)} className="c-button-sub h-11 px-5 text-sm disabled:opacity-50">見送る</button>
          </div>
        </li>;
      })}</ul>}
  </Window>;
}
