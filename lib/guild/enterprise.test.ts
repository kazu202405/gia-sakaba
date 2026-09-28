import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONSULT_TOPICS, consultError, parseConsultRequests } from "./enterprise";

describe("エンタープライズの相談", () => {
  it("話題のキーが migration 0115 の許す値と同じ", () => {
    const sql = readFileSync("supabase/migrations/0115_sakaba_enterprise_consults.sql", "utf8");
    const allowed = sql.match(/topics <@ array\[([^\]]+)\]/)?.[1].match(/'(\w+)'/g)?.map((v) => v.slice(1, -1));
    expect(allowed?.sort()).toEqual(CONSULT_TOPICS.map((topic) => topic.key).sort());
  });

  it("送る前の確かめ", () => {
    expect(consultError([], "x")).toContain("1つ以上");
    expect(consultError(["hack"], "x")).not.toBeNull();
    expect(consultError(["dx"], "  ")).toContain("ひとこと");
    expect(consultError(["dx"], "あ".repeat(1001))).toContain("1000字");
    expect(consultError(["dx", "sales"], "見直したい")).toBeNull();
  });

  it("一覧を読む・おかしな行は捨てる", () => {
    const rows = parseConsultRequests([
      { id: "1", user_id: "u", display_name: "A", topics: ["dx", "hack"], message: "m", status: "new", created_at: "2026-09-28" },
      { id: "2", user_id: "u", topics: [], message: "m", status: "deleted", created_at: "2026-09-28" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].topics).toEqual(["dx"]);
    expect(parseConsultRequests(null)).toEqual([]);
  });
});
