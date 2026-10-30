import { describe, expect, it } from "vitest";
import { MOCK_NOW_BASE } from "./kensetsu-mock";
import { initialState, reduce, statusOf, type MockAction, type MockState } from "./kensetsu-mock-state";

const run = (state: MockState, ...actions: MockAction[]) => actions.reduce(reduce, state);
const now = MOCK_NOW_BASE + 1000;

/** 送れる状態まで下書きを整える */
function ready(): MockState {
  return run(
    initialState(),
    { type: "startDraft", kind: "land" },
    { type: "patchDraft", patch: { prefecture: "大阪府", city: "吹田市", timing: "month", body: "土地を探しています。", consent: true } },
  );
}

describe("相談を出す", () => {
  it("同意が無いと送れない。送ると、受付の状態で先頭に入り、管理者にお知らせが行く", () => {
    const noConsent = run(ready(), { type: "patchDraft", patch: { consent: false } });
    expect(run(noConsent, { type: "submit", requesterId: "m-tanaka", now }).referrals).toHaveLength(noConsent.referrals.length);
    const sent = run(ready(), { type: "submit", requesterId: "m-tanaka", now });
    expect(sent.referrals[0]).toMatchObject({ status: "received", kind: "land", city: "吹田市", requesterId: "m-tanaka" });
    expect(sent.notices[0]).toMatchObject({ forMemberId: "m-admin", kind: "referral_received", read: false });
  });
  it("本文が空・時期が未選択なら送れない。同じ下書きは2回送れない", () => {
    const base = ready();
    expect(run(base, { type: "patchDraft", patch: { body: "  " } }, { type: "submit", requesterId: "m-tanaka", now }).referrals).toHaveLength(base.referrals.length);
    expect(run(base, { type: "patchDraft", patch: { timing: "" } }, { type: "submit", requesterId: "m-tanaka", now }).referrals).toHaveLength(base.referrals.length);
    const once = run(base, { type: "submit", requesterId: "m-tanaka", now });
    expect(run(once, { type: "submit", requesterId: "m-tanaka", now }).referrals).toHaveLength(once.referrals.length);
  });
  it("同じ種類の途中の下書きは残る。送り終えた・別の種類なら作り直す。写真は3枚まで", () => {
    const mid = ready();
    expect(run(mid, { type: "startDraft", kind: "land" }).draft.body).toBe("土地を探しています。");
    expect(run(mid, { type: "startDraft", kind: "vendor" }).draft.body).toBe("");
    const sent = run(mid, { type: "submit", requesterId: "m-tanaka", now });
    expect(run(sent, { type: "startDraft", kind: "land" }).draft.body).toBe("");
    const four = run(initialState(), { type: "addPhotos", photos: [1, 2, 3, 4].map((n) => ({ id: `p${n}`, name: "写真" })) });
    expect(four.draft.photos).toHaveLength(3);
    expect(run(four, { type: "addPhotos", photos: [{ id: "p9", name: "写真" }] }).draft.photos).toHaveLength(3);
  });
});

describe("管理者の動き（進む向きだけ）", () => {
  it("開くと確認済みに進み、出した人に知らせる。何度開いても1回だけ", () => {
    const once = run(initialState(), { type: "adminOpen", id: "r3", now });
    expect(statusOf(once, "r3")).toBe("reviewed");
    const twice = run(once, { type: "adminOpen", id: "r3", now });
    expect(twice.notices).toHaveLength(once.notices.length);
  });
  it("受付箱から直接渡すと、確認の日時も入る。渡し先が追跡に出る", () => {
    const s = run(initialState(), { type: "pass", id: "r3", receiverId: "p-subsidy", now });
    const r = s.referrals.find((x) => x.id === "r3")!;
    expect(r).toMatchObject({ status: "passed", passedToId: "p-subsidy", passedAt: now, reviewedAt: now });
  });
  it("土地・物件を免許の印が無い先へ渡しても、止まらない（注意を出すだけ）", () => {
    const s = run(initialState(), { type: "pass", id: "r2", receiverId: "p-welltech", now });
    expect(statusOf(s, "r2")).toBe("passed");
  });
  it("つながるのは、渡したあとだけ。受け付けのまま つながった、にはできない", () => {
    expect(statusOf(run(initialState(), { type: "connect", id: "r3", now }), "r3")).toBe("received");
    expect(statusOf(run(initialState(), { type: "connect", id: "r1", now }), "r1")).toBe("connected");
  });
  it("戻す・やり直すは止まる（つながった／渡した／終わったあと）", () => {
    const connected = run(initialState(), { type: "connect", id: "r1", now });
    expect(statusOf(run(connected, { type: "pass", id: "r1", receiverId: "p-miyako", now }), "r1")).toBe("connected");
    expect(statusOf(run(connected, { type: "withdraw", id: "r1", now }), "r1")).toBe("connected");
    expect(statusOf(run(initialState(), { type: "adminOpen", id: "r1", now }), "r1")).toBe("passed");
    expect(statusOf(run(initialState(), { type: "pass", id: "r5", receiverId: "p-miyako", now }), "r5")).toBe("connected");
  });
  it("見送りはひとこと必須。黙って見送れない。見送ると、出した人と手を挙げた人に知らせる", () => {
    expect(statusOf(run(initialState(), { type: "decline", id: "r6", note: "  ", now }), "r6")).toBe("reviewed");
    const s = run(initialState(), { type: "decline", id: "r6", note: "条件に合う先がありません", now });
    expect(s.referrals.find((r) => r.id === "r6")).toMatchObject({ status: "declined", closeNote: "条件に合う先がありません" });
    expect(s.notices.some((n) => n.forMemberId === "m-sasaki" && n.kind === "referral_progress")).toBe(true);
    expect(s.notices.some((n) => n.forMemberId === "m-yamamoto" && n.kind === "hand_reply")).toBe(true);
  });
  it("取り下げは 渡す前まで。渡したあとは止まる", () => {
    expect(statusOf(run(initialState(), { type: "withdraw", id: "r4", now }), "r4")).toBe("withdrawn");
    expect(statusOf(run(initialState(), { type: "withdraw", id: "r1", now }), "r1")).toBe("passed");
  });
  it("渡すと出した人に知らせる。手を挙げた人に渡すと、その人へ返事が行く", () => {
    const s = run(initialState(), { type: "pass", id: "r6", receiverId: "m-yamamoto", now });
    expect(s.notices.some((n) => n.forMemberId === "m-sasaki" && n.text.includes("相談中"))).toBe(true);
    expect(s.notices.some((n) => n.forMemberId === "m-yamamoto" && n.kind === "hand_reply" && n.text.includes("管理者から連絡"))).toBe(true);
  });
});

describe("受ける人・お知らせ・プロフィール", () => {
  it("手を挙げるのは1回だけ。渡したあとの相談には挙げられない", () => {
    const once = run(initialState(), { type: "raiseHand", id: "r7", memberId: "m-yamamoto" });
    expect(once.referrals.find((r) => r.id === "r7")?.interestedIds).toEqual(["m-yamamoto"]);
    const twice = run(once, { type: "raiseHand", id: "r7", memberId: "m-yamamoto" });
    expect(twice.referrals.find((r) => r.id === "r7")?.interestedIds).toEqual(["m-yamamoto"]);
    expect(run(initialState(), { type: "raiseHand", id: "r1", memberId: "m-ito" }).referrals.find((r) => r.id === "r1")?.interestedIds).toEqual(["m-yamamoto"]);
  });
  it("お知らせは読んだら既読になる。プロフィールは保存した内容に変わる", () => {
    const read = run(initialState(), { type: "readNotice", id: "n1" });
    expect(read.notices.find((n) => n.id === "n1")?.read).toBe(true);
    const saved = run(initialState(), { type: "saveProfile", memberId: "m-tanaka", patch: { industry: "roof", areas: ["大阪府", "奈良県"], hasConstructionLicense: true } });
    expect(saved.members.find((m) => m.id === "m-tanaka")).toMatchObject({ industry: "roof", areas: ["大阪府", "奈良県"], hasConstructionLicense: true });
  });
});
