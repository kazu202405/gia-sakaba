import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 共有URL（会員以外にも見せるステータス）の見張り。
 * 公開用の関数 sakaba_get_shared_profile が返す項目を、許可した一覧（allow-list）だけに固定する。
 * 出さないと決めたもの（出身地・誕生日・連絡先・入会のつながり・いま解決したいこと・管理者の情報・ほかの会員）が
 * 返り値に混ざったら落ちる。決定の一覧は contexts/projects/gia/sakaba_share_url.md。
 */

const MIGRATION = "supabase/migrations/0121_sakaba_share_profile.sql";

const ALLOWED_KEYS = [
  // 返り値の上の階層
  "display_name", "photo_url", "headline", "job", "job_icon", "region", "industry",
  "company_name", "position", "bio", "values_text", "looking_for", "keywords",
  "hobbies", "life_story", "business_card", "introductions",
  // 名刺と紹介状の中
  "front", "back", "body", "created_at", "author_name",
];

// 出力の値に、これらの列を使ってはいけない（where句などに出るのは別の話。ここは返り値の組み立てだけを見る）
const FORBIDDEN_IN_OUTPUT = /\b(hometown|birth_\w+|email|line_url|website_url|want_to_solve|invite_id|author_id|target_id|role|gathering_approved_at|joined_at|user_id|token|suspended_at)\b/;

/** -- の行コメントと /* *​/ を消す（注意書きの中の言葉で落ちたり、逆に隠れたりしないように） */
function stripComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

/** jsonb_build_object( ... ) の中身（かっこの対応を数える。文字列の中のかっこは数えない） */
function buildObjectBodies(sql: string): string[] {
  const bodies: string[] = [];
  let from = 0;
  for (;;) {
    const start = sql.indexOf("jsonb_build_object(", from);
    if (start < 0) break;
    let depth = 0;
    let inString = false;
    let i = start + "jsonb_build_object".length;
    let end = -1;
    for (; i < sql.length; i++) {
      const ch = sql[i];
      if (ch === "'") inString = !inString;
      if (inString) continue;
      if (ch === "(") depth++;
      if (ch === ")") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) break;
    bodies.push(sql.slice(start + "jsonb_build_object(".length, end));
    from = start + "jsonb_build_object(".length;
  }
  return bodies;
}

/** 引数をカンマで分ける（かっこ・文字列の中のカンマでは分けない） */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (const ch of body) {
    if (ch === "'") inString = !inString;
    if (!inString) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) { parts.push(current.trim()); current = ""; continue; }
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** 関数の本体を取り出し、返り値に入れるキーと値を並べる */
function outputPairs(sql: string): { key: string; value: string }[] {
  const pairs: { key: string; value: string }[] = [];
  for (const body of buildObjectBodies(stripComments(sql))) {
    const args = splitTopLevel(body);
    for (let i = 0; i + 1 < args.length; i += 2) {
      const literal = /^'([a-z_]+)'$/.exec(args[i]);
      pairs.push({ key: literal ? literal[1] : args[i], value: args[i + 1] });
    }
  }
  return pairs;
}

/** 違反の一覧（空なら問題なし） */
function violations(functionSql: string): string[] {
  const found: string[] = [];
  for (const { key, value } of outputPairs(functionSql)) {
    if (!ALLOWED_KEYS.includes(key)) found.push(`許可していないキー: ${key}`);
    const bad = FORBIDDEN_IN_OUTPUT.exec(value);
    if (bad) found.push(`${key} の値に出してはいけない列: ${bad[1]}`);
  }
  return found;
}

function sharedProfileFunction(sql: string) {
  const start = sql.indexOf("create or replace function public.sakaba_get_shared_profile");
  const end = sql.indexOf("revoke all on function", start);
  if (start < 0 || end < 0) throw new Error("sakaba_get_shared_profile が見つかりません");
  return sql.slice(start, end);
}

describe("共有URLの公開用の関数（見張り）", () => {
  const sql = readFileSync(join(process.cwd(), MIGRATION), "utf8");
  const fn = sharedProfileFunction(sql);

  it("返す項目は、許可した一覧だけで、出さない列を使っていない", () => {
    expect(violations(fn)).toEqual([]);
  });

  it("キーを1つも拾えないまま通ってしまわない（見張りが空振りしていない）", () => {
    const keys = outputPairs(fn).map((pair) => pair.key);
    for (const key of ["display_name", "bio", "business_card", "introductions", "author_name"]) expect(keys).toContain(key);
    expect(keys.length).toBeGreaterThanOrEqual(20);
  });

  it("未ログイン（anon）に開く関数は、公開用の1つだけ", () => {
    const granted = [...stripComments(sql).matchAll(/grant execute on function ([a-z_.]+)\([^)]*\) to ([^;]+);/g)]
      .filter((match) => /\banon\b/.test(match[2])).map((match) => match[1]);
    expect(granted).toEqual(["public.sakaba_get_shared_profile"]);
  });

  it("共有設定の表は、誰にも直接読ませない", () => {
    const code = stripComments(sql);
    expect(code).toMatch(/alter table sakaba\.profile_shares enable row level security/);
    expect(code).toMatch(/revoke all on table sakaba\.profile_shares from anon, authenticated/);
    expect(code).not.toMatch(/grant [a-z, ]+ on table sakaba\.profile_shares/);
  });
});

describe("見張り自身の自己テスト", () => {
  it("出してはいけない列を入れたら見つける", () => {
    const bad = "select jsonb_build_object('display_name', p.display_name, 'email', c.email);";
    expect(violations(bad).length).toBeGreaterThan(0);
    expect(violations("select jsonb_build_object('display_name', p.display_name, 'bio', p.hometown);").join()).toContain("hometown");
  });

  it("許可していないキーを足したら見つける（値が無害でも）", () => {
    expect(violations("select jsonb_build_object('nickname', p.display_name);").join()).toContain("nickname");
  });

  it("注意書きの中の言葉では落ちない", () => {
    const ok = "-- email や hometown は出さない\nselect jsonb_build_object('display_name', p.display_name); /* birth_day も出さない */";
    expect(violations(ok)).toEqual([]);
  });

  it("入れ子やかっこの中のカンマがあっても、キーと値を取り違えない", () => {
    const nested = "select jsonb_build_object('introductions', coalesce(jsonb_agg(jsonb_build_object('body', x.body, 'author_name', case when a then x.n else null end) order by x.t), '[]'::jsonb));";
    expect(outputPairs(nested).map((pair) => pair.key).sort()).toEqual(["author_name", "body", "introductions"]);
    expect(violations(nested)).toEqual([]);
    const leakInNested = "select jsonb_build_object('introductions', jsonb_build_object('body', x.body, 'author_name', x.author_id));";
    expect(violations(leakInNested).join()).toContain("author_id");
  });

  it("anon に開く関数が増えたら見つける", () => {
    const text = "grant execute on function public.sakaba_get_shared_profile(text) to anon, authenticated;\ngrant execute on function public.sakaba_get_my_share(text) to anon;";
    const granted = [...text.matchAll(/grant execute on function ([a-z_.]+)\([^)]*\) to ([^;]+);/g)].filter((m) => /\banon\b/.test(m[2])).map((m) => m[1]);
    expect(granted).toEqual(["public.sakaba_get_shared_profile", "public.sakaba_get_my_share"]);
  });
});
