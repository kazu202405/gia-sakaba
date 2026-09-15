"use client";

// クエストの「参加したい」。出した本人には出さない。

import { useState } from "react";
import type { Quest } from "@/lib/guild/types";
import { ME_ID } from "@/lib/guild/mock-data";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";

export function QuestJoinButton({ quest }: { quest: Quest }) {
  const [joined, setJoined] = useState(quest.applicant_ids.includes(ME_ID));

  if (quest.creator_id === ME_ID) {
    return <p className="c-muted text-sm">あなたが出した クエストです。</p>;
  }
  if (quest.status !== "open") {
    return <p className="c-muted text-sm">この クエストは ぼしゅうを おえています。</p>;
  }

  if (joined) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <p className="text-base">▶ 参加したいと つたえました</p>
        <button
          type="button"
          onClick={async () => {
            const ok = await uiConfirm({
              title: "参加の希望を取り消します",
              message: "出した人に伝えた「参加したい」を取り消します。",
              okLabel: "取り消す",
            });
            if (!ok) return;
            setJoined(false);
            uiToast("取り消しました", "info");
          }}
          className="c-muted text-left text-xs underline underline-offset-4"
        >
          取り消す
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setJoined(true);
        uiToast("参加したいと伝えました（見本のため保存はされません）");
      }}
      className="rpg-button h-12 w-full text-base sm:w-auto"
    >
      ▶ 参加したい
    </button>
  );
}
