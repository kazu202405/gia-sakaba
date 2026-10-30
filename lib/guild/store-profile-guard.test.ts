// プロフィールを店ごとに分けた（0134・0135）あと、人ごとの古い表 sakaba.profiles の「中身の列」を読む・書く処理が
// 残っていないかの見張り。残っていると、店ごとに分けたはずの中身が、また店をまたいで混ざる。
//  - 画面コード（app/ components/ lib/）：構文木で「文字列リテラル・テンプレートの文字部分」だけを見る（コメントには反応しない）
//  - migration（0135 以降）：コメントを除いた SQL を見る。唯一の例外は、入会の関数が profiles の「行」を作る insert（display_name は NOT NULL）
//  - 連絡先・タグ・共有URLの関数が、店（guild_id）を付けずに書いていないか
// 古い列を消す migration（数日後）を足すときも、この見張りはそのまま通る（消す文は alter table … drop column で、例外の対象外）。
// 見張り自身の自己テストは下の describe：コメントでは落ちない／わざと1か所戻すと落ちる。

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

// ---------- 画面コード ----------

const PROFILES_IN_TEXT = /\bsakaba\.profiles\b/;
/** PostgREST の埋め込み select：profiles(…) / profiles!inner(…) */
const PROFILES_EMBED = /(?<![A-Za-z0-9_.])profiles\s*(?:!\w+)?\s*\(/;

export function findProfilesReads(source: string, fileName = "x.tsx"): { line: number; text: string }[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: { line: number; text: string }[] = [];
  const add = (node: ts.Node, text: string) => found.push({ line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: text.slice(0, 60) });
  const check = (node: ts.Node, text: string) => { if (PROFILES_IN_TEXT.test(text) || PROFILES_EMBED.test(text)) add(node, text); };
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "from") {
      const first = node.arguments[0];
      if (first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) && first.text === "profiles") add(first, ".from(\"profiles\")");
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) check(node, node.text);
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) check(node, node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name).replace(/\\/g, "/");
    if (statSync(path).isDirectory()) return name === "node_modules" || name === ".next" ? [] : walk(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

// ---------- migration ----------

/** SQL のコメント（-- 行末まで）を空にする。文字列の中の -- は「' で囲まれた部分」を先に退避して避ける */
export function stripSqlComments(sql: string): string {
  const strings: string[] = [];
  const hidden = sql.replace(/'(?:[^']|'')*'/g, (m) => { strings.push(m); return `'\u0000${strings.length - 1}\u0000'`; });
  const stripped = hidden.replace(/--[^\n]*/g, "");
  return stripped.replace(/'\u0000(\d+)\u0000'/g, (_, i: string) => strings[Number(i)]);
}

const ALLOWED_PROFILES_INSERT = /insert into sakaba\.profiles \(user_id, display_name\)\s*values \(v_user_id, btrim\(p_display_name\)\)\s*on conflict \(user_id\) do nothing;/g;

/** 0135 以降の migration で sakaba.profiles を触っている箇所（許された insert を除く）の数 */
export function countProfilesTouches(sql: string): number {
  const code = stripSqlComments(sql).replace(ALLOWED_PROFILES_INSERT, "");
  return (code.match(/\bsakaba\.profiles\b/g) ?? []).length;
}

/** profile_contacts / profile_contact_items / profile_tags / profile_shares に、店（guild_id）を付けずに書いている箇所 */
export function findUnscopedProfileWrites(sql: string): string[] {
  const code = stripSqlComments(sql).replace(ALLOWED_PROFILES_INSERT, "");
  const problems: string[] = [];
  for (const m of code.matchAll(/insert into sakaba\.(profile_contacts|profile_contact_items|profile_tags|profile_shares)(?:\s+as\s+\w+)?\s*\(([^)]*)\)/g)) {
    if (!/\bguild_id\b/.test(m[2])) problems.push(`insert into ${m[1]} に guild_id が無い`);
  }
  for (const m of code.matchAll(/delete from sakaba\.(profile_contacts|profile_contact_items|profile_tags|profile_shares)\b([^;]*);/g)) {
    if (!/\bguild_id\b/.test(m[2])) problems.push(`delete from ${m[1]} に guild_id が無い`);
  }
  if (/on conflict \(user_id\)/.test(code)) problems.push("on conflict (user_id)（店ごとの主キーは (guild_id, user_id)）");
  return problems;
}

const migrationsAfter0134 = () => readdirSync("supabase/migrations")
  .filter((name) => /^\d{4}_.*\.sql$/.test(name) && Number(name.slice(0, 4)) >= 135)
  .map((name) => ({ name, sql: read(`supabase/migrations/${name}`) }));

describe("画面コードは profiles（人ごとの古い表）の中身を読まない", () => {
  it("app/ components/ lib/ に、sakaba.profiles・.from(\"profiles\")・profiles(…) の埋め込みが無い", () => {
    const hits = ["app", "components", "lib"].flatMap(walk).flatMap((path) => findProfilesReads(read(path), path).map((h) => `${path}:${h.line} ${h.text}`));
    expect(hits).toEqual([]);
    // app/ components/ lib/ を全部読むので、全体を流すと既定の5秒に間に合わないことがある（2026-10-31）
  }, 30_000);
});

describe("0135 以降の migration は profiles の中身の列を読まない・書かない", () => {
  it("0135 が対象に入っている（空振りで通らない）", () => {
    expect(migrationsAfter0134().some((m) => m.name.startsWith("0135_"))).toBe(true);
  });
  it("sakaba.profiles を触る箇所は、入会の関数の「行を作る insert」だけ", () => {
    for (const m of migrationsAfter0134()) expect([m.name, countProfilesTouches(m.sql)]).toEqual([m.name, 0]);
  });
  it("連絡先・タグ・共有URLは、店（guild_id）を付けて書く", () => {
    for (const m of migrationsAfter0134()) expect([m.name, findUnscopedProfileWrites(m.sql)]).toEqual([m.name, []]);
  });
});

describe("見張り自身の確かめ", () => {
  it("画面コード：読み込みを見つける／コメントには反応しない", () => {
    expect(findProfilesReads('const q = supabase.from("profiles").select("display_name");')).toHaveLength(1);
    expect(findProfilesReads('const q = "select * from sakaba.profiles";')).toHaveLength(1);
    expect(findProfilesReads("const q = `select ${x} from sakaba.profiles`;")).toHaveLength(1);
    expect(findProfilesReads('const q = supabase.from("quests").select("id, profiles!inner(display_name)");')).toHaveLength(1);
    expect(findProfilesReads('// sakaba.profiles は読まない\n/* .from("profiles") */\nconst a = 1;')).toHaveLength(0);
    expect(findProfilesReads('const a = "guild_profiles"; const b = "member_profiles(";')).toHaveLength(0);
  });
  it("migration：コメントの中の sakaba.profiles には反応しない／本体にあれば見つける", () => {
    expect(countProfilesTouches("-- sakaba.profiles を読まない\nselect 1;")).toBe(0);
    expect(countProfilesTouches("select 1 from sakaba.profiles p;")).toBe(1);
    expect(countProfilesTouches("update sakaba.profiles set bio = '';")).toBe(1);
    expect(countProfilesTouches("select '-- x' ; select 1 from sakaba.profiles;")).toBe(1);
  });
  it("migration：許された insert だけは通る（少し違えば見つかる）", () => {
    const ok = "insert into sakaba.profiles (user_id, display_name)\n  values (v_user_id, btrim(p_display_name))\n  on conflict (user_id) do nothing;";
    expect(countProfilesTouches(ok)).toBe(0);
    expect(countProfilesTouches(ok.replace("do nothing", "do update set display_name = excluded.display_name"))).toBe(1);
  });
  it("migration：店を付けない書き込みを見つける", () => {
    expect(findUnscopedProfileWrites("insert into sakaba.profile_tags (user_id, tag_id) values (a, b);")).toHaveLength(1);
    expect(findUnscopedProfileWrites("insert into sakaba.profile_tags (guild_id, user_id, tag_id) values (g, a, b);")).toHaveLength(0);
    expect(findUnscopedProfileWrites("delete from sakaba.profile_tags pt where pt.user_id = v;")).toHaveLength(1);
    expect(findUnscopedProfileWrites("delete from sakaba.profile_tags pt where pt.guild_id = g and pt.user_id = v;")).toHaveLength(0);
    expect(findUnscopedProfileWrites("insert into sakaba.profile_shares as ps (user_id, token) values (a, b) on conflict (user_id) do nothing;").length).toBeGreaterThan(0);
  });
  it("わざと1か所戻すと落ちる：実物の 0135 の guild_profiles を1か所 profiles に戻す／guild_id を1か所外す", () => {
    const real = read("supabase/migrations/0135_sakaba_store_profiles_functions.sql");
    expect(countProfilesTouches(real)).toBe(0);
    expect(findUnscopedProfileWrites(real)).toEqual([]);
    const reverted = real.replace("from sakaba.guild_profiles gp\n  where gp.guild_id = p_guild_id and gp.user_id = p_user_id;", "from sakaba.profiles gp\n  where gp.user_id = p_user_id;");
    expect(reverted).not.toBe(real);
    expect(countProfilesTouches(reverted)).toBeGreaterThan(0);
    const unscoped = real.replace("insert into sakaba.profile_contact_items (guild_id, user_id,", "insert into sakaba.profile_contact_items (user_id,");
    expect(unscoped).not.toBe(real);
    expect(findUnscopedProfileWrites(unscoped).length).toBeGreaterThan(0);
  });
});
