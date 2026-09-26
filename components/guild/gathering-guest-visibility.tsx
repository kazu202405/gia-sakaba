"use client";

// 招待URLの集まりで「申し込んだゲストに、自分のプロフィールを見せるか」を切り替える（その場で保存）。
// 見せるのは名前・アイコン・写真・職業・業種・地域・ひとこと・仕事内容・おもい・つながり・紹介状。連絡先と会社名は見せない。
// DBは supabase/migrations/0104_sakaba_gathering_guest_profiles.sql。

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { CheckBox } from "./form-parts";

export const GUEST_VISIBILITY_NOTE =
  "この集まりに申し込んだゲストだけに見えます（名前・アイコン・職業・ひとこと・プロフィール本文・紹介状）。連絡先と会社名は見せません。";

export function GatheringGuestVisibility({ questId, initial, host = false }: { questId: string; initial: boolean; host?: boolean }) {
  const [show, setShow] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(next: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    setShow(next);
    const { error: rpcError } = await createClient().rpc("sakaba_set_gathering_guest_visibility", { p_quest_id: questId, p_show: next });
    if (rpcError) {
      setShow(!next);
      setError("設定を保存できませんでした。画面を読み直して、もう一度お試しください。");
    } else {
      uiToast(next ? "ゲストにもプロフィールを見せます" : "ゲストにはプロフィールを見せません");
    }
    setBusy(false);
  }

  return <div className="space-y-1">
    <CheckBox checked={show} onChange={(next) => void change(next)} disabled={busy}>
      <span className="text-sm">{host ? "主催者（あなた）のプロフィールもゲストに見せる" : "ゲストにも自分のプロフィールを見せる"}</span>
      <span className="c-muted block text-xs leading-relaxed">{GUEST_VISIBILITY_NOTE}</span>
    </CheckBox>
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
  </div>;
}
