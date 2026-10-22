import { describe, expect, it } from "vitest";
import { sceneArtOf } from "./scene-art";

describe("sceneArtOf（画面ごとの背景の絵）", () => {
  it("酒場の中の画面は、どれも場所に合った絵になる", () => {
    const cases: [string, string][] = [
      ["/guild/gia", "tavern"],
      ["/guild/gia/master", "tavern"],
      ["/guild/gia/master/gathering/new", "tavern"],
      ["/guild/gia/thanks", "tavern"],
      ["/guild/gia/members", "guild"],
      ["/guild/gia/members/abc", "guild"],
      ["/guild/gia/requests", "guild"],
      ["/guild/gia/quests", "quests"],
      ["/guild/gia/quests/new", "quests"],
      ["/guild/gia/quests/abc", "quests"],
      ["/guild/gia/quests/abc/edit", "quests"],
      ["/guild/gia/quests/abc/applicants", "quests"],
      ["/guild/gia/projects", "projects"],
      ["/guild/gia/projects/new", "projects"],
      ["/guild/gia/projects/abc/edit", "projects"],
      ["/guild/gia/me", "me"],
      ["/guild/gia/me/status", "me"],
      ["/guild/gia/me/status/draft", "me"],
      ["/guild/gia/notifications", "me"],
      ["/guild/gia/plan", "me"],
    ];
    for (const [path, art] of cases) expect([path, sceneArtOf(path)]).toEqual([path, art]);
  });

  it("似た名前の別の道は巻き込まない", () => {
    expect(sceneArtOf("/guild/gia/requestsx")).toBeUndefined();
    expect(sceneArtOf("/guild/gia/planner")).toBeUndefined();
    expect(sceneArtOf("/guildx")).toBeUndefined();
  });
});

describe("sceneArtOf：店ごと", () => {
  it("どの店でも同じ表で絵が決まる（絵を敷くかどうかは店のテーマ側で決める）", () => {
    expect(sceneArtOf("/guild/kensetsu-fudosan")).toBe("tavern");
    expect(sceneArtOf("/guild/kensetsu-fudosan/quests/abc")).toBe("quests");
  });
  it("登録されていない店・店に属さない道・昔の道には絵が決まらない", () => {
    expect(sceneArtOf("/guild/nonexistent/quests")).toBeUndefined();
    expect(sceneArtOf("/guild/login")).toBeUndefined();
    expect(sceneArtOf("/guild/quests")).toBeUndefined();
    expect(sceneArtOf("/guild")).toBeUndefined();
  });
});
