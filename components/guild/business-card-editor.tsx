"use client";

// ステータスをなおす画面：名刺の表と裏を登録・差し替え・削除する。
// 名刺には電話・メール・住所が写るので、初めて登録するときに「会員全員に見える」ことへの同意を取る。

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import {
  BUSINESS_CARD_BUCKET,
  BUSINESS_CARD_SOURCE_LIMIT,
  BUSINESS_CARD_URL_TTL,
  businessCardPath,
  shrinkBusinessCardImage,
  type BusinessCard,
  type BusinessCardSide,
} from "@/lib/guild/business-card";
import { Window } from "./cards";
import { CheckBox } from "./form-parts";

const SIDE_LABEL: Record<BusinessCardSide, string> = { front: "表", back: "裏" };

export function BusinessCardEditor({ userId, initial, initialUrls }: {
  userId: string;
  initial: BusinessCard;
  initialUrls: Record<string, string>;
}) {
  const [card, setCard] = useState<BusinessCard>(initial);
  const [urls, setUrls] = useState<Record<string, string>>(initialUrls);
  const [agreed, setAgreed] = useState(Boolean(initial.agreed_at));
  const [busy, setBusy] = useState<BusinessCardSide | null>(null);
  const [error, setError] = useState("");
  const inputs = { front: useRef<HTMLInputElement>(null), back: useRef<HTMLInputElement>(null) };
  const alreadyAgreed = Boolean(card.agreed_at);

  async function save(next: BusinessCard) {
    const { error: rpcError } = await createClient().rpc("sakaba_set_business_card", {
      p_front: next.front, p_back: next.back, p_agreed: agreed,
    });
    if (rpcError) throw rpcError;
  }

  async function choose(side: BusinessCardSide, file: File | undefined) {
    if (!file || busy) return;
    if (!file.type.startsWith("image/")) { setError("画像ファイルを選んでください。"); return; }
    if (file.size > BUSINESS_CARD_SOURCE_LIMIT) { setError("画像は20MBまでです。"); return; }
    if (!agreed) { setError("名刺を登録するには、下の同意にチェックを入れてください。"); return; }
    setBusy(side); setError("");
    const supabase = createClient();
    const path = businessCardPath(userId, side);
    const old = card[side];
    let uploaded = false;
    try {
      const blob = await shrinkBusinessCardImage(file);
      const { error: uploadError } = await supabase.storage.from(BUSINESS_CARD_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;
      uploaded = true;
      const next = { ...card, [side]: path };
      await save(next);
      if (old) await supabase.storage.from(BUSINESS_CARD_BUCKET).remove([old]);
      const { data } = await supabase.storage.from(BUSINESS_CARD_BUCKET).createSignedUrl(path, BUSINESS_CARD_URL_TTL);
      setCard({ ...next, agreed_at: card.agreed_at ?? new Date().toISOString() });
      if (data?.signedUrl) setUrls((current) => ({ ...current, [path]: data.signedUrl }));
      uiToast(`名刺の${SIDE_LABEL[side]}を登録しました`);
    } catch {
      // 登録できなかった画像は置いたままにしない
      if (uploaded) await supabase.storage.from(BUSINESS_CARD_BUCKET).remove([path]);
      setError("名刺を登録できませんでした。画面を読み直して、もう一度お試しください。");
    } finally {
      setBusy(null);
      const input = inputs[side].current;
      if (input) input.value = "";
    }
  }

  async function remove(side: BusinessCardSide) {
    const old = card[side];
    if (!old || busy) return;
    const confirmed = await uiConfirm({ title: `名刺の${SIDE_LABEL[side]}を消します`, message: "消すと、ほかの会員からも見えなくなります。", okLabel: "消す", danger: true });
    if (!confirmed) return;
    setBusy(side); setError("");
    const supabase = createClient();
    try {
      const next = { ...card, [side]: null };
      const { error: rpcError } = await supabase.rpc("sakaba_set_business_card", {
        p_front: next.front, p_back: next.back, p_agreed: true,
      });
      if (rpcError) throw rpcError;
      await supabase.storage.from(BUSINESS_CARD_BUCKET).remove([old]);
      setCard({ ...next, agreed_at: next.front || next.back ? card.agreed_at : null });
      if (!next.front && !next.back) setAgreed(false);
      uiToast(`名刺の${SIDE_LABEL[side]}を消しました`);
    } catch {
      setError("名刺を消せませんでした。画面を読み直して、もう一度お試しください。");
    } finally {
      setBusy(null);
    }
  }

  return <Window title="名刺">
    <p className="text-sm leading-relaxed">名刺の表と裏を登録すると、ギルドの会員があなたのページとギルドの「めいし」表示で見られます。ゲストには見えません。</p>
    <div className="mt-5 grid gap-5 sm:grid-cols-2">
      {(["front", "back"] as const).map((side) => {
        const path = card[side];
        const url = path ? urls[path] : undefined;
        return <div key={side}>
          <p className="c-label text-xs">{SIDE_LABEL[side]}</p>
          <div className="c-card mt-1 flex aspect-[91/55] items-center justify-center overflow-hidden">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element -- 期限つきの署名URLの画像なので next/image を通さない
              <img src={url} alt={`名刺の${SIDE_LABEL[side]}`} className="h-full w-full object-contain" />
            ) : <span className="c-muted text-xs">{path ? "画像を読み込めませんでした" : "まだ登録していません"}</span>}
          </div>
          <input ref={inputs[side]} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" aria-label={`名刺の${SIDE_LABEL[side]}を選ぶ`} onChange={(event) => void choose(side, event.target.files?.[0])} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={busy !== null} onClick={() => inputs[side].current?.click()} className="c-button-sub h-10 px-3 text-sm disabled:opacity-50">
              {busy === side ? "処理中…" : path ? "差し替える" : `${SIDE_LABEL[side]}を登録する`}
            </button>
            {path && <button type="button" disabled={busy !== null} onClick={() => void remove(side)} className="c-button-danger h-10 px-3 text-sm disabled:opacity-50">消す</button>}
          </div>
        </div>;
      })}
    </div>
    <div className="c-dashed-top mt-6 pt-4">
      {alreadyAgreed ? (
        <p className="c-muted text-xs leading-relaxed">名刺の画像は、ギルドの会員全員に見えています（電話・メール・住所なども写ります）。見せたくなくなったら、表と裏を消してください。</p>
      ) : (
        <CheckBox checked={agreed} onChange={setAgreed}>
          <span className="text-sm">名刺の画像が、ギルドの会員全員に見えることに同意する</span>
          <span className="c-muted block text-xs leading-relaxed">名刺に写っている電話・メール・住所なども見えます。ゲストや会員でない人には見えません。</span>
        </CheckBox>
      )}
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-[#c62828]">{error}</p>}
  </Window>;
}
