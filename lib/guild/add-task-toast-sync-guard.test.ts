import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// タスクを足すとき、「追加しました」のトーストと一覧の変化をずらさない。
// トーストだけ先に出て一覧が増えない時間があると、「入っていない」と思われて 2度押される
// （2026-09-30 プロジェクトのタスク追加で実際に起きた）。
// 順番：保存 → 仮の行を出す → 入力欄を空にする → トースト → 一覧の読み直し。

const FILE = "components/guild/live-project-detail.tsx";

// 「function 名(」から、対応する } までの本体を取り出す（波かっこの数で切る）
function functionBody(source: string, name: string): string | null {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) return null;
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(open, i + 1);
  }
  return null;
}

// 呼び出しの出てくる位置（無ければ -1）。コメントの中の文字は数えない
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}
const at = (code: string, needle: string) => code.indexOf(needle);

describe("タスク追加のトーストと一覧（見張り）", () => {
  const source = readFileSync(FILE, "utf8");
  const body = functionBody(source, "addTask");
  const code = body ? stripComments(body) : "";

  it("addTask の本体が読めている（読めないまま 素通りさせない）", () => {
    expect(body).not.toBeNull();
    expect(code).toContain("sakaba_add_project_task");
    expect(code).toContain("uiToast(");
  });

  it("仮の行 → 入力欄を空に → トースト → 一覧の読み直し の順", () => {
    const rpc = at(code, "sakaba_add_project_task");
    const temp = at(code, "setAddingTasks(");
    const clear = at(code, 'setTaskTitle("")');
    const toast = at(code, "uiToast(");
    const refresh = at(code, "router.refresh()");
    expect(temp).toBeGreaterThan(rpc);
    expect(clear).toBeGreaterThan(-1);
    expect(toast).toBeGreaterThan(temp);
    expect(toast).toBeGreaterThan(clear);
    expect(refresh).toBeGreaterThan(toast);
  });

  it("失敗したときは 仮の行もトーストも出さず 入力欄も消さない", () => {
    const failed = code.slice(at(code, "if (rpcError)"), at(code, "setAddingTasks("));
    expect(failed).toContain("return;");
    expect(failed).not.toContain("uiToast(");
  });

  it("ボタンの錠は 一覧の読み直し（isPending）が終わるまで外れない", () => {
    expect(source).toMatch(/const busy = !!pendingAction \|\| isPending;/);
    expect(source).toMatch(/startTransition\(\(\) => router\.refresh\(\)\)/);
    // 仮の行は 一覧の読み直しが終わってから消す
    expect(source).toMatch(/if \(!isPending && !pendingAction\) setAddingTasks/);
  });

  it("仮の行に 操作できる部品（なおす・削除）を出さない", () => {
    const start = source.indexOf("addingTasks.map(");
    const row = source.slice(start, source.indexOf("</li>)", start));
    expect(row).toContain("disabled");
    expect(row).not.toContain("onClick");
    expect(row).not.toContain("deleteTask");
  });

  it("見張りの部品が効いている（順番違い・コメントだけの呼び出しを見逃さない）", () => {
    const sample = "async function f(a) { if (a) { x(); } toast(); }";
    expect(functionBody(sample, "f")).toBe("{ if (a) { x(); } toast(); }");
    expect(functionBody(sample, "nothing")).toBeNull();
    expect(stripComments('// uiToast(\nfoo(); /* uiToast( */')).not.toContain("uiToast(");
    // トーストが先に来る書き方は 順番の検査で落ちる
    const wrong = stripComments("uiToast(1); setAddingTasks(1);");
    expect(at(wrong, "uiToast(")).toBeLessThan(at(wrong, "setAddingTasks("));
  });
});

// 「相手を追加」（あいてごとの じょうきょう）も同じ。追加が通ったら 仮の行 → トースト → 読み直し
describe("相手の追加のトーストと一覧（見張り）", () => {
  const source = readFileSync("components/guild/live-project-people.tsx", "utf8");
  const run = stripComments(functionBody(source, "run") ?? "");

  it("run の本体が読めている", () => {
    expect(run).toContain("onSuccess?.()");
    expect(run).toContain("uiToast(");
  });

  it("成功の処理（仮の行）→ トースト → 一覧の読み直し の順", () => {
    const onSuccess = at(run, "onSuccess?.()");
    const toast = at(run, "uiToast(");
    const refresh = at(run, "router.refresh()");
    expect(onSuccess).toBeGreaterThan(-1);
    expect(toast).toBeGreaterThan(onSuccess);
    expect(refresh).toBeGreaterThan(toast);
  });

  it("相手の追加の成功処理で 仮の行を足し、入力欄を空にする", () => {
    const start = source.indexOf('"相手の追加", () =>');
    const callback = source.slice(start, source.indexOf("}); }}", start));
    expect(start).toBeGreaterThan(-1);
    expect(callback).toContain("setAddingContacts(");
    expect(callback).toContain('setNewContactLabel("")');
  });

  it("仮の行は 読み直しが終わってから消し、操作できる部品を出さない", () => {
    expect(source).toMatch(/const busy = !!saving \|\| isPending;/);
    expect(source).toMatch(/if \(isPending \|\| saving\) return;[\s\S]*setAddingContacts/);
    const start = source.indexOf("addingContacts.map(");
    const row = source.slice(start, source.indexOf("</tr>)", start));
    expect(row).not.toContain("onClick");
    expect(row).not.toContain("<button");
  });
});

// 日付の保存（今日おわった／日付を保存／日付を消す）も同じ。保存した日付を先にます目へ出してからトースト
describe("日付の保存のトーストと表示（見張り）", () => {
  const source = readFileSync("components/guild/live-project-people.tsx", "utf8");
  const save = stripComments(functionBody(source, "saveRecord") ?? "");

  it("saveRecord の本体が読めている", () => {
    expect(save).toContain("sakaba_set_project_step_record");
  });

  it("成功したら 保存した日付を先に出し、パネルを閉じる（トーストは run が そのあとに出す）", () => {
    expect(save).toContain("setRecordOverride(");
    expect(save).toContain("setSelection(null)");
  });

  it("日付のボタンは すべて saveRecord を通る（run を直接呼ばない）", () => {
    // run を呼んでよいのは saveRecord の中の 1か所だけ
    expect((source.match(/run\("sakaba_set_project_step_record"/g) ?? []).length).toBe(1);
    expect((source.match(/saveRecord\(selection\.contactId/g) ?? []).length).toBe(4); // 自動保存・閉じるときの保存・保存ボタン・消す
  });

  it("ます目は 仮の日付を優先し、読み直しが終わってから外す", () => {
    expect(source).toMatch(/recordOverride\[`\$\{contact\.id\}:\$\{step\.id\}`\] \?\? pipeline\.records\.find/);
    expect(source).toMatch(/if \(isPending \|\| saving\) return;/);
  });
  it("自動保存：直した版を数え、保存中に直した分も 終わったあとに拾う", () => {
    expect(source).toMatch(/editVersion === savedVersion\.current \|\| busy\) return;/);
    expect(source).toMatch(/\}, \[editVersion, busy, selection,/);
    // 閉じる・ほかのます目を開くときは 待たずに保存してから移る
    expect((source.match(/leaveCell\(\)/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
});
