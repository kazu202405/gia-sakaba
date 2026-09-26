import { describe, expect, it } from "vitest";
import { sceneArtOf } from "./scene-art";

describe("sceneArtOf（画面ごとの背景の絵）", () => {
  it("酒場の中の画面は、どれも場所に合った絵になる", () => {
    const cases: [string, string][] = [
      ["/guild", "tavern"],
      ["/guild/master", "tavern"],
      ["/guild/master/gathering/new", "tavern"],
      ["/guild/thanks", "tavern"],
      ["/guild/members", "guild"],
      ["/guild/members/abc", "guild"],
      ["/guild/requests", "guild"],
      ["/guild/quests", "quests"],
      ["/guild/quests/new", "quests"],
      ["/guild/quests/abc", "quests"],
      ["/guild/quests/abc/edit", "quests"],
      ["/guild/quests/abc/applicants", "quests"],
      ["/guild/projects", "projects"],
      ["/guild/projects/new", "projects"],
      ["/guild/projects/abc/edit", "projects"],
      ["/guild/me", "me"],
      ["/guild/me/status", "me"],
      ["/guild/notifications", "me"],
      ["/guild/plan", "me"],
    ];
    for (const [path, art] of cases) expect([path, sceneArtOf(path)]).toEqual([path, art]);
  });

  it("似た名前の別の道は巻き込まない", () => {
    expect(sceneArtOf("/guild/requestsx")).toBeUndefined();
    expect(sceneArtOf("/guild/planner")).toBeUndefined();
    expect(sceneArtOf("/guildx")).toBeUndefined();
  });
});
