"use client";

// 自分の紹介依頼（出したもの）と、自分への打診（受けたもの）。

import { useState } from "react";
import Link from "next/link";
import type { IntroRequest } from "@/lib/guild/types";
import { closedStatuses, formatDate, introStatusLabel, introSteps, outcomeLabel, purposeLabel } from "@/lib/guild/labels";
import { ME_ID, getProfile, getQuest } from "@/lib/guild/mock-data";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { JobAvatar } from "./job-avatar";
import { Window } from "./cards";
import { cn } from "@/lib/utils";

const STEP_SHORT = ["そうしん", "かくにん", "だしん", "しょうだく", "しょうかい"];

export function MyRequests({ initial }: { initial: IntroRequest[] }) {
  const [requests, setRequests] = useState(initial);
  const sent = requests.filter((r) => r.requester_id === ME_ID);
  // 受けた側には、打診された後のものだけが見える（期限切れも見せない）
  const received = requests.filter(
    (r) => r.target_id === ME_ID && ["proposed", "accepted", "introduced"].includes(r.status),
  );

  const update = (id: string, patch: Partial<IntroRequest>) =>
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-10">
      <Window title="あなたへの だしん">
        {received.length === 0 ? (
          <p className="c-muted text-sm">いまは だしんは 来ていません。</p>
        ) : (
          <div className="space-y-4">
            {received.map((r) => (
              <ReceivedCard key={r.id} request={r} onUpdate={(p) => update(r.id, p)} />
            ))}
          </div>
        )}
      </Window>

      <Window title="あなたが出した いらい">
        {sent.length === 0 ? (
          <p className="c-muted text-sm">まだ しょうかいを依頼していません。なかま めいかんから さがせます。</p>
        ) : (
          <div className="space-y-4">
            {sent.map((r) => (
              <SentCard key={r.id} request={r} onCancel={() => update(r.id, { status: "cancelled" })} />
            ))}
          </div>
        )}
      </Window>
    </div>
  );
}

function SentCard({ request: r, onCancel }: { request: IntroRequest; onCancel: () => void }) {
  const target = getProfile(r.target_id);
  if (!target) return null;
  const closed = closedStatuses.includes(r.status);
  const stepIndex = introSteps.indexOf(r.status);

  const cancel = async () => {
    const ok = await uiConfirm({
      title: "依頼を取り下げます",
      message: `${target.display_name}さんへの紹介依頼を取り下げます。`,
      okLabel: "取り下げる",
    });
    if (!ok) return;
    onCancel();
    uiToast("取り下げました");
  };

  return (
    <article className={cn("c-card p-4 sm:p-5", closed && "opacity-75")}>
      <div className="flex items-center gap-3">
        <JobAvatar icon={target.job_icon} photoUrl={target.photo_url} name={target.job} size="sm" />
        <div className="min-w-0 flex-1">
          <Link href={`/guild/members/${target.id}`} className="text-base hover:underline">
            {target.display_name}さん
          </Link>
          <p className="c-muted text-xs">
            {purposeLabel[r.purpose]}・{formatDate(r.created_at)}
          </p>
        </div>
        <span className="shrink-0 text-right text-xs">{introStatusLabel[r.status].requester}</span>
      </div>

      {!closed && (
        <div className="mt-4" aria-label="進み具合">
          <div className="c-gauge">
            {STEP_SHORT.map((label, i) => (
              <span key={label} data-on={i <= stepIndex} />
            ))}
          </div>
          <ol className="mt-1 grid grid-cols-5 text-center text-[10px]">
            {STEP_SHORT.map((label, i) => (
              <li key={label} className={i <= stepIndex ? "" : "c-muted"}>
                {label}
              </li>
            ))}
          </ol>
        </div>
      )}

      {(r.status === "accepted" || r.status === "introduced") && <ContactBox name={target.display_name} />}

      {r.outcome && (
        <p className="c-muted mt-3 text-xs">
          けっか：<span className="text-[#1b2a41]">{outcomeLabel[r.outcome]}</span>
        </p>
      )}

      {(r.status === "requested" || r.status === "reviewing") && (
        <button type="button" onClick={cancel} className="c-muted mt-3 text-xs underline underline-offset-4">
          依頼を取り下げる
        </button>
      )}
    </article>
  );
}

function ReceivedCard({
  request: r,
  onUpdate,
}: {
  request: IntroRequest;
  onUpdate: (patch: Partial<IntroRequest>) => void;
}) {
  const requester = getProfile(r.requester_id);
  const quest = r.quest_id ? getQuest(r.quest_id) : undefined;
  if (!requester) return null;

  const decline = async () => {
    const ok = await uiConfirm({
      title: "今回は辞退します",
      message: `${requester.display_name}さんには「今回はご縁がありませんでした」とだけ伝わります。理由は伝わりません。`,
      okLabel: "辞退する",
    });
    if (!ok) return;
    onUpdate({ status: "declined_by_target" });
    uiToast("辞退しました", "info");
  };

  return (
    <article className="c-card p-4 sm:p-5">
      <p className="c-label text-xs">ギルドマスターからの しょうかい</p>
      <div className="mt-2 flex items-center gap-3">
        <JobAvatar icon={requester.job_icon} photoUrl={requester.photo_url} name={requester.job} size="sm" />
        <div className="min-w-0 flex-1">
          <Link href={`/guild/members/${requester.id}`} className="text-base hover:underline">
            {requester.display_name}さん
          </Link>
          <p className="c-muted text-xs">
            {requester.job}・{purposeLabel[r.purpose]}
          </p>
        </div>
      </div>
      {quest && (
        <Link href={`/guild/quests/${quest.id}`} className="c-muted mt-2 block text-xs underline underline-offset-4">
          クエスト：{quest.title}
        </Link>
      )}
      {r.message && (
        <p className="mt-3 border-2 border-dashed border-[#1b2a41]/30 bg-[#f3ecd9]/60 px-3 py-2 text-sm">{r.message}</p>
      )}

      {r.status === "proposed" ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              onUpdate({ status: "accepted" });
              uiToast("承諾しました。お互いの連絡先が見えるようになりました");
            }}
            className="rpg-button h-11"
          >
            ▶ 会ってみる
          </button>
          <button type="button" onClick={decline} className="c-button-sub h-11">
            今回は辞退する
          </button>
        </div>
      ) : (
        <ContactBox name={requester.display_name} />
      )}
    </article>
  );
}

function ContactBox({ name }: { name: string }) {
  return (
    <div className="mt-3 border-2 border-dashed border-[#8f7337] bg-[#fffdf6] px-3 py-2 text-sm">
      <p className="c-label text-[11px]">{name}さんの れんらく先（承諾されたので見えています）</p>
      <p className="mt-0.5">sample@example.com（見本）</p>
    </div>
  );
}
