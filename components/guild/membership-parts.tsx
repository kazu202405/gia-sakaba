"use client";

// 有料会員まわりの部品：有料会員への案内・限定の集まりの鍵・見本の切り替え・実績。
// 案内は「異常」ではなく「操作の続き」なので、止めるモーダルではなく その場の枠で出す。

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { Quest } from "@/lib/guild/types";
import { ME_ID, guild } from "@/lib/guild/mock-data";
import {
  ENTRY_PLAN_PRICE_LABEL,
  FREE_ACTIVE_PROJECT_LIMIT,
  canOpenQuest,
  type AchievementCounts,
  type Badge,
} from "@/lib/guild/membership";
import { getInitialMembership, getMembership, setMembership, subscribeMembership } from "@/lib/guild/membership-store";
import { cn } from "@/lib/utils";
import { CheckBox } from "./form-parts";

export function useMembership() {
  return useSyncExternalStore(subscribeMembership, getMembership, getInitialMembership);
}

function PlanButton() {
  return (
    <Link href="/guild/plan" className="rpg-button h-11 w-full px-5 text-sm sm:w-auto">
      ▶ 有料会員について 見る
    </Link>
  );
}

/** プロジェクトを すすめられる数を こえたときの案内 */
export function ProjectLimitNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("c-card space-y-3", compact ? "p-3" : "p-4 sm:p-5")}>
      <p className="text-[15px] leading-relaxed">
        無料では、自分で つくって すすめている プロジェクトは{" "}
        <span className="inline-block">{FREE_ACTIVE_PROJECT_LIMIT}つまで です。</span>
      </p>
      <p className="c-muted text-xs leading-relaxed">
        1つ おわりにすると、また つくれます。{guild.terms.quest}から作った ものは 数に入りません。 有料会員（
        {ENTRY_PLAN_PRICE_LABEL}）なら いくつでも すすめられます。
        {"今ある プロジェクトは そのまま 見られます。"}
      </p>
      <PlanButton />
    </div>
  );
}

/** 限定の集まり：有料会員でなければ、くわしい内容と参加の代わりに案内を出す */
export function MembersOnlyGate({ quest, children }: { quest: Quest; children: React.ReactNode }) {
  const { isPaid } = useMembership();
  // 見本では画面で止めている。本番は くわしい内容を サーバー側で返さない（RPCで有料会員か確かめる）
  if (canOpenQuest(quest, ME_ID, isPaid)) return <>{children}</>;
  return (
    <div className="c-card mt-6 space-y-3 p-4 sm:p-5">
      <p className="text-[15px] leading-relaxed">
        この{guild.terms.quest}は <span className="inline-block">有料会員だけの 集まりです。</span>
      </p>
      <p className="c-muted text-xs leading-relaxed">
        くわしい内容を見て 参加できるのは、有料会員（{ENTRY_PLAN_PRICE_LABEL}）だけです。
      </p>
      <PlanButton />
    </div>
  );
}

/** 見本だけの切り替え。本番には出さない */
export function MembershipPreviewSwitch() {
  const { isPaid } = useMembership();
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed">
        いまは <span className="text-base">{isPaid ? "有料会員" : "無料"}</span> として 見ています。
      </p>
      <div className="flex gap-2" role="group" aria-label="見本の会員の種類">
        {[
          { paid: false, label: "無料で見る" },
          { paid: true, label: "有料会員で見る" },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            aria-pressed={isPaid === o.paid}
            onClick={() => setMembership({ isPaid: o.paid })}
            className={cn("h-11 flex-1 px-3 text-sm sm:flex-none", isPaid === o.paid ? "rpg-button" : "c-button-sub")}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="c-muted text-[11px] leading-relaxed">
        見本だけの切り替えです。本番では GIA の会員の段で きまり、ここでは 変えられません。
      </p>
    </div>
  );
}

// ---------- 実績 ----------

const COUNT_LABELS: { key: keyof AchievementCounts; label: string }[] = [
  { key: "questClear", label: `${guild.terms.quest}クリア` },
  { key: "party", label: guild.terms.party },
  { key: "connected", label: "しょうかいで つながった" },
  { key: "introduced", label: "しょうかいした" },
];

/**
 * 実績：積み上がる数と、集めたバッジ。人に段（ランク・スター）は付けない。
 * 本人（mine）は まだ取っていないバッジも「取り方」つきで並べ、みんなに見せるかを切り替えられる。
 */
export function AchievementsView({
  counts,
  badges,
  mine,
  isMaster,
  selfPreview = false,
}: {
  counts: AchievementCounts;
  badges: Badge[];
  mine: boolean;
  isMaster: boolean;
  /** 自分の ステータスを「みんなからの見え方」で見ているとき。見せない設定なら その旨を出す */
  selfPreview?: boolean;
}) {
  const { showAchievements } = useMembership();
  const shown = mine ? badges : badges.filter((b) => b.earned);
  const labels = COUNT_LABELS.filter((c) => c.key !== "introduced" || isMaster);

  // 見本では ほかの人は みな「見せる」にしている。本番は 本人の設定をサーバー側で見て、見せないなら返さない
  if (selfPreview && !showAchievements) {
    return <p className="c-muted text-sm">実績は みんなに 見せていません（マイページで 変えられます）。</p>;
  }

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {labels.map((c) => (
          <div key={c.key}>
            <dt className="c-muted text-xs">{c.label}</dt>
            <dd className="text-3xl tabular-nums">{counts[c.key]}</dd>
          </div>
        ))}
      </dl>

      {shown.length > 0 && (
        <div>
          <p className="c-label text-xs">あつめた バッジ</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {shown.map((b) => (
              <li
                key={b.key}
                className={cn(
                  "border-2 px-2 py-1 text-xs",
                  b.earned ? "border-[#1b2a41] bg-[#f3ecd9]" : "c-muted border-dashed border-[#1b2a41]/30",
                )}
                title={b.earned ? undefined : b.howTo}
              >
                {b.earned ? `◎ ${b.label}` : `？ ${b.howTo}`}
                <span className="sr-only">{b.earned ? "（取った）" : "（まだ）"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mine && (
        <CheckBox checked={showAchievements} onChange={(v) => setMembership({ showAchievements: v })}>
          <span className="text-sm">実績を みんなに 見せる</span>
        </CheckBox>
      )}
    </div>
  );
}
