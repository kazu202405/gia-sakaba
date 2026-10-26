import { describe, expect, it } from "vitest";
import {
  BODY_MAX,
  INBOX_TABS,
  INDUSTRIES,
  KINDS,
  LAND_NOTICE,
  MEMBERS,
  MOCK_NOW_BASE,
  MOCK_STORE,
  PARTNERS,
  PREFECTURES,
  ROLES,
  SEED_NOTICES,
  SEED_REFERRALS,
  SEND_LIMIT,
  STATUS_FLOW,
  TIMINGS,
  buildPassMessage,
  canTransition,
  canWithdraw,
  findReceiver,
  formatJst,
  inboxTabOf,
  matchesMember,
  parseRole,
  partnersForKind,
  passWarning,
  reachedSteps,
  receiverFromPartner,
  remainingSends,
  statusText,
  validateStep,
  type Referral,
  type Status,
} from "./kensetsu-mock";

const HOUR = 3600 * 1000;
const base = (over: Partial<Referral> = {}): Referral => ({
  id: "x", requesterId: "m-tanaka", kind: "construction", prefecture: "大阪府", city: "堺市", timing: "month", body: "屋根の雨漏りです。", photos: [],
  status: "received", createdAt: MOCK_NOW_BASE, interestedIds: [], ...over,
});

describe("定数（画面・テストが読む唯一の場所）", () => {
  it("種類は5つ、この順", () => {
    expect(KINDS.map((k) => k.key)).toEqual(["construction", "vendor", "land", "subsidy", "other"]);
    expect(KINDS.map((k) => k.label)).toEqual(["工事を頼みたい", "業者・職人を探している", "土地・物件のこと", "補助金・資金のこと", "その他"]);
  });
  it("時期は4つ、この順", () => {
    expect(TIMINGS.map((t) => t.label)).toEqual(["すぐ", "今月中", "3か月以内", "急がない"]);
  });
  it("状態の順番（追跡の4段）", () => {
    expect(STATUS_FLOW).toEqual(["received", "reviewed", "passed", "connected"]);
  });
  it("24時間に3件・本文1000字", () => {
    expect(SEND_LIMIT).toEqual({ count: 3, windowHours: 24 });
    expect(BODY_MAX).toBe(1000);
  });
  it("都道府県は47、受付箱のタブは3つ、見る人は3人", () => {
    expect(PREFECTURES).toHaveLength(47);
    expect(new Set(PREFECTURES).size).toBe(47);
    expect(INBOX_TABS.map((t) => t.key)).toEqual(["new", "passed", "closed"]);
    expect(ROLES.map((r) => r.key)).toEqual(["requester", "member", "admin"]);
  });
  it("モックの外枠は、本物の建設・不動産の店（見た目 plain）の設定を読んでいる", () => {
    expect(MOCK_STORE?.slug).toBe("kensetsu-fudosan");
    expect(MOCK_STORE?.theme).toBe("plain");
  });
  it("?as= の知らない値は相談する人に倒れる", () => {
    expect(parseRole("admin")).toBe("admin");
    expect(parseRole("member")).toBe("member");
    expect(parseRole("x")).toBe("requester");
    expect(parseRole(null)).toBe("requester");
  });
});

describe("状態は進む向きだけ", () => {
  const all: Status[] = ["received", "reviewed", "passed", "connected", "declined", "withdrawn"];
  it("戻す動きは1つも許さない", () => {
    for (let i = 0; i < STATUS_FLOW.length; i++) {
      for (let j = 0; j <= i; j++) expect(canTransition(STATUS_FLOW[i], STATUS_FLOW[j])).toBe(false);
    }
  });
  it("つながる前に つながった、には飛べない（received → connected、reviewed → connected）", () => {
    expect(canTransition("received", "connected")).toBe(false);
    expect(canTransition("reviewed", "connected")).toBe(false);
  });
  it("終わった状態からは どこへも動かない", () => {
    for (const from of ["connected", "declined", "withdrawn"] as Status[]) {
      for (const to of all) expect(canTransition(from, to)).toBe(false);
    }
  });
  it("受付箱から直接渡せる（確認と渡すを同時）。順番どおりの動きは通る", () => {
    expect(canTransition("received", "reviewed")).toBe(true);
    expect(canTransition("received", "passed")).toBe(true);
    expect(canTransition("reviewed", "passed")).toBe(true);
    expect(canTransition("passed", "connected")).toBe(true);
  });
  it("取り下げられるのは 受け付け〜確認まで", () => {
    expect(canWithdraw("received")).toBe(true);
    expect(canWithdraw("reviewed")).toBe(true);
    expect(canWithdraw("passed")).toBe(false);
    expect(canWithdraw("connected")).toBe(false);
  });
  it("受付箱のタブ分け・線の段数・状態の文", () => {
    expect(inboxTabOf("received")).toBe("new");
    expect(inboxTabOf("reviewed")).toBe("new");
    expect(inboxTabOf("passed")).toBe("passed");
    expect((["connected", "declined", "withdrawn"] as Status[]).map(inboxTabOf)).toEqual(["closed", "closed", "closed"]);
    expect(STATUS_FLOW.map(reachedSteps)).toEqual([1, 2, 3, 4]);
    expect(reachedSteps("declined")).toBe(0);
    expect(statusText({ status: "passed", passedToId: "p-welltech" })).toBe("ウェルテック（仮）に相談中");
  });
});

describe("送れる件数・入力の確認", () => {
  it("24時間に3件まで。4件目は残り0。24時間より前の分は数えない", () => {
    const t = MOCK_NOW_BASE;
    const three = [base({ id: "a", createdAt: t - 1 * HOUR }), base({ id: "b", createdAt: t - 5 * HOUR }), base({ id: "c", createdAt: t - 23 * HOUR })];
    expect(remainingSends(three, "m-tanaka", t)).toBe(0);
    expect(remainingSends(three.slice(0, 2), "m-tanaka", t)).toBe(1);
    expect(remainingSends([...three.slice(0, 2), base({ id: "d", createdAt: t - 25 * HOUR })], "m-tanaka", t)).toBe(1);
  });
  it("取り下げた分も数える。ほかの人の分は数えない", () => {
    const t = MOCK_NOW_BASE;
    expect(remainingSends([base({ status: "withdrawn", createdAt: t - HOUR })], "m-tanaka", t)).toBe(2);
    expect(remainingSends([base({ requesterId: "m-ito", createdAt: t - HOUR })], "m-tanaka", t)).toBe(3);
  });
  it("空のまま次へは進めない（理由つき）", () => {
    expect(validateStep(1, { prefecture: "", timing: "", body: "" })?.field).toBe("prefecture");
    expect(validateStep(1, { prefecture: "大阪府", timing: "", body: "" })).toBeNull();
    expect(validateStep(2, { prefecture: "大阪府", timing: "", body: "" })?.field).toBe("timing");
    expect(validateStep(2, { prefecture: "大阪府", timing: "month", body: "" })).toBeNull();
    expect(validateStep(3, { prefecture: "大阪府", timing: "month", body: "  \n " })?.field).toBe("body");
    expect(validateStep(3, { prefecture: "大阪府", timing: "month", body: "あ".repeat(BODY_MAX + 1) })?.field).toBe("body");
    expect(validateStep(3, { prefecture: "大阪府", timing: "month", body: "あ" })).toBeNull();
  });
});

describe("渡す前の注意・合う渡し先・届く相談", () => {
  const welltech = receiverFromPartner(PARTNERS.find((p) => p.id === "p-welltech")!);
  const miyako = receiverFromPartner(PARTNERS.find((p) => p.id === "p-miyako")!);
  it("土地・物件を、宅建免許の印が無い先へ渡すときだけ注意が出る（文を返すだけで、止めない）", () => {
    expect(passWarning("land", welltech)).toContain("宅建免許の印がありません");
    expect(passWarning("land", miyako)).toBeNull();
    expect(passWarning("construction", welltech)).toBeNull();
    expect(passWarning("subsidy", welltech)).toBeNull();
  });
  it("種類に合う渡し先", () => {
    const land = partnersForKind("land").map((p) => p.id);
    expect(land).toContain("p-miyako");
    expect(land).not.toContain("p-welltech");
    expect(partnersForKind("subsidy").map((p) => p.id)).toContain("p-subsidy");
  });
  it("土地・物件の案内文がある", () => {
    expect(LAND_NOTICE).toContain("免許のある会社");
  });
  it("届いた相談は 業種・エリアが合い、まだ渡す前で、自分の相談でないものだけ", () => {
    const yamamoto = MEMBERS.find((m) => m.id === "m-yamamoto")!;
    expect(matchesMember(base(), yamamoto)).toBe(true);
    expect(matchesMember(base({ prefecture: "東京都" }), yamamoto)).toBe(false);
    expect(matchesMember(base({ kind: "land" }), yamamoto)).toBe(false);
    expect(matchesMember(base({ status: "passed" }), yamamoto)).toBe(false);
    expect(matchesMember(base({ requesterId: yamamoto.id }), yamamoto)).toBe(false);
    expect(matchesMember(base(), MEMBERS.find((m) => m.id === "m-admin")!)).toBe(false);
  });
  it("渡す文面に 種類・場所・時期・本文が入る", () => {
    const text = buildPassMessage(base({ body: "雨漏りの修理" }), welltech, "田中さん");
    for (const part of ["ウェルテック（仮）", "工事を頼みたい", "大阪府堺市", "今月中", "田中さん", "雨漏りの修理"]) expect(text).toContain(part);
  });
});

describe("仮データの整合", () => {
  it("相談・お知らせ・会員の id は重ならない。渡し先は引ける", () => {
    expect(new Set(SEED_REFERRALS.map((r) => r.id)).size).toBe(SEED_REFERRALS.length);
    expect(new Set(SEED_NOTICES.map((n) => n.id)).size).toBe(SEED_NOTICES.length);
    expect(new Set(MEMBERS.map((m) => m.id)).size).toBe(MEMBERS.length);
    for (const r of SEED_REFERRALS) {
      if (r.passedToId) expect(findReceiver(r.passedToId)).not.toBeNull();
      expect(PREFECTURES).toContain(r.prefecture);
    }
    for (const m of MEMBERS) for (const a of m.areas) expect(PREFECTURES).toContain(a);
    for (const m of MEMBERS) if (m.industry) expect(INDUSTRIES.map((i) => i.key)).toContain(m.industry);
  });
  it("日時と状態が食い違わない（渡した相談には渡した日時と渡し先がある）", () => {
    for (const r of SEED_REFERRALS) {
      if (r.status === "passed" || r.status === "connected") {
        expect(r.passedAt).toBeTypeOf("number");
        expect(r.passedToId).toBeTruthy();
      }
      if (r.status === "connected") expect(r.connectedAt).toBeTypeOf("number");
      if (r.status === "declined") expect(r.closeNote?.trim()).toBeTruthy();
      if (r.reviewedAt) expect(r.reviewedAt).toBeGreaterThanOrEqual(r.createdAt);
    }
  });
  it("見本に 全部の状態と、各タブの相談が入っている", () => {
    const statuses = new Set(SEED_REFERRALS.map((r) => r.status));
    for (const s of ["received", "reviewed", "passed", "connected", "declined"] as Status[]) expect(statuses.has(s)).toBe(true);
    for (const t of INBOX_TABS) expect(SEED_REFERRALS.some((r) => inboxTabOf(r.status) === t.key)).toBe(true);
  });
  it("時刻の表示は日本時間で固定", () => {
    expect(formatJst(Date.parse("2026-10-26T09:12:00+09:00"))).toBe("10月26日 9:12");
    expect(formatJst(Date.parse("2026-10-26T00:05:00Z"))).toBe("10月26日 9:05");
  });
});
