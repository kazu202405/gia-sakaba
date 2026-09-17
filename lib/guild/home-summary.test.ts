import { describe, expect, it } from "vitest";
import type { GuildNotification, IntroRequest, Profile, Quest } from "./types";
import { countIncomingRequests, countNewMembers, countNewQuests, isIncomingRequest } from "./home-summary";
import { profiles, quests } from "./mock-data";

const base = profiles[0];
const person = (id: string, joined_at: string): Profile => ({ ...base, id, joined_at });
const quest = (id: string, patch: Partial<Quest>): Quest => ({ ...quests[0], id, ...patch });

const intro = (id: string, requester_id: string, target_id: string): IntroRequest => ({
  id,
  requester_id,
  target_id,
  quest_id: null,
  purpose: "work",
  message: "",
  status: "proposed",
  outcome: null,
  created_at: "2026-09-14",
  updated_at: "2026-09-14",
});

const note = (patch: Partial<GuildNotification>): GuildNotification => ({
  id: "n",
  user_id: "me",
  kind: "quest_applied",
  actor_id: "a",
  quest_id: "q1",
  intro_request_id: null,
  intro_status: null,
  changed_fields: [],
  read_at: null,
  created_at: "2026-09-15",
  ...patch,
});

const intros = [intro("to-me", "x", "me"), intro("from-me", "me", "x")];
const lookup = (id: string) => intros.find((r) => r.id === id);

describe("isIncomingRequest", () => {
  it("参加したい は いらい", () => {
    expect(isIncomingRequest(note({}), lookup)).toBe(true);
  });

  it("自分あての しょうかいの打診 は いらい", () => {
    expect(
      isIncomingRequest(note({ kind: "intro_progress", intro_request_id: "to-me", intro_status: "proposed" }), lookup),
    ).toBe(true);
  });

  it("自分が頼んだ しょうかいの進み は いらい ではない", () => {
    expect(
      isIncomingRequest(note({ kind: "intro_progress", intro_request_id: "from-me", intro_status: "proposed" }), lookup),
    ).toBe(false);
  });

  it("打診のあとの進み（承諾など）は 数えない", () => {
    expect(
      isIncomingRequest(note({ kind: "intro_progress", intro_request_id: "to-me", intro_status: "accepted" }), lookup),
    ).toBe(false);
  });

  it("クエストの変更・取り下げ は いらい ではない", () => {
    expect(isIncomingRequest(note({ kind: "quest_updated" }), lookup)).toBe(false);
    expect(isIncomingRequest(note({ kind: "quest_withdrawn" }), lookup)).toBe(false);
  });
});

describe("countIncomingRequests", () => {
  it("読んだものは数えない", () => {
    const items = [note({ id: "1" }), note({ id: "2", read_at: "2026-09-15" }), note({ id: "3", kind: "quest_updated" })];
    expect(countIncomingRequests(items, lookup)).toBe(1);
  });
});

describe("countNewMembers", () => {
  const me = person("me", "2026-09-05");
  const all = [me, person("old", "2026-09-01"), person("mid", "2026-09-08"), person("new", "2026-09-10")];

  it("開いた時刻より後に 加入した人だけ（同じ時刻は数えない・自分は数えない）", () => {
    expect(countNewMembers(all, me, { members_seen_at: "2026-09-08", quests_seen_at: null })).toBe(1);
  });

  it("一度も開いていなければ 自分の加入より後の人だけ", () => {
    expect(countNewMembers(all, me, { members_seen_at: null, quests_seen_at: null })).toBe(2);
  });
});

describe("countNewQuests", () => {
  const me = person("me", "2026-09-05");
  const seen = { members_seen_at: null, quests_seen_at: "2026-09-10" };

  it("開いた時刻より後に 出た、募集中の、ほかの人のクエストだけ", () => {
    const list = [
      quest("before", { created_at: "2026-09-09", status: "open", creator_id: "a" }),
      quest("new", { created_at: "2026-09-11", status: "open", creator_id: "a" }),
      quest("mine", { created_at: "2026-09-11", status: "open", creator_id: "me" }),
      quest("withdrawn", { created_at: "2026-09-11", status: "withdrawn", creator_id: "a" }),
      quest("running", { created_at: "2026-09-11", status: "in_progress", creator_id: "a" }),
    ];
    expect(countNewQuests(list, me, seen)).toBe(1);
  });
});
