import { describe, expect, it } from "vitest";
import {
  CONNECTIONS,
  EMPTY_FILTER,
  ME_ID,
  PEOPLE,
  POSTS,
  COMPANIES,
  RECENT_CONNECTIONS,
  ANSWER_LABEL,
  REGIONS,
  REGION_NAMES,
  dueInfo,
  filterByRegion,
  friendRegions,
  kindOfPerson,
  postRegions,
  regionCounts,
  regionOf,
  routeTo,
  sortByCloseness,
  suggestIntroducee,
  BUSINESS_CARDS,
  EMPTY_POST_DRAFT,
  INCOMING_INTRO_REQUESTS,
  WANT_ANSWERS,
  answerCount,
  answersFor,
  areaText,
  directPeople,
  duplicatePairs,
  filterWantPosts,
  findPerson,
  hasSameCard,
  joinLines,
  makeCard,
  makeWantPost,
  markInvited,
  mergeCards,
  mergeOrder,
  pairKey,
  secondDegreePeople,
  splitLines,
  validateCardInput,
  validatePostDraft,
  wantPosts,
  relationText,
  relationTo,
  relationToCompany,
  searchCompanies,
  searchPeople,
} from "./sns-mock";

describe("仮データのつじつま", () => {
  it("つながり・投稿・最近つながった人は、いる人だけを指す", () => {
    for (const [a, b] of CONNECTIONS) {
      expect(findPerson(a), a).not.toBeNull();
      expect(findPerson(b), b).not.toBeNull();
    }
    for (const p of POSTS) expect(findPerson(p.authorId), p.id).not.toBeNull();
    for (const id of RECENT_CONNECTIONS) expect(relationTo(id).kind, id).toBe("direct");
  });
  it("自分以外の人は、いる会社に所属している", () => {
    const ids = new Set(COMPANIES.map((c) => c.id));
    for (const p of PEOPLE.filter((x) => x.id !== ME_ID)) expect(ids.has(p.companyId), p.id).toBe(true);
  });
});

describe("つながり（紹介の道は2段まで）", () => {
  it("直接の知り合い", () => {
    expect(relationTo("sato")).toEqual({ kind: "direct" });
  });
  it("知り合いの知り合いは、間の知り合いを返す", () => {
    const r = relationTo("yamamoto");
    expect(r.kind).toBe("via");
    if (r.kind === "via") expect(["sato", "mori"]).toContain(r.via.id);
  });
  it("紹介の道を見せない人は、知り合いの知り合いでも道なし", () => {
    // 北村さんは湊さん（知り合い）の知り合いだが、openToIntro=false
    expect(relationTo("kitamura")).toEqual({ kind: "none" });
  });
  it("いない人は道なし", () => {
    expect(relationTo("nobody")).toEqual({ kind: "none" });
  });
  it("自分", () => {
    expect(relationTo(ME_ID)).toEqual({ kind: "self" });
  });
  it("会社とのつながりは、所属する人のうちいちばん近い人", () => {
    expect(relationToCompany("minato-setsubi").relation.kind).toBe("direct");
    expect(relationToCompany("yamamoto-densetsu").person?.id).toBe("yamamoto");
    expect(relationToCompany("hokushin").relation.kind).toBe("none");
  });
  it("一文", () => {
    expect(relationText({ kind: "direct" })).toBe("あなたの知り合いです");
    const via = findPerson("sato")!;
    expect(relationText({ kind: "via", via })).toBe("佐藤さん経由で紹介できます");
  });
});

describe("探す", () => {
  it("条件なしなら自分以外の全員。紹介できる順（知り合い → 知り合いの知り合い → それ以外）", () => {
    const people = searchPeople(EMPTY_FILTER);
    expect(people.find((p) => p.id === ME_ID)).toBeUndefined();
    expect(people).toHaveLength(PEOPLE.length - 1);
    const order = { direct: 0, via: 1, none: 2, self: 3 } as const;
    const kinds = people.map((p) => order[relationTo(p.id).kind]);
    expect(kinds).toEqual([...kinds].sort((a, b) => a - b));
  });
  it("地域は対応エリアで絞る（所在地ではない）", () => {
    const kanto = searchCompanies({ ...EMPTY_FILTER, regions: ["関東"] }).map((c) => c.id);
    expect(kanto).toContain("nakamura-fudosan");
    expect(kanto).not.toContain("sato-komuten");
  });
  it("言葉は全部ふくむものだけ（空白で区切る）", () => {
    // 関東にかかる電気工事の会社は3社。並びは知り合い（湊さん）→ 知り合いの知り合い（山本さん）→ 道なし
    expect(searchCompanies({ ...EMPTY_FILTER, query: "電気工事 関東" }).map((c) => c.id)).toEqual(["minato-setsubi", "yamamoto-densetsu", "hokushin"]);
    expect(searchCompanies({ ...EMPTY_FILTER, query: "電気工事 九州" })).toEqual([]);
    expect(searchPeople({ ...EMPTY_FILTER, query: "太陽光" }).map((p) => p.id)).toEqual(["yamamoto", "kitamura"]);
  });
  it("確認済みの許可だけ・紹介できる人だけ", () => {
    expect(searchCompanies({ ...EMPTY_FILTER, licensedOnly: true }).map((c) => c.id)).not.toContain("minato-setsubi");
    expect(searchPeople({ ...EMPTY_FILTER, introducibleOnly: true }).map((p) => p.id)).not.toContain("kitamura");
  });
});

describe("対応エリアの見せ方", () => {
  it("地域を丸ごと覆えば「〇〇全域」", () => {
    expect(areaText(["東京都", "神奈川県", "埼玉県", "千葉県", "茨城県", "栃木県", "群馬県"])).toBe("関東全域");
    expect(areaText(["東京都", "神奈川県"])).toBe("東京都・神奈川県");
  });
});

describe("人脈", () => {
  it("知り合いは相互承認済みの人だけ。知り合いの知り合いは道を見せる人だけ", () => {
    expect(directPeople().map((p) => p.id).sort()).toEqual(["minato", "mori", "nakamura", "ono", "sato"]);
    const second = secondDegreePeople().map((p) => p.id);
    expect(second).toContain("yamamoto");
    expect(second).not.toContain("kitamura");
    expect(second).not.toContain("sato");
    for (const id of second) expect(relationTo(id).kind).toBe("via");
  });
  it("届いた紹介のおねがいは、いる人を指す", () => {
    for (const r of INCOMING_INTRO_REQUESTS) {
      expect(findPerson(r.fromId)).not.toBeNull();
      expect(findPerson(r.toId)).not.toBeNull();
    }
  });
});

describe("案件", () => {
  it("カテゴリーで絞る。null はすべて", () => {
    const all = wantPosts();
    expect(filterWantPosts(all, null)).toHaveLength(all.length);
    const partner = filterWantPosts(all, "seek-partner");
    expect(partner.length).toBeGreaterThan(0);
    expect(partner.every((p) => p.category === "seek-partner")).toBe(true);
  });
  it("自分の投稿は先頭に出る", () => {
    const mine = makeWantPost({ ...EMPTY_POST_DRAFT, title: "t", category: "other", industry: "建設", regions: ["関東"], detail: "d", contact: "c" }, "my-1");
    expect(wantPosts([mine])[0].id).toBe("my-1");
  });
  it("見本の答えの数は、投稿の数字と合っている", () => {
    for (const p of wantPosts()) {
      expect(answerCount(p.id, "know"), p.id).toBe(p.knowCount);
      expect(answerCount(p.id, "can"), p.id).toBe(p.canDoCount);
    }
    for (const a of WANT_ANSWERS) expect(findPerson(a.personId)).not.toBeNull();
  });
  it("自分の答えは答えの一覧に足される", () => {
    const mine = [{ postId: "p1", kind: "can" as const, personId: ME_ID, note: "x" }];
    expect(answersFor("p1", mine)).toHaveLength(answersFor("p1").length + 1);
    expect(answerCount("p1", "can", mine)).toBe(2);
  });
  it("投稿の入力の確かめ：空は理由つきで止める", () => {
    const e = validatePostDraft(EMPTY_POST_DRAFT, "2026-10-30");
    expect(Object.keys(e).sort()).toEqual(["category", "contact", "detail", "industry", "regions", "title"]);
    const ok = { ...EMPTY_POST_DRAFT, title: "t", category: "other" as const, industry: "建設" as const, regions: ["関東"], detail: "d", contact: "c" };
    expect(validatePostDraft(ok, "2026-10-30")).toEqual({});
    expect(validatePostDraft({ ...ok, deadline: "2026-10-29" }, "2026-10-30").deadline).toBeTruthy();
    expect(validatePostDraft({ ...ok, deadline: "2026-10-30" }, "2026-10-30")).toEqual({});
    expect(validatePostDraft({ ...ok, title: "   " }, "2026-10-30").title).toBeTruthy();
  });
  it("確かめを通っていない入力から投稿は作れない", () => {
    expect(() => makeWantPost(EMPTY_POST_DRAFT, "x")).toThrow();
  });
});

describe("自分のプロフィールの欄", () => {
  it("1行に1つ：空行・重複を捨て、上限で切る", () => {
    expect(splitLines(" a \n\n b\r\na\n")).toEqual(["a", "b"]);
    expect(splitLines("1\n2\n3", 2)).toEqual(["1", "2"]);
    expect(splitLines("")).toEqual([]);
    expect(splitLines(joinLines(["x", "y"]))).toEqual(["x", "y"]);
  });
});

describe("管理者：名刺の仮登録", () => {
  it("入力の確かめ", () => {
    expect(Object.keys(validateCardInput({ name: " ", company: "" })).sort()).toEqual(["company", "name"]);
    expect(validateCardInput({ name: "a", company: "b" })).toEqual({});
  });
  it("手で入れた名刺は未招待・非公開から。番号は続き", () => {
    const c = makeCard(BUSINESS_CARDS, { name: " 新井 ", company: "新井組" }, "2026-10-30");
    expect(c).toMatchObject({ id: "c10", name: "新井", status: "uninvited", registeredOn: "2026-10-30" });
  });
  it("同じ名刺は「株式会社」や空白の違いを無視して見つける", () => {
    expect(hasSameCard(BUSINESS_CARDS, { name: "山本隆", company: "(株)山本電設" })).toBe(true);
    expect(hasSameCard(BUSINESS_CARDS, { name: "山本 隆", company: "別の会社" })).toBe(false);
  });
  it("重複の候補：同じ名前か同じ会社。別の人と選んだ組は出ない", () => {
    const pairs = duplicatePairs(BUSINESS_CARDS);
    const keys = pairs.map((p) => p.key);
    expect(keys).toContain(pairKey("c1", "c5"));
    expect(keys).toContain(pairKey("c1", "c6"));
    expect(pairs.find((p) => p.key === pairKey("c1", "c5"))?.reasons).toEqual(["同じ名前", "同じ会社"]);
    expect(pairs.find((p) => p.key === pairKey("c1", "c6"))?.reasons).toEqual(["同じ会社"]);
    expect(keys).not.toContain(pairKey("c2", "c3"));
    expect(duplicatePairs(BUSINESS_CARDS, new Set([pairKey("c1", "c5")])).map((p) => p.key)).not.toContain(pairKey("c1", "c5"));
  });
  it("まとめる：先に登録した方を残し、状態は進んだ方に合わせる", () => {
    const a = BUSINESS_CARDS.find((c) => c.id === "c1")!;
    const b = BUSINESS_CARDS.find((c) => c.id === "c5")!;
    expect(mergeOrder(b, a)).toEqual({ keep: a, drop: b });
    // 消す方に進んだ状態があれば、残す方がそれを引き継ぐ
    const merged = mergeCards(BUSINESS_CARDS, "c5", "c1");
    expect(merged.find((c) => c.id === "c1")).toBeUndefined();
    expect(merged.find((c) => c.id === "c5")?.status).toBe("approved");
    expect(mergeCards(BUSINESS_CARDS, "zz", "c1")).toHaveLength(BUSINESS_CARDS.length);
  });
  it("招待URLを渡すと招待中になる（承認ずみはそのまま）", () => {
    expect(markInvited(BUSINESS_CARDS, "c4").find((c) => c.id === "c4")?.status).toBe("invited");
    expect(markInvited(BUSINESS_CARDS, "c1").find((c) => c.id === "c1")?.status).toBe("approved");
  });
});

describe("地域（8つ）", () => {
  it("8つの地域に、どの都道府県も1回だけ入る", () => {
    expect(REGION_NAMES).toEqual(["北海道", "東北", "関東", "中部", "関西", "中国", "四国", "九州"]);
    const all = REGION_NAMES.flatMap((r) => REGIONS[r]);
    expect(all).toHaveLength(47);
    expect(new Set(all).size).toBe(47);
  });
  it("都道府県でも地域名でも同じ地域に引ける", () => {
    expect(regionOf("神奈川県")).toBe("関東");
    expect(regionOf("関西")).toBe("関西");
    expect(regionOf("沖縄県")).toBe("九州");
    expect(regionOf("どこか")).toBeNull();
  });
  it("案件の地域は地域名にそろい、重複しない", () => {
    expect(postRegions({ areas: ["東京都", "神奈川県", "大阪府"] })).toEqual(["関東", "関西"]);
    expect(postRegions({ areas: ["関東", "東京都"] })).toEqual(["関東"]);
  });
  it("地域ごとの案件の数（0件の地域も入る）と、地域で絞る", () => {
    const all = wantPosts();
    const counts = regionCounts(all);
    expect(Object.keys(counts)).toEqual(REGION_NAMES);
    expect(counts["北海道"]).toBe(0);
    expect(counts["関東"]).toBeGreaterThan(0);
    expect(filterByRegion(all, "関東")).toHaveLength(counts["関東"]);
    expect(filterByRegion(all, null)).toHaveLength(all.length);
    expect(filterByRegion(all, "関東").every((p) => postRegions(p).includes("関東"))).toBe(true);
  });
  it("知り合いがいる地域は、直接の知り合いの所在地から", () => {
    const r = friendRegions();
    expect(r.has("関東")).toBe(true);
    expect(r.has("関西")).toBe(true);
    expect(r.has("九州")).toBe(true);
    expect(r.has("北海道")).toBe(false);
  });
});

describe("業種の色・紹介の道・期限", () => {
  it("顔の種類：自分は me、会社の最初の業種で決まる", () => {
    expect(kindOfPerson(findPerson(ME_ID)!)).toBe("me");
    expect(kindOfPerson(findPerson("sato")!)).toBe("build");
    expect(kindOfPerson(findPerson("nakamura")!)).toBe("estate");
    expect(kindOfPerson(findPerson("mori")!)).toBe("pro");
  });
  it("紹介の道：直接は1人、知り合いの知り合いは間の人と相手、道なし・自分は空", () => {
    expect(routeTo("sato").map((p) => p.id)).toEqual(["sato"]);
    const via = routeTo("yamamoto");
    expect(via).toHaveLength(2);
    expect(via[1].id).toBe("yamamoto");
    expect(["sato", "mori"]).toContain(via[0].id);
    expect(routeTo("kitamura")).toEqual([]);
    expect(routeTo(ME_ID)).toEqual([]);
  });
  it("期限：7日以内は赤、過ぎたら過ぎた、なしは null", () => {
    expect(dueInfo(null, "2026-10-31")).toBeNull();
    expect(dueInfo("2026-11-07", "2026-10-31")).toEqual({ label: "11/07まで", soon: true, past: false });
    expect(dueInfo("2026-11-08", "2026-10-31")?.soon).toBe(false);
    expect(dueInfo("2026-10-31", "2026-10-31")?.soon).toBe(true);
    expect(dueInfo("2026-10-30", "2026-10-31")).toMatchObject({ past: true, soon: false });
  });
  it("近い順：自分の依頼 → 知り合い → 知り合いの知り合い → 道なし。同じ近さは元の並び", () => {
    const mine = makeWantPost({ ...EMPTY_POST_DRAFT, title: "t", category: "other", industry: "建設", regions: ["関東"], detail: "d", contact: "c" }, "my-1");
    const sorted = sortByCloseness(wantPosts([mine]));
    expect(sorted[0].id).toBe("my-1");
    const rank = (authorId: string) => (authorId === ME_ID ? 0 : routeTo(authorId).length || 3);
    const ranks = sorted.map((p) => rank(p.authorId));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
  it("案件で「この人を紹介する」と出せる知り合いは、同じ業種の知り合い。いなければ null", () => {
    const p1 = wantPosts().find((p) => p.id === "p1")!;
    const who = suggestIntroducee(p1);
    expect(who).not.toBeNull();
    expect(relationTo(who!.id).kind).toBe("direct");
    expect(who!.id).not.toBe(p1.authorId);
    expect(suggestIntroducee({ ...p1, industry: "その他" })).toBeNull();
  });
  it("返事の言葉（10-31）", () => {
    expect(ANSWER_LABEL).toEqual({ know: "知り合いを紹介する", can: "うちで受けたい" });
  });
});
