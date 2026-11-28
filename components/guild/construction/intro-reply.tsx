"use client";

// 紹介のおねがいへの返事（見本のやり取りと同じ「承認／辞退」「了承／お断り」の2つのボタン）。
// 押すと下から出る窓に、いままでのフォームの入力欄（紹介料の条件・ひとこと）を出す。送る処理は既存の answerConstructionIntro のまま。
import { useState } from "react";
import { Modal } from "@/components/guild/look/sns/parts";
import { answerConstructionIntro } from "@/lib/guild/construction-actions";
import { ConstructionField, ConstructionFields } from "./fields";
import { ConstructionForm } from "./forms";

type Answer = "accept" | "decline";

export function IntroReplyButtons({ id, introducer, requesterName, targetName }: {
  id: string;
  /** true＝自分が間の人（承認して紹介料の条件を決める）／false＝紹介される本人 */
  introducer: boolean;
  requesterName: string;
  targetName: string;
}) {
  const [open, setOpen] = useState<Answer | null>(null);
  const close = () => setOpen(null);
  const acceptLabel = introducer ? `承認して${targetName}さんに聞く` : "了承してつながる";
  const declineLabel = introducer ? "辞退する" : "お断りする";
  const title = open === "accept" ? acceptLabel : introducer ? `${requesterName}さんのおねがいを辞退する` : "紹介をお断りする";
  return <>
    <div className="sn-row-acts">
      <button type="button" className="sn-btn sn-btn--main" onClick={() => setOpen("accept")}>{acceptLabel}</button>
      <button type="button" className="sn-btn" onClick={() => setOpen("decline")}>{declineLabel}</button>
    </div>
    {open && <Modal title={title} onClose={close}>
      <ConstructionForm action={answerConstructionIntro} submit={open === "accept" ? (introducer ? "承認する" : "了承する") : declineLabel} onCancel={close}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="answer" value={open} />
        <ConstructionFields>
          {open === "accept" && introducer && <>
            <ConstructionField label="紹介料の条件"><select name="fee" defaultValue="none"><option value="none">なし</option><option value="fixed">固定額（円）</option><option value="percent">成約時の割合（%）</option><option value="discuss">相談して決める</option></select></ConstructionField>
            <ConstructionField label="固定額または割合（該当する場合）"><input name="value" type="number" min="0" step="any" /></ConstructionField>
          </>}
          <ConstructionField label="ひとこと（任意）"><textarea name="note" maxLength={200} rows={2} /></ConstructionField>
        </ConstructionFields>
      </ConstructionForm>
    </Modal>}
  </>;
}
