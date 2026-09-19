import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 酒場の日付の欄は、かならず form-parts.tsx の DateInput を使う。
// ふつうの入力欄に type="date" を渡すと、iOS Safari で 枠から はみ出し・高さも ずれる
// （2026-09-19 タスクを足す欄と あいてごとの じょうきょうで 実際に起きた）。

const ROOTS = ["components/guild", "app/guild"];
const ALLOWED = path.normalize("components/guild/form-parts.tsx");
// type="date" / type='date' / type={"date"} のどれでも拾う
const DATE_TYPE = /type=\{?\s*["'`]date["'`]/g;

function listTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return listTsx(p);
    return e.name.endsWith(".tsx") ? [p] : [];
  });
}

describe("日付の欄（見張り）", () => {
  const files = ROOTS.flatMap(listTsx);

  it("画面のソースが読めている（読めないまま 素通りさせない）", () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files.map(path.normalize)).toContain(ALLOWED);
  });

  it("見張りの式が効いている（書き方を変えても 拾う）", () => {
    for (const sample of ['<TextInput type="date" />', "<input type='date' />", '<input type={"date"} />']) {
      expect(sample.match(DATE_TYPE)).not.toBeNull();
    }
    expect('<TextInput type="text" />'.match(DATE_TYPE)).toBeNull();
  });

  it("DateInput の中の 1か所だけ", () => {
    const found = files.flatMap((f) =>
      (readFileSync(f, "utf8").match(DATE_TYPE) ?? []).map(() => path.normalize(f)),
    );
    expect(found).toEqual([ALLOWED]);
  });
});
