"use client";

// ギルドマスター画面：限定の集まりへの 承認待ち。
// 承認は はじめて申し込んだ人だけ。承認すると その人は「確認ずみ」になり、次からは 承認なしで参加できる。
// 見本なので、操作は この画面の中だけで反映される（再読み込みで元に戻る）。

import { useState } from "react";
import Link from "next/link";
import type { GuildNotification, QuestApplication } from "@/lib/guild/types";
import { formatDate, positionLabel } from "@/lib/guild/labels";
import { isExecutive, pendingGatheringApplications } from "@/lib/guild/join";
import { MASTER_ID, TODAY, getProfile, getQuest, questApplications, quests } from "@/lib/guild/mock-data";
import { gatheringDecisionNotification, notificationText } from "@/lib/guild/notifications";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";
import { JobAvatar } from "./job-avatar";

export function GatheringApprovals() {
  const [apps, setApps] = useState<QuestApplication[]>(questApplications);
  const [sent, setSent] = useState<GuildNotification[]>([]);
  const pending = pendingGatheringApplications(quests, apps);

  const decide = (a: QuestApplication, approve: boolean) => {
    setApps((list) =>
      list.map((x) =>
        x.quest_id === a.quest_id && x.user_id === a.user_id
          ? approve
            ? { ...x, approved_at: TODAY }
            : { ...x, status: "withdrawn" as const }
          : x,
      ),
    );
    // 本番は 承認・見送りと 知らせを 同じRPCの中で作る（知らせだけ漏れることがないように）
    setSent((s) => [gatheringDecisionNotification(a, approve, MASTER_ID, TODAY, `n-gathering-${s.length + 1}`), ...s]);
  };

  return (
    <Window title="集まりの 申し込み">
      <p className="c-muted mb-4 text-xs leading-relaxed">
        はじめて申し込んだ人だけが 並びます。承認すると 次からは 承認なしで 参加できます。承認しても 見送っても、本人に
        知らせが 届きます。
      </p>
      {pending.length === 0 ? (
        <p className="c-muted text-sm">承認待ちは ありません。</p>
      ) : (
        <ul className="space-y-4">
          {pending.map((a) => {
            const p = getProfile(a.user_id);
            const q = getQuest(a.quest_id);
            if (!p || !q) return null;
            return (
              <li key={`${a.quest_id}-${a.user_id}`} className="c-card space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <JobAvatar icon={p.job_icon} photoUrl={p.photo_url} name={p.job} />
                  <div className="min-w-0">
                    <Link
                      href={`/guild/members/${p.id}`}
                      className="block text-base underline-offset-4 hover:underline"
                    >
                      {p.display_name}
                    </Link>
                    <p className="text-xs break-words">
                      {p.company_name}・{positionLabel[p.position]}
                    </p>
                  </div>
                </div>
                {!isExecutive(p.position) && <p className="c-chip">役職が「その他」です。経営者か 確かめてください</p>}
                <p className="c-muted text-xs">
                  {q.title}・{formatDate(a.created_at)}に 申し込み
                </p>
                {a.message && <p className="text-sm leading-relaxed break-words">「{a.message}」</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="rpg-button h-11 px-5 text-sm"
                    onClick={() => {
                      decide(a, true);
                      uiToast(`${p.display_name}さんを 承認し、知らせました`);
                    }}
                  >
                    ▶ 承認する
                  </button>
                  <button
                    type="button"
                    className="c-muted h-11 px-2 text-xs underline underline-offset-4"
                    onClick={async () => {
                      const ok = await uiConfirm({
                        title: "申し込みを 見送ります",
                        message: `${p.display_name}さんの 申し込みを 見送ります。${p.display_name}さんには「今回は 見送りになりました」と 知らせます。`,
                        okLabel: "見送る",
                        danger: true,
                      });
                      if (!ok) return;
                      decide(a, false);
                      uiToast(`見送り、${p.display_name}さんに 知らせました`);
                    }}
                  >
                    見送る
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {sent.length > 0 && (
        <div className="c-dashed-top mt-6 pt-4">
          <p className="c-label text-xs">送った 知らせ（見本：本人の おしらせに 届く文面）</p>
          <ul className="mt-2 space-y-1.5">
            {sent.map((n) => (
              <li key={n.id} className="text-sm leading-relaxed break-words">
                {getProfile(n.user_id)?.display_name}さんへ：
                {
                  notificationText(n, {
                    name: (id) => getProfile(id)?.display_name ?? "",
                    questTitle: (id) => getQuest(id)?.title ?? "",
                    intro: () => undefined,
                  }).text
                }
              </li>
            ))}
          </ul>
        </div>
      )}
    </Window>
  );
}
