"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";

export function LiveQuestOwnerActions({ questId, questTerm, applicantCount, gathering }: {
  questId: string;
  questTerm: string;
  applicantCount: number;
  gathering: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function withdraw() {
    if (busy) return;
    const confirmed = await uiConfirm({
      title: `${questTerm}を取り下げます`,
      message: applicantCount > 0
        ? `掲示板から消え、参加希望者${applicantCount}人におしらせが届きます。進行中の紹介依頼も取り消されます。`
        : "掲示板から消えます。進行中の紹介依頼があれば取り消されます。",
      okLabel: "取り下げる",
      danger: true,
    });
    if (!confirmed) return;
    setBusy(true);
    setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_withdraw_quest", { p_quest_id: questId });
      if (rpcError) throw rpcError;
      uiToast(`${questTerm}を取り下げました`);
      router.push(gathering ? "/guild/master" : "/guild/quests");
      router.refresh();
    } catch {
      setError("取り下げられませんでした。画面を読み直して再度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  return <div className="c-dashed-top mt-8 space-y-3 pt-6">
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <Link href={`/guild/quests/${questId}/edit`} className="c-button-sub inline-flex h-11 items-center px-4 text-sm">内容をなおす</Link>
      {!gathering && <span className="c-muted text-xs">参加希望 {applicantCount}人・確認画面は準備中</span>}
      <button type="button" onClick={() => void withdraw()} disabled={busy} className="c-muted ml-auto text-xs underline underline-offset-4 disabled:opacity-50">{busy ? "取り下げ中…" : `この${questTerm}を取り下げる`}</button>
    </div>
  </div>;
}
