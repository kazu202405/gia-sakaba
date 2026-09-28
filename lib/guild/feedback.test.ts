import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEEDBACK_KINDS, FEEDBACK_MESSAGE_MAX, deviceLabel, feedbackError, parseFeedbackReports } from "./feedback";

const sql = readFileSync("supabase/migrations/0117_sakaba_task_due_and_feedback.sql", "utf8");

describe("ご意見・不具合の報告", () => {
  it("種類のキーが migration 0117 の許す値と同じ", () => {
    const allowed = sql.match(/feedback_reports_kind_check check \(kind in \(([^)]+)\)\)/)?.[1].match(/'(\w+)'/g)?.map((v) => v.slice(1, -1));
    expect(allowed?.sort()).toEqual(FEEDBACK_KINDS.map((kind) => kind.key).sort());
  });

  it("字数の上限が migration 0117 と同じ", () => {
    expect(sql).toContain(`message varchar(${FEEDBACK_MESSAGE_MAX})`);
    expect(sql).toContain(`not between 1 and ${FEEDBACK_MESSAGE_MAX}`);
  });

  it("送る前の確かめ", () => {
    expect(feedbackError(null, "x")).toContain("えらんで");
    expect(feedbackError("spam", "x")).toContain("えらんで");
    expect(feedbackError("bug", "   ")).toContain("書いて");
    expect(feedbackError("bug", "あ".repeat(FEEDBACK_MESSAGE_MAX + 1))).toContain(`${FEEDBACK_MESSAGE_MAX}字`);
    expect(feedbackError("idea", "担当を決めたい")).toBeNull();
  });

  it("一覧を読む・おかしな行は捨てる", () => {
    const rows = parseFeedbackReports([
      { id: "1", user_id: "u", display_name: "A", kind: "bug", message: "m", page_path: "/guild", user_agent: null, status: "new", created_at: "2026-09-28" },
      { id: "2", user_id: "u", kind: "spam", message: "m", status: "new", created_at: "2026-09-28" },
      { id: "3", user_id: "u", kind: "bug", message: "m", status: "closed", created_at: "2026-09-28" },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["1"]);
    expect(parseFeedbackReports(null)).toEqual([]);
  });

  it("端末の名前", () => {
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBe("iPhone/iPad・Safari");
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36")).toBe("Windows・Chrome");
    expect(deviceLabel(null)).toBeNull();
  });
});
