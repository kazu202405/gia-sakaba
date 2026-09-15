"use client";

// ギルドマスター画面の主役：紹介依頼の司令室。
// 上の件数カードは、ページを移動せずにその場で下の一覧を切り替える。
// 見本なので、操作はこの画面の中だけで反映される（再読み込みで元に戻る）。

import { useState } from "react";
import Link from "next/link";
import type { IntroOutcome, IntroRequest, IntroStatus } from "@/lib/guild/types";
import { formatDate, introStatusLabel, outcomeLabel, purposeLabel } from "@/lib/guild/labels";
import { getProfile, getQuest, listMembers } from "@/lib/guild/mock-data";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { JobAvatar } from "./job-avatar";
import { cn } from "@/lib/utils";

type GroupKey = "inbox" | "proposed" | "connected" | "closed";

const GROUPS: { key: GroupKey; label: string; note: string; statuses: IntroStatus[] }[] = [
  { key: "inbox", label: "とどいた", note: "あなたの判断待ち", statuses: ["requested", "reviewing"] },
  { key: "proposed", label: "だしん中", note: "相手の返事待ち", statuses: ["proposed"] },
  { key: "connected", label: "つないだ", note: "承諾・紹介済み", statuses: ["accepted", "introduced"] },
  {
    key: "closed",
    label: "おわり",
    note: "見送り・辞退など",
    statuses: ["declined_by_master", "declined_by_target", "expired", "redirected", "cancelled"],
  },
];

const OUTCOMES = Object.keys(outcomeLabel) as IntroOutcome[];

export function MasterConsole({ initial }: { initial: IntroRequest[] }) {
  const [requests, setRequests] = useState(initial);
  const [group, setGroup] = useState<GroupKey>("inbox");

  const update = (id: string, patch: Partial<IntroRequest>) =>
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, updated_at: "2026-09-15" } : r)));

  const connected = requests.filter((r) => r.status === "accepted" || r.status === "introduced").length;
  const working = requests.filter((r) => r.outcome === "working").length;

  const current = GROUPS.find((g) => g.key === group)!;
  const list = requests
    .filter((r) => current.statuses.includes(r.status))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <div>
      <p className="mb-4 text-sm">
        これまでに つないだ <span className="text-xl">{connected}</span>けん
        <span className="c-muted mx-2">／</span>
        仕事になった <span className="text-xl">{working}</span>けん
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {GROUPS.map((g) => {
          const count = requests.filter((r) => g.statuses.includes(r.status)).length;
          return (
            <button
              key={g.key}
              type="button"
              aria-pressed={g.key === group}
              onClick={() => setGroup(g.key)}
              className="c-choice border-3 p-3 text-left sm:p-4"
            >
              <span className="block text-sm">{g.label}</span>
              <span className="mt-1 block text-3xl tabular-nums">{count}</span>
              <span className="block text-[11px] opacity-70">{g.note}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 space-y-5">
        {list.length === 0 ? (
          <p className="c-card border-dashed px-4 py-10 text-center text-sm">「{current.label}」の いらいは ありません</p>
        ) : (
          list.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              onUpdate={(patch) => update(r.id, patch)}
              onRedirect={(newTargetId) => {
                const newRequest: IntroRequest = {
                  ...r,
                  id: `${r.id}-to-${newTargetId}`,
                  target_id: newTargetId,
                  status: "reviewing",
                  outcome: null,
                  created_at: "2026-09-15",
                  updated_at: "2026-09-15",
                };
                setRequests((rs) => [
                  ...rs.map((x) => (x.id === r.id ? { ...x, status: "redirected" as const, updated_at: "2026-09-15" } : x)),
                  newRequest,
                ]);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function RequestRow({
  request: r,
  onUpdate,
  onRedirect,
}: {
  request: IntroRequest;
  onUpdate: (patch: Partial<IntroRequest>) => void;
  onRedirect: (newTargetId: string) => void;
}) {
  const requester = getProfile(r.requester_id);
  const target = getProfile(r.target_id);
  const quest = r.quest_id ? getQuest(r.quest_id) : undefined;
  const [note, setNote] = useState("");
  const [choosing, setChoosing] = useState(false);
  const [altId, setAltId] = useState("");
  const [altError, setAltError] = useState("");

  if (!requester || !target) return null;

  const propose = async () => {
    const ok = await uiConfirm({
      title: "相手に打診します",
      message: `${target.display_name}さんに「${requester.display_name}さんを紹介したい」と打診します。\n承諾されると、お互いの連絡先が見えるようになります。`,
      okLabel: "打診する",
    });
    if (!ok) return;
    onUpdate({ status: "proposed" });
    uiToast(`${target.display_name}さんに打診しました`);
  };

  const decline = async () => {
    const ok = await uiConfirm({
      title: "この依頼を見送ります",
      message: `${requester.display_name}さんには「今回は見送りになりました」と表示されます。相手には何も届きません。`,
      okLabel: "見送る",
    });
    if (!ok) return;
    onUpdate({ status: "declined_by_master" });
    uiToast("見送りにしました");
  };

  const redirect = () => {
    if (!altId) {
      setAltError("提案する人を選んでください");
      return;
    }
    const alt = getProfile(altId);
    onRedirect(altId);
    setChoosing(false);
    uiToast(`${alt?.display_name ?? ""}さんへの依頼として作り直しました`);
  };

  const candidates = listMembers().filter(
    (m) => m.id !== requester.id && m.id !== target.id && m.accept_intro && m.role === "member",
  );

  const isInbox = r.status === "requested" || r.status === "reviewing";

  return (
    <article className="c-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={r.status === "requested" ? "c-chip-strong" : "c-chip"}>
          {r.status === "requested" ? "しんちゃく" : introStatusLabel[r.status].master}
        </span>
        <span className="c-muted text-[11px]">
          いらい {formatDate(r.created_at)}・こうしん {formatDate(r.updated_at)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 sm:gap-3">
        <PersonChip id={requester.id} />
        <span className="shrink-0 text-lg" aria-label="から">
          →
        </span>
        <PersonChip id={target.id} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="c-chip">{purposeLabel[r.purpose]}</span>
        {quest && (
          <Link href={`/guild/quests/${quest.id}`} className="c-muted break-all underline underline-offset-4">
            クエスト：{quest.title}
          </Link>
        )}
      </div>

      {r.message && (
        <p className="mt-3 border-2 border-dashed border-[#1b2a41]/30 bg-[#f3ecd9]/60 px-3 py-2 text-sm leading-relaxed break-words">
          {r.message}
        </p>
      )}

      {/* マスターのメモは本番では別の表（intro_request_notes）。本人たちには見えない */}
      {(isInbox || r.status === "proposed") && (
        <label className="mt-3 block">
          <span className="c-muted text-[11px]">マスターのメモ（依頼者・相手には見えません）</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="れい：来週の会で直接話す"
            className="c-input mt-1 h-10"
          />
        </label>
      )}

      <div className="mt-4">
        {isInbox && !choosing && (
          <div className="flex flex-wrap gap-3">
            <ActionButton primary onClick={propose}>
              ▶ 紹介する
            </ActionButton>
            <ActionButton onClick={() => setChoosing(true)}>別の人を提案</ActionButton>
            <ActionButton onClick={decline}>見送る</ActionButton>
          </div>
        )}

        {isInbox && choosing && (
          <div className="border-2 border-[#1b2a41] p-3">
            <p className="c-muted text-xs">
              {requester.display_name}さんに、{target.display_name}さんの代わりに提案する人
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <select
                value={altId}
                onChange={(e) => {
                  setAltId(e.target.value);
                  setAltError("");
                }}
                aria-label="提案する人"
                className="c-input h-10 flex-1"
              >
                <option value="">選んでください</option>
                {candidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}（{m.job}・{m.region}）
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <ActionButton primary onClick={redirect}>
                  この人を提案
                </ActionButton>
                <ActionButton
                  onClick={() => {
                    setChoosing(false);
                    setAltError("");
                  }}
                >
                  やめる
                </ActionButton>
              </div>
            </div>
            <p className="mt-1 min-h-[1rem] text-xs text-[#c62828]">{altError}</p>
          </div>
        )}

        {r.status === "proposed" && (
          <div>
            <p className="c-muted text-xs">相手の返事待ちです。打診から7日で自動的に取り下げになります。</p>
            <div className="c-dashed-top mt-3 flex flex-wrap gap-2 pt-3">
              <span className="c-muted self-center text-[11px]">見本の操作：</span>
              <ActionButton
                onClick={() => {
                  onUpdate({ status: "accepted" });
                  uiToast(`${target.display_name}さんが承諾しました（見本）`);
                }}
              >
                相手が承諾した
              </ActionButton>
              <ActionButton
                onClick={() => {
                  onUpdate({ status: "declined_by_target" });
                  uiToast(`${target.display_name}さんが辞退しました（見本）`, "info");
                }}
              >
                相手が辞退した
              </ActionButton>
            </div>
          </div>
        )}

        {r.status === "accepted" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="c-muted text-xs">おたがいの れんらく先が見えています。</p>
            <ActionButton
              primary
              onClick={() => {
                onUpdate({ status: "introduced" });
                uiToast("紹介済みにしました");
              }}
            >
              ▶ 紹介済みにする
            </ActionButton>
          </div>
        )}

        {r.status === "introduced" && (
          <div>
            <p className="c-muted text-xs">その後どうなりましたか？（つないだ価値として残ります）</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={r.outcome === o}
                  onClick={() => {
                    onUpdate({ outcome: o });
                    uiToast(`「${outcomeLabel[o]}」と記録しました`);
                  }}
                  className="c-choice h-10 px-3 text-sm"
                >
                  {outcomeLabel[o]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function PersonChip({ id }: { id: string }) {
  const p = getProfile(id);
  if (!p) return null;
  return (
    <Link href={`/guild/members/${p.id}`} className="flex min-w-0 flex-1 items-center gap-2 hover:underline">
      <JobAvatar icon={p.job_icon} photoUrl={p.photo_url} name={p.job} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm">{p.display_name}</span>
        <span className="c-muted block truncate text-[11px]">{p.job}</span>
      </span>
    </Link>
  );
}

function ActionButton({
  children,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className={cn("h-10 text-sm", primary ? "rpg-button" : "c-button-sub")}>
      {children}
    </button>
  );
}
