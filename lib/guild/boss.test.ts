import { describe, expect, it } from "vitest";
import type { Boss, Quest, QuestApplication } from "./types";
import { GROUND_RULES, GUILD_PROMISES, activeBosses, challengerIds, questsForBoss } from "./boss";
import { bosses, quests } from "./mock-data";

const q = (id: string, patch: Partial<Quest>): Quest => ({ ...quests[1], id, boss_id: null, ...patch });
const app = (quest_id: string, user_id: string, status: QuestApplication["status"] = "applied"): QuestApplication => ({
  quest_id,
  user_id,
  message: "",
  status,
  approved_at: null,
  created_at: "2026-09-10",
});

describe("ボス（みんなで挑む課題）", () => {
  const list = [
    q("old", { boss_id: "b", creator_id: "a", created_at: "2026-09-01", status: "completed" }),
    q("new", { boss_id: "b", creator_id: "b-owner", created_at: "2026-09-10", status: "open" }),
    q("gone", { boss_id: "b", creator_id: "x", status: "withdrawn" }),
    q("other", { boss_id: "c", creator_id: "y" }),
  ];

  it("そのボスに挑むクエストを 新しい順に。取り下げたものは 出さない", () => {
    expect(questsForBoss(list, "b").map((x) => x.id)).toEqual(["new", "old"]);
  });

  it("挑んでいる人：出した人と 参加したい人（取り消し・取り下げたクエストは除く・重ならない）", () => {
    const apps = [app("new", "a"), app("new", "p"), app("old", "q", "withdrawn"), app("gone", "z"), app("other", "w")];
    expect(challengerIds(list, apps, "b").sort()).toEqual(["a", "b-owner", "p"]);
  });

  it("クエストに付けられるのは いま挑んでいるボスだけ", () => {
    const bs = [
      { id: "1", status: "active" },
      { id: "2", status: "defeated" },
    ] as Boss[];
    expect(activeBosses(bs).map((b) => b.id)).toEqual(["1"]);
  });

  it("見本データ：ボスは課題の名前で、人・会社を敵にしていない（「さん」「株式会社」を含まない）", () => {
    for (const b of bosses) {
      expect(b.title).not.toMatch(/さん|株式会社|有限会社/);
    }
    expect(quests.some((x) => x.boss_id !== null)).toBe(true);
  });
});

describe("ギルドの約束", () => {
  it("勧誘・紹介料目的・信頼を裏切る の3つ", () => {
    expect(GUILD_PROMISES).toHaveLength(3);
  });

  it("話すときの約束（グランドルール）は さえぎらない・まず受け止める・自分ばかり話さない", () => {
    expect(GROUND_RULES).toHaveLength(3);
    expect(GROUND_RULES.join("")).toContain("さえぎらない");
  });
});
