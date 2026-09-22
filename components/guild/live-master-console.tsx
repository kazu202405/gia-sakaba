"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GuildIntroRequest } from "@/lib/guild/server-data";
import type { IntroOutcome, IntroStatus, Profile } from "@/lib/guild/types";
import { formatDate, introStatusLabel, outcomeLabel, purposeLabel } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";

type Group = "inbox" | "proposed" | "connected" | "closed";
const GROUPS: { key: Group; label: string; statuses: IntroStatus[] }[] = [
  { key: "inbox", label: "とどいた", statuses: ["requested", "reviewing"] },
  { key: "proposed", label: "だしん中", statuses: ["proposed"] },
  { key: "connected", label: "つないだ", statuses: ["accepted", "introduced"] },
  { key: "closed", label: "おわり", statuses: ["declined_by_master", "declined_by_target", "expired", "redirected", "cancelled"] },
];
const OUTCOMES: IntroOutcome[] = ["met", "working", "no_fit"];

export function LiveMasterConsole({ initial, members }: { initial: GuildIntroRequest[]; members: Profile[] }) {
  const router = useRouter();
  const [group, setGroup] = useState<Group>("inbox");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<IntroOutcome | null>(null);
  const [error, setError] = useState("");
  const names = new Map(members.map((member) => [member.id, member.display_name]));
  const current = GROUPS.find((item) => item.key === group)!;
  const visible = initial.filter((request) => current.statuses.includes(request.status));
  const introducedCount = initial.filter((request) => request.status === "introduced").length;
  const workingCount = initial.filter((request) => request.outcome === "working").length;

  async function act(request: GuildIntroRequest, action: "propose" | "decline_master" | "introduced") {
    if (pendingId) return;
    const confirmed = await uiConfirm({
      title: action === "propose" ? "相手に打診します" : action === "decline_master" ? "この依頼を見送ります" : "紹介済みにします",
      message: action === "propose"
        ? `${names.get(request.target_id) ?? "相手"}さんへ紹介を打診します。承諾されるまで連絡先は表示されません。`
        : action === "decline_master" ? "依頼者には『今回は見送りになりました』と表示されます。" : "お二人がつながったことを記録します。",
      okLabel: action === "propose" ? "打診する" : action === "decline_master" ? "見送る" : "紹介済みにする",
    });
    if (!confirmed) return;
    setPendingId(request.id); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_act_on_intro_request", {
        p_request_id: request.id, p_action: action,
      });
      if (rpcError) throw rpcError;
      uiToast(action === "propose" ? "相手に打診しました" : action === "decline_master" ? "見送りにしました" : "紹介済みにしました");
      router.refresh();
    } catch {
      setError("更新できませんでした。画面を読み直してもう一度お試しください。");
    } finally {
      setPendingId(null);
    }
  }

  async function setOutcome(request: GuildIntroRequest, outcome: IntroOutcome) {
    if (pendingId || request.outcome === outcome) return;
    setPendingId(request.id); setPendingOutcome(outcome); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_set_intro_outcome", {
        p_request_id: request.id, p_outcome: outcome,
      });
      if (rpcError) throw rpcError;
      uiToast(`「${outcomeLabel[outcome]}」と記録しました`);
      router.refresh();
    } catch {
      setError("結果を記録できませんでした。画面を読み直してもう一度お試しください。");
    } finally {
      setPendingId(null);
      setPendingOutcome(null);
    }
  }

  return <div>
    {error && <p role="alert" className="mb-4 text-sm text-[#c62828]">{error}</p>}
    <p className="mb-4 text-sm">これまでに紹介した <span className="text-xl tabular-nums">{introducedCount}</span>件<span className="c-muted mx-2">／</span>仕事になった <span className="text-xl tabular-nums">{workingCount}</span>件</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{GROUPS.map((item) => <button key={item.key} type="button" aria-pressed={group === item.key} onClick={() => setGroup(item.key)} className="c-choice border-3 p-3 text-left sm:p-4"><span className="block text-sm">{item.label}</span><span className="mt-1 block text-3xl tabular-nums">{initial.filter((request) => item.statuses.includes(request.status)).length}</span></button>)}</div>
    <div className="mt-8 space-y-4">{visible.length === 0 ? <p className="c-card border-dashed px-4 py-10 text-center text-sm">「{current.label}」の依頼はありません</p> : visible.map((request) => <article key={request.id} className="c-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="c-chip">{introStatusLabel[request.status].master}</span><span className="c-muted text-xs">{formatDate(request.created_at)}</span></div>
      <p className="mt-3 break-words text-sm"><Link href={`/guild/members/${request.requester_id}`} className="underline underline-offset-2">{names.get(request.requester_id) ?? "メンバー"}</Link><span className="mx-2">→</span><Link href={`/guild/members/${request.target_id}`} className="underline underline-offset-2">{names.get(request.target_id) ?? "メンバー"}</Link></p>
      <p className="c-muted mt-1 text-xs">{purposeLabel[request.purpose]}</p>
      {request.message && <p className="mt-3 border-2 border-dashed border-[#1b2a41]/30 px-3 py-2 text-sm break-words">{request.message}</p>}
      {(request.status === "requested" || request.status === "reviewing") && <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pendingId !== null} onClick={() => void act(request, "propose")} className="rpg-button h-11 disabled:opacity-50">{pendingId === request.id ? "更新中…" : "▶ 相手に打診"}</button><button type="button" disabled={pendingId !== null} onClick={() => void act(request, "decline_master")} className="c-button-sub h-11 disabled:opacity-50">見送る</button></div>}
      {request.status === "proposed" && <p className="c-muted mt-4 text-xs">相手の返事を待っています。</p>}
      {request.status === "accepted" && <div className="mt-4 flex flex-wrap items-center gap-3"><p className="c-muted text-xs">お二人には連絡先が表示されています。</p><button type="button" disabled={pendingId !== null} onClick={() => void act(request, "introduced")} className="rpg-button h-11 disabled:opacity-50">{pendingId === request.id ? "更新中…" : "▶ 紹介済みにする"}</button></div>}
      {request.status === "introduced" && <div className="mt-4 border-t-2 border-dashed border-[#1b2a41]/20 pt-4"><p className="c-muted text-xs">紹介後、どうなりましたか？</p><div className="mt-2 flex flex-wrap gap-2">{OUTCOMES.map((outcome) => <button key={outcome} type="button" aria-pressed={request.outcome === outcome} disabled={pendingId !== null} onClick={() => void setOutcome(request, outcome)} className="c-choice min-h-11 px-3 text-sm disabled:opacity-50">{pendingId === request.id && pendingOutcome === outcome ? "記録中…" : outcomeLabel[outcome]}</button>)}</div></div>}
    </article>)}</div>
  </div>;
}
