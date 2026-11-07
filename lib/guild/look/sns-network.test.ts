import { describe, expect, it } from "vitest";
import {
  BASE_NET,
  EMPTY_FILTER,
  INTRO_RECORDS_SEED,
  ME_ID,
  NET_SETTINGS_SEED,
  PEOPLE,
  canReveal,
  defaultLevelOf,
  findPerson,
  introEventText,
  introName,
  introStatusText,
  makeDirectMessage,
  maskedConnections,
  maskedHeadline,
  maskedLabel,
  newestFirst,
  relationText,
  relationTo,
  relationToCompany,
  routeTo,
  searchPeople,
  withConnection,
  withOwnerSettings,
  type NetState,
} from "./sns-mock";
import {
  DEFAULT_NET_LEVEL,
  INTRO_NOTE_MAX,
  acceptIntro,
  approveIntro,
  awaitingReply,
  choiceOf,
  createIntroRequest,
  declineIntro,
  feeText,
  hasOpenRequest,
  levelFromChoice,
  levelOf,
  nextIntroId,
  refuseIntro,
  roleClass,
  validateFee,
  type IntroRecord,
} from "./sns-network";

const ids = (people: readonly { id: string }[]) => people.map((p) => p.id);

describe("公開レベル（levelOf）", () => {
  it("個別が一括より優先。何も書いていなければ intro", () => {
    expect(levelOf(NET_SETTINGS_SEED, "sato", "yamamoto")).toBe("open");
    expect(levelOf(NET_SETTINGS_SEED, "sato", "hayashi")).toBe("masked");
    expect(levelOf(NET_SETTINGS_SEED, "sato", "someone")).toBe("intro"); // 一括
    expect(levelOf(NET_SETTINGS_SEED, "ono", "tanaka")).toBe("hidden");
    expect(levelOf(NET_SETTINGS_SEED, "mori", "yamamoto")).toBe(DEFAULT_NET_LEVEL);
    expect(levelOf({ defaults: {}, overrides: {} }, "x", "y")).toBe("intro");
    // 一括を変えても、個別は動かない
    const s = { defaults: { sato: "hidden" as const }, overrides: { sato: { yamamoto: "open" as const } } };
    expect(levelOf(s, "sato", "yamamoto")).toBe("open");
    expect(levelOf(s, "sato", "hayashi")).toBe("hidden");
  });
  it("3段階の選択と、名前を伏せるチェック（チェックは非表示のときだけ効く）", () => {
    expect(levelFromChoice("hidden", true)).toBe("masked");
    expect(levelFromChoice("hidden", false)).toBe("hidden");
    expect(levelFromChoice("open", true)).toBe("open");
    expect(levelFromChoice("intro", true)).toBe("intro");
    expect(choiceOf("masked")).toBe("hidden");
    expect(choiceOf("intro")).toBe("intro");
  });
});

describe("つながりの判定（relationTo）", () => {
  it("山本＝佐藤経由（直接連絡OK）と森経由（紹介）の2人。直接連絡もできる", () => {
    const r = relationTo("yamamoto");
    expect(r.kind).toBe("via");
    if (r.kind !== "via") return;
    expect(ids(r.vias)).toEqual(["sato", "mori"]);
    expect(r.via.id).toBe("sato");
    expect(r.canDirect).toBe(true);
  });
  it("林＝佐藤経由で、名前を伏せる。札に名前は入らない", () => {
    const r = relationTo("hayashi");
    expect(r.kind).toBe("masked");
    if (r.kind !== "masked") return;
    expect(ids(r.vias)).toEqual(["sato"]);
    expect(r.label).toBe("不動産業の役員");
    expect(r.label).not.toContain("林");
    // 人の一覧・探すには、伏せた道を出さない
    expect(routeTo("hayashi")).toEqual([]);
  });
  it("田中＝中村経由だけ（小野経由は隠れている）", () => {
    const r = relationTo("tanaka");
    expect(r.kind).toBe("via");
    if (r.kind !== "via") return;
    expect(ids(r.vias)).toEqual(["nakamura"]);
    expect(r.canDirect).toBe(false);
  });
  it("北村＝本人が紹介の道を見せない設定なので、今までどおり道なし", () => {
    expect(relationTo("kitamura")).toEqual({ kind: "none" });
  });
  it("紹介される本人の設定がいちばん強い：間の人が open でも、本人が見せない設定なら道なし", () => {
    const net: NetState = { ...BASE_NET, settings: { ...BASE_NET.settings, overrides: { ...BASE_NET.settings.overrides, minato: { kitamura: "open" } } } };
    expect(findPerson("kitamura")!.openToIntro).toBe(false);
    expect(relationTo("kitamura", ME_ID, net)).toEqual({ kind: "none" });
  });
  it("自分の設定は、ほかの人の道にだけ効く（自分から見た結果は変わらない）", () => {
    const hideAll = withOwnerSettings(BASE_NET, ME_ID, "hidden", { sato: "masked", nakamura: "open" });
    for (const p of PEOPLE) expect(relationTo(p.id, ME_ID, hideAll), p.id).toEqual(relationTo(p.id));
    expect(defaultLevelOf(hideAll, ME_ID)).toBe("hidden");
    expect(defaultLevelOf(BASE_NET, ME_ID)).toBe("intro");
  });
  it("紹介でつながった人（extraConnections）は直接の知り合いになる", () => {
    const net = withConnection(BASE_NET, "yamamoto", ME_ID);
    expect(relationTo("yamamoto", ME_ID, net)).toEqual({ kind: "direct" });
    // もとの net は変わらない
    expect(relationTo("yamamoto").kind).toBe("via");
    // 2回足しても増えない
    expect(withConnection(net, ME_ID, "yamamoto").extraConnections).toHaveLength(1);
  });
  it("会社とのつながり：伏せた道は none と同じ（会社から伏せた人が分からない）", () => {
    const r = relationToCompany("hayashi-estate");
    expect(r.relation).toEqual({ kind: "none" });
    expect(r.person).toBeNull();
    expect(relationToCompany("yamamoto-densetsu").relation.kind).toBe("via");
  });
  it("伏せた人・隠れた人も、人としては今までどおり探せる", () => {
    const found = ids(searchPeople(EMPTY_FILTER));
    expect(found).toContain("hayashi");
    expect(found).toContain("tanaka");
  });
});

describe("連絡先・一文・伏せたつながり", () => {
  it("canReveal：伏せた相手には「全員に見せる」でも見せない", () => {
    const masked = relationTo("hayashi");
    expect(masked.kind).toBe("masked");
    expect(canReveal("all", masked)).toBe(false);
    expect(canReveal("friends", masked)).toBe(false);
    expect(canReveal("all", relationTo("yamamoto"))).toBe(true);
    expect(canReveal("friends", relationTo("yamamoto"))).toBe(false);
  });
  it("relationText：経由・直接連絡・伏せる", () => {
    const via = relationTo("yamamoto");
    expect(relationText(via)).toBe("佐藤さんほか1人経由で紹介できます。直接連絡もできます");
    expect(relationText(relationTo("tanaka"))).toBe("中村さん経由で紹介できます");
    expect(relationText(relationTo("hayashi"))).toBe("佐藤さんがつながりあり（名前は伏せています）");
  });
  it("maskedConnections：名前・id・会社名を出さず、たのめる人を持つ", () => {
    const list = maskedConnections();
    expect(list).toHaveLength(1);
    const m = list[0];
    expect(m.label).toBe("不動産業の役員");
    expect(ids(m.vias)).toEqual(["sato"]);
    expect(maskedHeadline(m)).toBe("不動産業の役員と佐藤さんがつながりあり");
    const shown = JSON.stringify({ key: m.key, label: m.label, headline: maskedHeadline(m) });
    for (const secret of ["林", "hayashi", "エステート", "ハヤシ"]) expect(shown).not.toContain(secret);
    expect(m.targetId).toBe("hayashi"); // 記録の中だけで使う
    // つながったら、伏せたつながりから消える
    expect(maskedConnections(ME_ID, withConnection(BASE_NET, ME_ID, "hayashi"))).toEqual([]);
  });
  it("roleClass・maskedLabel の境目", () => {
    expect(roleClass("代表取締役")).toBe("役員");
    expect(roleClass("取締役")).toBe("役員");
    expect(roleClass("代表")).toBe("役員");
    expect(roleClass("理事")).toBe("役員");
    expect(roleClass("工事部長")).toBe("管理職");
    expect(roleClass("支店長")).toBe("管理職");
    expect(roleClass("所長")).toBe("管理職");
    expect(roleClass("営業")).toBe("担当者");
    expect(roleClass("")).toBe("担当者");
    expect(maskedLabel(findPerson("hayashi")!)).toBe("不動産業の役員");
    expect(maskedLabel(findPerson("ono")!)).toBe("建設業の管理職");
    expect(maskedLabel(findPerson("mori")!)).toBe("士業の担当者");
    // 業種が「その他」なら、「〇〇業の」を付けない
    expect(maskedLabel(findPerson(ME_ID)!)).toBe("担当者");
    expect(maskedLabel({ title: "代表", companyId: "none" })).toBe("役員");
  });
});

describe("直接メッセージ", () => {
  it("直接連絡OKの相手（山本）にだけ作れる。ほかは何もしない", () => {
    const ok = makeDirectMessage(BASE_NET, "yamamoto", "  はじめまして  ", "2026-11-07");
    expect(ok).toMatchObject({ toId: "yamamoto", text: "はじめまして", at: "2026-11-07" });
    expect(makeDirectMessage(BASE_NET, "tanaka", "こんにちは", "2026-11-07")).toBeNull(); // 紹介経由のみ
    expect(makeDirectMessage(BASE_NET, "hayashi", "こんにちは", "2026-11-07")).toBeNull(); // 伏せている
    expect(makeDirectMessage(BASE_NET, "kitamura", "こんにちは", "2026-11-07")).toBeNull(); // 道なし
    expect(makeDirectMessage(BASE_NET, "sato", "こんにちは", "2026-11-07")).toBeNull(); // 知り合いは連絡先から
    expect(makeDirectMessage(BASE_NET, "yamamoto", "   ", "2026-11-07")).toBeNull();
    expect(makeDirectMessage(BASE_NET, "yamamoto", "あ".repeat(INTRO_NOTE_MAX + 1), "2026-11-07")).toBeNull();
    expect(makeDirectMessage(BASE_NET, "yamamoto", "あ".repeat(INTRO_NOTE_MAX), "2026-11-07")).not.toBeNull();
  });
  it("佐藤さんが直接連絡OKをやめると送れなくなる", () => {
    const net = withOwnerSettings(BASE_NET, "sato", "intro", {});
    expect(makeDirectMessage(net, "yamamoto", "こんにちは", "2026-11-07")).toBeNull();
  });
});

describe("紹介依頼の記録（2段の承認）", () => {
  const base = () => createIntroRequest({
    id: "r9", requesterId: ME_ID, introducerId: "sato", targetId: "yamamoto", note: "  九州の件です ", maskedForRequester: false, at: "2026-11-07",
  })!;

  it("requested → approve → accept で connected。履歴は3件で、紹介料が残る", () => {
    const r0 = base();
    expect(r0.status).toBe("requested");
    expect(r0.fee).toBeNull();
    expect(r0.note).toBe("九州の件です");
    const r1 = approveIntro(r0, "sato", { kind: "percent", percent: 3 }, "よろしく", "2026-11-08")!;
    expect(r1.status).toBe("asking_target");
    const r2 = acceptIntro(r1, "yamamoto", "了解です", "2026-11-09")!;
    expect(r2.status).toBe("connected");
    expect(r2.events.map((e) => e.status)).toEqual(["requested", "asking_target", "connected"]);
    expect(r2.events.map((e) => e.byId)).toEqual([ME_ID, "sato", "yamamoto"]);
    expect(r2.fee).toEqual({ kind: "percent", percent: 3 });
    // 元の記録は書き換えない（履歴は足すだけ）
    expect(r0.events).toHaveLength(1);
    expect(r0.status).toBe("requested");
    expect(r1.events).toHaveLength(2);
  });
  it("B 以外は承認も辞退もできない。requested でない記録は承認できない", () => {
    const r0 = base();
    expect(approveIntro(r0, ME_ID, { kind: "none" }, "", "d")).toBeNull();
    expect(approveIntro(r0, "yamamoto", { kind: "none" }, "", "d")).toBeNull();
    expect(declineIntro(r0, "yamamoto", "", "d")).toBeNull();
    const r1 = approveIntro(r0, "sato", { kind: "none" }, "", "d")!;
    expect(approveIntro(r1, "sato", { kind: "none" }, "", "d")).toBeNull(); // 二度は承認できない
    expect(declineIntro(r1, "sato", "", "d")).toBeNull();
  });
  it("紹介料が正しくなければ承認できない", () => {
    expect(approveIntro(base(), "sato", { kind: "fixed", yen: 0 }, "", "d")).toBeNull();
    expect(approveIntro(base(), "sato", { kind: "percent", percent: 60 }, "", "d")).toBeNull();
  });
  it("C 以外は了承もお断りもできない。asking_target でなければできない", () => {
    const r0 = base();
    expect(acceptIntro(r0, "yamamoto", "", "d")).toBeNull(); // まだ B の承認前
    expect(refuseIntro(r0, "yamamoto", "", "d")).toBeNull();
    const r1 = approveIntro(r0, "sato", { kind: "discuss" }, "", "d")!;
    expect(acceptIntro(r1, "sato", "", "d")).toBeNull();
    expect(acceptIntro(r1, ME_ID, "", "d")).toBeNull();
    expect(refuseIntro(r1, "sato", "", "d")).toBeNull();
    expect(acceptIntro(r1, "yamamoto", "", "d")?.status).toBe("connected");
  });
  it("辞退は2種類。終わった記録は動かせない", () => {
    const r0 = base();
    const d1 = declineIntro(r0, "sato", "いまは控えています", "2026-11-08")!;
    expect(d1.status).toBe("declined_by_introducer");
    expect(d1.events.at(-1)).toMatchObject({ byId: "sato", note: "いまは控えています" });
    expect(approveIntro(d1, "sato", { kind: "none" }, "", "d")).toBeNull();
    const r1 = approveIntro(r0, "sato", { kind: "none" }, "", "d")!;
    const d2 = refuseIntro(r1, "yamamoto", "", "2026-11-09")!;
    expect(d2.status).toBe("declined_by_target");
    expect(acceptIntro(d2, "yamamoto", "", "d")).toBeNull();
  });
  it("作るとき：用件は空不可・上限まで、3人は別人", () => {
    const args = { id: "r9", requesterId: ME_ID, introducerId: "sato", targetId: "yamamoto", maskedForRequester: false, at: "d" };
    expect(createIntroRequest({ ...args, note: "   " })).toBeNull();
    expect(createIntroRequest({ ...args, note: "あ".repeat(INTRO_NOTE_MAX + 1) })).toBeNull();
    expect(createIntroRequest({ ...args, note: "あ".repeat(INTRO_NOTE_MAX) })).not.toBeNull();
    expect(createIntroRequest({ ...args, note: "a", introducerId: ME_ID })).toBeNull();
    expect(createIntroRequest({ ...args, note: "a", targetId: "sato" })).toBeNull();
    expect(createIntroRequest({ ...args, note: "a", targetId: ME_ID })).toBeNull();
  });
  it("二重に頼めない：返事待ち（requested・asking_target）があれば true", () => {
    const r0 = base();
    expect(hasOpenRequest([r0], ME_ID, "yamamoto")).toBe(true);
    expect(hasOpenRequest([r0], ME_ID, "tanaka")).toBe(false);
    expect(hasOpenRequest([r0], "sato", "yamamoto")).toBe(false);
    const r1 = approveIntro(r0, "sato", { kind: "none" }, "", "d")!;
    expect(hasOpenRequest([r1], ME_ID, "yamamoto")).toBe(true);
    expect(hasOpenRequest([declineIntro(r0, "sato", "", "d")!], ME_ID, "yamamoto")).toBe(false);
    expect(hasOpenRequest([acceptIntro(r1, "yamamoto", "", "d")!], ME_ID, "yamamoto")).toBe(false);
  });
  it("次の id", () => {
    expect(nextIntroId([])).toBe("r1");
    expect(nextIntroId(INTRO_RECORDS_SEED)).toBe("r4");
  });
});

describe("紹介料の確かめと言い方", () => {
  it("validateFee：円は1〜10,000,000の整数、％は0.1〜50で小数1けたまで", () => {
    expect(validateFee({ kind: "none" })).toBeNull();
    expect(validateFee({ kind: "discuss" })).toBeNull();
    expect(validateFee({ kind: "fixed", yen: 1 })).toBeNull();
    expect(validateFee({ kind: "fixed", yen: 10_000_000 })).toBeNull();
    expect(validateFee({ kind: "fixed", yen: 0 })).not.toBeNull();
    expect(validateFee({ kind: "fixed", yen: 10_000_001 })).not.toBeNull();
    expect(validateFee({ kind: "fixed", yen: 1.5 })).not.toBeNull();
    expect(validateFee({ kind: "fixed", yen: Number.NaN })).not.toBeNull();
    expect(validateFee({ kind: "percent", percent: 0.1 })).toBeNull();
    expect(validateFee({ kind: "percent", percent: 50 })).toBeNull();
    expect(validateFee({ kind: "percent", percent: 3.5 })).toBeNull();
    expect(validateFee({ kind: "percent", percent: 0.05 })).not.toBeNull();
    expect(validateFee({ kind: "percent", percent: 50.1 })).not.toBeNull();
    expect(validateFee({ kind: "percent", percent: 3.25 })).not.toBeNull();
    expect(validateFee({ kind: "percent", percent: 0 })).not.toBeNull();
    expect(validateFee({ kind: "percent", percent: Number.NaN })).not.toBeNull();
  });
  it("feeText", () => {
    expect(feeText({ kind: "none" })).toBe("紹介料なし");
    expect(feeText({ kind: "fixed", yen: 30000 })).toBe("紹介料 30,000円");
    expect(feeText({ kind: "fixed", yen: 500 })).toBe("紹介料 500円");
    expect(feeText({ kind: "percent", percent: 3 })).toBe("成約時 3%");
    expect(feeText({ kind: "percent", percent: 2.5 })).toBe("成約時 2.5%");
    expect(feeText({ kind: "discuss" })).toBe("紹介料は相談して決める");
    expect(feeText(null)).toBe("まだ決まっていません");
  });
});

describe("見本の初期の記録", () => {
  const get = (id: string) => INTRO_RECORDS_SEED.find((r) => r.id === id) as IntroRecord;
  it("r1：田中 → 自分 → 湊、返事待ち。自分が承認・辞退を試せる", () => {
    const r = get("r1");
    expect([r.requesterId, r.introducerId, r.targetId, r.status]).toEqual(["tanaka", ME_ID, "minato", "requested"]);
    expect(approveIntro(r, ME_ID, { kind: "none" }, "", "2026-11-07")?.status).toBe("asking_target");
  });
  it("r2：山本 → 佐藤 → 自分、3%。自分が了承するとつながる", () => {
    const r = get("r2");
    expect([r.requesterId, r.introducerId, r.targetId, r.status]).toEqual(["yamamoto", "sato", ME_ID, "asking_target"]);
    expect(r.fee).toEqual({ kind: "percent", percent: 3 });
    expect(r.events.at(-1)?.note).toBe("太陽光の保守で相談したいそうです");
    expect(acceptIntro(r, ME_ID, "", "2026-11-07")?.status).toBe("connected");
  });
  it("r3：自分 → 中村 → 田中、10月に辞退された履歴", () => {
    const r = get("r3");
    expect([r.requesterId, r.introducerId, r.targetId, r.status]).toEqual([ME_ID, "nakamura", "tanaka", "declined_by_introducer"]);
    expect(r.events.every((e) => e.at.startsWith("2026-10"))).toBe(true);
    expect(r.events.at(-1)?.note).toBe("いまは紹介を控えています");
  });
  it("自分の返事を待っているのは r1（B として）と r2（C として）", () => {
    expect(awaitingReply(INTRO_RECORDS_SEED, ME_ID).map((r) => r.id)).toEqual(["r1", "r2"]);
  });
  it("新しい順（最後の出来事の日付）", () => {
    expect(newestFirst(INTRO_RECORDS_SEED).map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
  });
  it("履歴の言い方：自分は「あなた」", () => {
    const r = approveIntro(get("r1"), ME_ID, { kind: "percent", percent: 3 }, "", "2026-11-07")!;
    expect(r.events.map((e) => introEventText(r, e))).toEqual(["11-07 田中さんが依頼", "11-07 あなたが承認（成約時 3%）"]);
    expect(introStatusText(r)).toBe("湊さんの返事待ち");
    expect(introStatusText(get("r3"))).toBe("中村さんが辞退しました");
  });
  it("伏せた相手は、依頼した本人の画面ではつながるまで伏せたまま（記録の中身には targetId を持つ）", () => {
    const r0 = createIntroRequest({ id: "r9", requesterId: ME_ID, introducerId: "sato", targetId: "hayashi", note: "お話を聞きたいです", maskedForRequester: true, at: "2026-11-07" })!;
    expect(r0.targetId).toBe("hayashi");
    expect(introName(r0, "hayashi")).toBe("不動産業の役員の方");
    const shown = [introName(r0, "hayashi"), introStatusText(r0), ...r0.events.map((e) => introEventText(r0, e))].join("");
    expect(shown).not.toContain("林");
    const r1 = approveIntro(r0, "sato", { kind: "none" }, "", "2026-11-08")!;
    expect(introStatusText(r1)).toBe("不動産業の役員の方の返事待ち");
    const r2 = acceptIntro(r1, "hayashi", "", "2026-11-09")!;
    expect(introName(r2, "hayashi")).toBe("林 大輔さん"); // つながったら名前を出す
    // 間の人（佐藤）の画面では伏せない
    expect(introName(r0, "hayashi", "sato")).toBe("林 大輔さん");
  });
});
