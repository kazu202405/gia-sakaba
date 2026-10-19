"use client";

// 届いたステータスの下書きを、本人が見て選ぶ画面。承認の入口はここ1か所（おしらせ・入会後のどちらからも来る）。
//   このまま載せる／なおしてから載せる（編集画面に下書きを入れて開く）／いらない
// 本人がすでに書いた項目は上書きしない。画面でも「すでに書いてあるので入れません」と見せる。

import { useRef, useState } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import { createClient } from "@/lib/supabase/client";
import { DRAFT_FIELDS, draftFieldLabel, type MyProfileDraft } from "@/lib/guild/profile-drafts";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";

type Action = "apply" | "edit" | "decline";

export function ProfileDraftReview({ draft }: { draft: MyProfileDraft }) {
  const router = useGuildRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");
  // 2度押しの錠は押した瞬間にかける。移動するまでは外さない（移る前にまた押せてしまうため）
  const lockRef = useRef(false);

  const rows = DRAFT_FIELDS.filter((key) => draft.fields[key].trim() !== "").map((key) => ({
    key, text: draft.fields[key], taken: draft.filled.includes(key),
  }));
  const applicable = rows.filter((row) => !row.taken).length;

  async function decide(decision: "apply" | "decline") {
    if (lockRef.current) return;
    if (decision === "decline" && !(await uiConfirm({
      title: "この下書きを使いません",
      message: "下書きは消えます。あとから同じ内容を見ることはできません。書いた人には「載せませんでした」と伝わります。",
      okLabel: "使わない", danger: true,
    }))) return;
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(decision); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_decide_my_profile_draft", { p_draft_id: draft.id, p_decision: decision });
      if (rpcError) throw rpcError;
      uiToast(decision === "apply" ? "ステータスに載せました" : "下書きは載せませんでした");
      router.push(decision === "apply" ? "/guild/me" : "/guild");
      router.refresh();
    } catch {
      setError("できませんでした。すでに選んだ下書きかもしれません。画面を読み直して、もう一度お試しください。");
      lockRef.current = false;
      setBusy(null);
    }
  }

  function edit() {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy("edit");
    router.push(`/guild/me/status?draft=${encodeURIComponent(draft.id)}`);
  }

  const disabled = busy !== null;
  return <div className="space-y-7">
    <Window title="下書きの内容">
      <p className="text-sm leading-relaxed">{draft.drafted_by_name}さんが、あなたのステータスの下書きを書きました。<strong>あなたが「載せる」を選ぶまで、ほかのメンバーには見えません。</strong></p>
      <ul className="mt-5 space-y-4">
        {rows.map((row) => <li key={row.key} className="c-card min-w-0 p-4">
          <p className="c-label text-sm">{draftFieldLabel[row.key]}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{row.text}</p>
          {row.taken && <p className="c-muted mt-2 text-xs">すでに書いてあるので入れません（いまの内容のまま残ります）</p>}
        </li>)}
      </ul>
      {applicable === 0 && <p className="c-muted mt-4 text-sm">下書きの項目はどれも、すでに書いてあります。載せても何も変わらないので、「いらない」を選んでください。</p>}
    </Window>
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
    <div className="flex flex-wrap gap-3">
      {applicable > 0 && <button type="button" disabled={disabled} aria-busy={busy === "apply"} onClick={() => void decide("apply")} className="rpg-button min-h-12 px-6 text-base disabled:opacity-50">{busy === "apply" ? "載せています…" : "▶ このまま載せる"}</button>}
      {applicable > 0 && <button type="button" disabled={disabled} aria-busy={busy === "edit"} onClick={edit} className="c-button-sub min-h-12 px-6 text-base disabled:opacity-50">{busy === "edit" ? "開いています…" : "なおしてから載せる"}</button>}
      <button type="button" disabled={disabled} aria-busy={busy === "decline"} onClick={() => void decide("decline")} className="c-button-sub min-h-12 px-6 text-base disabled:opacity-50">{busy === "decline" ? "処理しています…" : "いらない"}</button>
    </div>
  </div>;
}
