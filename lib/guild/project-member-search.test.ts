import { describe, expect, it } from "vitest";
import { filterProjectMembers } from "./project-member-search";

const members = [
  { id: "1", display_name: "山田 太郎", name_kana: "やまだ たろう", job: "税理士", region: "大阪" },
  { id: "2", display_name: "佐藤 花子", name_kana: "さとう はなこ", job: "Web制作", region: "東京" },
];

describe("filterProjectMembers", () => {
  it("shows all members before typing", () => {
    expect(filterProjectMembers(members, "")).toEqual(members);
  });
  it("matches names and readings despite spacing and width", () => {
    expect(filterProjectMembers(members, "山田太郎").map((member) => member.id)).toEqual(["1"]);
    expect(filterProjectMembers(members, "ﾔﾏﾀﾞ").map((member) => member.id)).toEqual(["1"]);
    expect(filterProjectMembers(members, "やまだ").map((member) => member.id)).toEqual(["1"]);
  });
  it("matches job and region without forcing a choice", () => {
    expect(filterProjectMembers(members, "WEB").map((member) => member.id)).toEqual(["2"]);
    expect(filterProjectMembers(members, "大阪").map((member) => member.id)).toEqual(["1"]);
    expect(filterProjectMembers(members, "知らない人")).toEqual([]);
  });
});
