"use client";

// メンバーの詳しい画面（オーナー・マスターにだけ出す）：その人のステータスの下書きを書いて届ける。
// 届いた下書きは、本人が「見る」画面で選ぶまで誰にも見えない。載せられるのは本人だけ（0130）。

import { useRef, useState } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import { createClient } from "@/lib/supabase/client";
import { draftHasContent, draftRpcArgs, emptyDraftFields, validateProfileDraft, type DraftState, type MemberProfileDraft } from "@/lib/guild/profile-drafts";
import { uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";
import { ProfileDraftInputs } from "./profile-draft-fields";

const stateText: Record<DraftState, string> = {
  waiting: "本人の返事を待っています。書き直して届けると、いまの下書きに置き換わります。",
  applied: "本人が、下書きをステータスに載せました。新しく書いて届けることもできます。",
  declined: "本人は、前回の下書きを載せませんでした。新しく書いて届けることもできます。",
};

export function LiveMemberProfileDraft({ memberId, memberName, initial }: { memberId: string; memberName: string; initial: MemberProfileDraft | null }) {
  const router = useGuildRouter();
  const [fields, setFields] = useState(initial?.state === "waiting" && initial.fields ? initial.fields : emptyDraftFields);
  const [state, setState] = useState<DraftState | null>(initial?.state ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // 2度押しの錠は押した瞬間にかける（state は反映が遅れるので ref）
  const lockRef = useRef(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (lockRef.current) return;
    if (!draftHasContent(fields)) { setError("どれか1つは書いてください。"); return; }
    const issue = validateProfileDraft(fields);
    if (issue) { setError(issue); return; }
    lockRef.current = true;
    setSaving(true); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_save_member_profile_draft", {
        p_guild_slug: "gia", p_member_id: memberId, ...draftRpcArgs(fields),
      });
      if (rpcError) throw rpcError;
      setState("waiting");
      uiToast("下書きを届けました。LINEでも「下書きしたので見てね」と伝えてください");
      router.refresh();
    } catch {
      setError("下書きを届けられませんでした。時間をおいて、もう一度お試しください。");
    } finally {
      lockRef.current = false;
      setSaving(false);
    }
  }

  return <Window title="ステータスの下書き">
    <p className="text-sm leading-relaxed">{memberName}さんの代わりに、ステータスの中身を下書きできます。本人が見て「載せる」を選ぶまで、ほかのメンバーには見えません。本人が書いている項目は上書きしません。</p>
    {state && <p role="status" className="c-card mt-4 px-3 py-2 text-sm">{stateText[state]}</p>}
    <form onSubmit={(event) => void send(event)} className="mt-5 space-y-5">
      <ProfileDraftInputs value={fields} onChange={(next) => { setFields(next); setError(""); }} />
      {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
      <button type="submit" disabled={saving} aria-busy={saving} className="rpg-button min-h-11 px-5 text-sm disabled:opacity-50">{saving ? "届けています…" : state === "waiting" ? "▶ 書き直して届ける" : "▶ 下書きを届ける"}</button>
    </form>
  </Window>;
}
