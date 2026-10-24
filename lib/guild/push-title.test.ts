import { describe, expect, it } from "vitest";
import { pushTitleFor } from "./push-title";
import { guildPath } from "./store-path";
import { STORES } from "./stores";

describe("プッシュ通知の題名", () => {
  it("行き先の店の名前になる（?や#が付いていても）", () => {
    for (const store of Object.values(STORES)) {
      expect(pushTitleFor(guildPath(store.slug, "/quests/abc"))).toBe(store.name);
      expect(pushTitleFor(guildPath(store.slug, "/master#master-consults-title"))).toBe(store.name);
      expect(pushTitleFor(guildPath(store.slug, "?welcome=1"))).toBe(store.name);
      expect(pushTitleFor(guildPath(store.slug))).toBe(store.name);
    }
  });

  it("建設・不動産の店の通知に、GIAの酒場の名前は出ない", () => {
    expect(pushTitleFor(guildPath("kensetsu-fudosan", "/notifications"))).toBe("建設・不動産の酒場");
  });

  it("店の道でないもの・昔の道・壊れたものは既定の店（GIAの酒場）", () => {
    expect(pushTitleFor("/guild/notifications")).toBe("GIAの酒場");
    expect(pushTitleFor("/guild/login")).toBe("GIAの酒場");
    expect(pushTitleFor("")).toBe("GIAの酒場");
    expect(pushTitleFor("http://[")).toBe("GIAの酒場");
  });
});
