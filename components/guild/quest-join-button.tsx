"use client";

// クエストの「参加したい」。ひとことは任意。
// 出した本人には、代わりに「参加したい人を見る」を出す。

import { useState } from "react";
import Link from "next/link";
import type { Quest } from "@/lib/guild/types";
import { ME_ID, applicantCount, getApplication } from "@/lib/guild/mock-data";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { TextArea } from "./form-parts";

const MESSAGE_MAX = 200;

export function QuestJoinButton({ quest }: { quest: Quest }) {
  const initial = getApplication(quest.id, ME_ID);
  const [joined, setJoined] = useState(initial !== undefined);
  const [sentMessage, setSentMessage] = useState(initial?.message ?? "");
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");

  if (quest.creator_id === ME_ID) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <Link href={`/guild/quests/${quest.id}/applicants`} className="rpg-button h-12 w-full text-base sm:w-auto">
          ▶ 参加したい人を見る（{applicantCount(quest.id)}人）
        </Link>
        <p className="c-muted text-xs">あなたが出した クエストです。</p>
      </div>
    );
  }
  if (quest.status !== "open") {
    return (
      <p className="c-muted text-sm">
        {quest.status === "withdrawn"
          ? "この クエストは 出した人が 取り下げました。"
          : "この クエストは ぼしゅうを おえています。"}
      </p>
    );
  }

  if (joined) {
    return (
      <div className="space-y-3">
        <p className="text-base">▶ 参加したいと つたえました</p>
        {sentMessage && (
          <p className="c-card px-4 py-3 text-sm leading-relaxed whitespace-pre-line break-words">{sentMessage}</p>
        )}
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
            setSentMessage("");
            uiToast("取り消しました", "info");
          }}
          className="c-muted text-left text-xs underline underline-offset-4"
        >
          取り消す
        </button>
      </div>
    );
  }

  if (writing) {
    return (
      <div className="space-y-3">
        <p className="text-[15px] tracking-wider">
          ひとこと<span className="c-muted ml-1.5 text-xs">任意</span>
        </p>
        <p className="c-muted text-xs leading-relaxed">
          書くと、えらんでもらいやすくなります。見るのは 出した人と ギルドマスターだけです。
        </p>
        <TextArea
          value={draft}
          onChange={setDraft}
          rows={3}
          max={MESSAGE_MAX}
          label="ひとこと"
          placeholder="れい：採用ページの制作実績があります。撮影からご相談にのれます"
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setWriting(false)} className="c-button-sub h-11">
            やめる
          </button>
          <button
            type="button"
            onClick={() => {
              setSentMessage(draft.trim());
              setJoined(true);
              setWriting(false);
              setDraft("");
              uiToast("参加したいと伝えました（見本のため保存はされません）");
            }}
            className="rpg-button h-11"
          >
            ▶ 参加したいと伝える
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setWriting(true)} className="rpg-button h-12 w-full text-base sm:w-auto">
      ▶ 参加したい
    </button>
  );
}
