"use client";

// クエストの「参加したい」。ひとことは任意。
// 出した本人には、代わりに「参加したい人を見る」を出す。
// 限定の集まり（members_only）は「参加を申し込む」。はじめての人は ギルドマスターの承認待ち、
// 前に承認された人は そのまま参加（経営者の確認を 別の作業にしない）。

import { useState } from "react";
import Link from "next/link";
import type { Quest } from "@/lib/guild/types";
import { gatheringApplyResult, isExecutive } from "@/lib/guild/join";
import { ME_ID, applicantCount, getApplication, getProfile } from "@/lib/guild/mock-data";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { TextArea } from "./form-parts";

const MESSAGE_MAX = 200;

export function QuestJoinButton({ quest }: { quest: Quest }) {
  const initial = getApplication(quest.id, ME_ID);
  const me = getProfile(ME_ID)!;
  const gathering = quest.members_only;
  const [joined, setJoined] = useState(initial !== undefined);
  const [pending, setPending] = useState(gathering && initial !== undefined && initial.approved_at === null);
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
        {!gathering ? (
          <p className="text-base">▶ 参加したいと つたえました</p>
        ) : pending ? (
          <div>
            <p className="text-base">▶ 申し込みました。ギルドマスターの 承認を お待ちください</p>
            <p className="c-muted mt-1 text-xs leading-relaxed">
              承認があるのは はじめての ときだけです。次からは そのまま 参加できます。
            </p>
          </div>
        ) : (
          <p className="text-base">▶ 参加します</p>
        )}
        {sentMessage && (
          <p className="c-card px-4 py-3 text-sm leading-relaxed whitespace-pre-line break-words">{sentMessage}</p>
        )}
        <button
          type="button"
          onClick={async () => {
            const ok = await uiConfirm({
              title: gathering ? "申し込みを取り消します" : "参加の希望を取り消します",
              message: gathering
                ? "この集まりへの 申し込みを 取り消します。"
                : "出した人に伝えた「参加したい」を取り消します。",
              okLabel: "取り消す",
            });
            if (!ok) return;
            setJoined(false);
            setPending(false);
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
          {gathering
            ? "ギルドマスターに 届きます。はじめての方は 会社のことを ひとこと 書いてもらえると 助かります。"
            : "書くと、えらんでもらいやすくなります。見るのは 出した人と ギルドマスターだけです。"}
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
              if (!gathering) {
                uiToast("参加したいと伝えました（見本のため保存はされません）");
                return;
              }
              const result = gatheringApplyResult(me);
              setPending(result === "pending");
              uiToast(
                result === "pending"
                  ? "申し込みました。承認を お待ちください（見本のため保存はされません）"
                  : "参加を 申し込みました（見本のため保存はされません）",
              );
            }}
            className="rpg-button h-11"
          >
            {gathering ? "▶ 申し込む" : "▶ 参加したいと伝える"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {gathering && !isExecutive(me.position) && (
        <p className="c-muted text-xs leading-relaxed">
          経営者（代表・役員・決裁者）の方向けの 集まりです。申し込むと ギルドマスターが 確かめます。
        </p>
      )}
      <button type="button" onClick={() => setWriting(true)} className="rpg-button h-12 w-full text-base sm:w-auto">
        {gathering ? "▶ 参加を 申し込む" : "▶ 参加したい"}
      </button>
    </div>
  );
}
