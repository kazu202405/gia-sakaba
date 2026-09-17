// 一覧の しぼりこみ。画面にもDBにも依存しない関数だけを置き、テスト（filters.test.ts）で見張る。
//
// 件数が増えると ずっと下に スクロールすることになるので、
// ①しぼる ②1件を短くする（かんたん表示）の2つで 1画面に入る数を増やす。

import type { Project, Quest, QuestApplication, QuestCategory } from "./types";

export type QuestFilter = "open" | "mine" | "joined" | "done" | "all";

export const questFilterLabel: Record<QuestFilter, string> = {
  open: "ぼしゅう中",
  mine: "自分が出した",
  joined: "参加したい",
  done: "クリア",
  all: "すべて",
};

/** けいじばんに出す並び：急ぎが先、次に新しい順 */
function sortForBoard(list: Quest[]): Quest[] {
  return [...list].sort(
    (a, b) => Number(b.is_urgent) - Number(a.is_urgent) || b.created_at.localeCompare(a.created_at),
  );
}

/**
 * クエストのしぼりこみ。取り下げたものは、自分が出したものを見るとき以外は出さない
 * （出した本人には「取り下げた」と分かるように残す）。
 */
export function filterQuests(
  quests: Quest[],
  applications: QuestApplication[],
  userId: string,
  filter: QuestFilter,
  category: QuestCategory | "",
): Quest[] {
  const joined = new Set(
    applications.filter((a) => a.user_id === userId && a.status === "applied").map((a) => a.quest_id),
  );
  const matched = quests.filter((q) => {
    if (category && q.category !== category) return false;
    switch (filter) {
      case "open":
        return q.status === "open" || q.status === "in_progress";
      case "mine":
        return q.creator_id === userId;
      case "joined":
        return joined.has(q.id);
      case "done":
        return q.status === "completed";
      case "all":
        return q.status !== "withdrawn" || q.creator_id === userId;
    }
  });
  return sortForBoard(matched);
}

export type ProjectFilter = "active" | "done" | "private" | "party" | "all";

export const projectFilterLabel: Record<ProjectFilter, string> = {
  active: "すすめている",
  done: "おわった",
  private: "自分だけ",
  party: "パーティ",
  all: "すべて",
};

/** プロジェクトのしぼりこみ。見える範囲は 呼ぶ前に visibleProjects で絞っておく */
export function filterProjects(projects: Project[], filter: ProjectFilter): Project[] {
  return projects.filter((p) => {
    switch (filter) {
      case "active":
        return p.status === "active";
      case "done":
        return p.status === "done";
      case "private":
        return p.member_ids.length === 0;
      case "party":
        return p.member_ids.length > 0;
      case "all":
        return true;
    }
  });
}

export type ViewMode = "full" | "compact";

const VIEW_KEY = "sakaba:view-mode";

/** 「くわしく／かんたん」は その人の 見え方の好み。読めない・書けないことがあるので 落ちないようにする */
export function loadViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === "compact" ? "compact" : "full";
  } catch {
    return "full";
  }
}

export function saveViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(VIEW_KEY, mode);
  } catch {
    // 保存できなくても 見え方が変わるだけなので 何もしない
  }
}
