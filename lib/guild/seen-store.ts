// ギルドメンバー めいかん・クエスト けいじばんを「最後に開いた時刻」を、ホームの数と共有する（見本用）。
// 本番では sakaba の本人の行に members_seen_at / quests_seen_at を持ち、一覧を開いたときに更新する。

import type { SeenAt } from "./home-summary";
import { TODAY, mySeenAt } from "./mock-data";

const initial: SeenAt = mySeenAt;
let seen: SeenAt = initial;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeSeen(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSeen(): SeenAt {
  return seen;
}

/** サーバー側の描画とはじめの描画は、開いた記録を持たない同じ値にそろえる */
export function getInitialSeen(): SeenAt {
  return initial;
}

export function markSeen(list: "members" | "quests"): void {
  const key = list === "members" ? "members_seen_at" : "quests_seen_at";
  if (seen[key] === TODAY) return;
  seen = { ...seen, [key]: TODAY };
  emit();
}
