"use client";

// マイページ：入会のつながりで名前を出さないか（その場で保存）。
// 出さない設定にすると、ほかの人のつながりでは「匿名の会員」になり、自分のページではつながりを出さない。

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiToast } from "@/lib/ui-dialog";
import { CheckBox } from "./form-parts";

export function InvitePathSetting({ initial }: { initial: boolean }) {
  const [hidden, setHidden] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(next: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    setHidden(next);
    const { error: rpcError } = await createClient().rpc("sakaba_set_invite_path_hidden", { p_hidden: next });
    if (rpcError) {
      setHidden(!next);
      setError("設定を保存できませんでした。画面を読み直して、もう一度お試しください。");
    } else {
      uiToast(next ? "入会のつながりで名前を出さない設定にしました" : "入会のつながりに名前を出す設定にしました");
    }
    setBusy(false);
  }

  return <div className="c-dashed-top mt-5 space-y-1 pt-4">
    <CheckBox checked={hidden} onChange={(next) => void change(next)} disabled={busy}>
      <span className="text-sm">入会のつながりで名前を出さない</span>
      <span className="c-muted block text-xs leading-relaxed">ほかの人のつながりの途中では「匿名の会員」と表示し、あなたのページではつながりを出しません。あなた自身には、いつもどおり見えます。</span>
    </CheckBox>
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
  </div>;
}
