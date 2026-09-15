"use client";

// 参加したい人の一覧の「この人にお願いしたい」。
// 相手とすぐにはつながらない。クエスト経由の紹介依頼としてギルドマスターに届き、
// 相手が承諾したら、おたがいの連絡先が見えるようになる（紹介依頼と同じ流れ）。

import { useState } from "react";
import Link from "next/link";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";

export function ApplicantChooseButton({
  applicantName,
  existingLabel,
}: {
  applicantName: string;
  /** すでに依頼していれば、その状態の文言（依頼者向け） */
  existingLabel: string | null;
}) {
  const [sent, setSent] = useState(false);

  if (existingLabel || sent) {
    return (
      <Link href="/guild/requests" className="c-button-sub h-11 w-full text-sm sm:w-auto">
        しょうかい：{existingLabel ?? "ギルドマスターが確認中"}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await uiConfirm({
          title: "ギルドマスターに つないでもらいます",
          message: `${applicantName}さんとの紹介を依頼します。ギルドマスターが確認し、${applicantName}さんが承諾したら、おたがいの連絡先が見えるようになります。`,
          okLabel: "依頼する",
        });
        if (!ok) return;
        setSent(true);
        uiToast("ギルドマスターに依頼しました（見本のため保存はされません）");
      }}
      className="rpg-button h-11 w-full text-sm sm:w-auto"
    >
      ▶ この人に お願いしたい
    </button>
  );
}
