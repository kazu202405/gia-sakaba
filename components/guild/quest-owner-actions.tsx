"use client";

// 出した人だけに見せる「内容を なおす」「取り下げる」。募集中のクエストだけ。
// 取り下げると、参加したいと伝えた人に知らせが届き、承諾前の紹介依頼も一緒に取り下げる
// （承諾済み・紹介済みは連絡先が開いたまま残す）。

import Link from "next/link";
import { useRouter } from "next/navigation";
import { guild } from "@/lib/guild/mock-data";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";

export function QuestOwnerActions({
  questId,
  applicantCount,
  openIntroCount,
}: {
  questId: string;
  applicantCount: number;
  /** 一緒に取り下げる、承諾前の紹介依頼の数 */
  openIntroCount: number;
}) {
  const router = useRouter();

  const withdraw = async () => {
    const parts = [
      `取り下げると、けいじばんから消えます。`,
      applicantCount > 0
        ? `参加したいと伝えた ${applicantCount}人には「取り下げられました」と知らせます。`
        : "",
      openIntroCount > 0
        ? `この${guild.terms.quest}で進んでいる 承諾前の紹介依頼 ${openIntroCount}件も、一緒に取り下げます（承諾済み・紹介済みは そのまま残ります）。`
        : "",
    ];
    const ok = await uiConfirm({
      title: `${guild.terms.quest}を 取り下げます`,
      message: parts.filter(Boolean).join(" "),
      okLabel: "取り下げる",
      danger: true,
    });
    if (!ok) return;
    uiToast("取り下げました（見本のため保存はされません）");
    router.push("/guild/me");
  };

  return (
    <div className="c-dashed-top mt-6 flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/guild/quests/${questId}/edit`} className="c-button-sub h-11 w-full text-sm sm:w-auto">
        内容を なおす
      </Link>
      <button type="button" onClick={withdraw} className="c-muted text-left text-xs underline underline-offset-4">
        この{guild.terms.quest}を 取り下げる
      </button>
    </div>
  );
}
