import { guildPath } from "./store-path";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DRAFT_FIELDS,
  draftFieldLabel,
  draftFieldMax,
  draftHasContent,
  draftRpcArgs,
  emptyDraftFields,
  mergeDraftIntoProfile,
  parseInviteProfileDrafts,
  parseMemberProfileDraft,
  parseMyProfileDraft,
  pickDraftFields,
  validateProfileDraft,
  type ProfileDraftFields,
} from "./profile-drafts";
import { notificationText, type NotificationContext } from "./notifications";
import { countNavBadges } from "./nav-badges";
import type { GuildNotification, NotificationKind } from "./types";

const MIGRATION = "supabase/migrations/0130_sakaba_profile_drafts.sql";
const profile = { headline: "", industry: "", region: "", job: "", bio: "", values_text: "", looking_for: "" };
const fields = (over: Partial<ProfileDraftFields>): ProfileDraftFields => ({ ...emptyDraftFields, ...over });

describe("下書きを重ねる（本人が書いた項目は上書きしない）", () => {
  it("空いている項目にだけ入る", () => {
    const { merged, applied, skipped } = mergeDraftIntoProfile({ ...profile, headline: "自分のひとこと", bio: "自分の仕事" }, fields({
      headline: "下書きのひとこと", job: "居酒屋オーナー", bio: "下書きの仕事内容",
    }));
    expect(merged.headline).toBe("自分のひとこと");
    expect(merged.bio).toBe("自分の仕事");
    expect(merged.job).toBe("居酒屋オーナー");
    expect(applied).toEqual(["job"]);
    expect(skipped).toEqual(["headline", "bio"]);
  });
  it("業種も、書いてあれば変えない", () => {
    expect(mergeDraftIntoProfile({ ...profile, industry: "IT" }, fields({ industry: "飲食" })).merged.industry).toBe("IT");
    expect(mergeDraftIntoProfile(profile, fields({ industry: "飲食" })).merged.industry).toBe("飲食");
  });
  it("空白だけの項目は『書いていない』として扱い、下書きが空の項目は触らない", () => {
    const { merged, applied, skipped } = mergeDraftIntoProfile({ ...profile, region: "   ", job: "税理士" }, fields({ region: "大阪", looking_for: "  " }));
    expect(merged.region).toBe("大阪");
    expect(merged.job).toBe("税理士");
    expect(merged.looking_for).toBe("");
    expect(applied).toEqual(["region"]);
    expect(skipped).toEqual([]);
  });
  it("元のプロフィールを書き換えない", () => {
    const original = { ...profile, headline: "元" };
    mergeDraftIntoProfile(original, fields({ job: "x" }));
    expect(original).toEqual({ ...profile, headline: "元" });
  });
});

describe("下書きの項目と渡し方", () => {
  it("項目は7つで、名前・上限・RPCの引数がそろっている", () => {
    expect(DRAFT_FIELDS).toHaveLength(7);
    for (const key of DRAFT_FIELDS) {
      expect(draftFieldLabel[key]).toBeTruthy();
      expect(draftFieldMax[key]).toBeGreaterThan(0);
      expect(Object.keys(draftRpcArgs(emptyDraftFields))).toContain(`p_${key}`);
    }
  });
  it("RPCの引数は前後の空白を取る", () => {
    expect(draftRpcArgs(fields({ job: "  税理士  " })).p_job).toBe("税理士");
  });
  it("文字数の上限を超えたら理由を返す（日本語の項目名で）", () => {
    expect(validateProfileDraft(fields({ headline: "あ".repeat(40) }))).toBeNull();
    expect(validateProfileDraft(fields({ headline: "あ".repeat(41) }))).toMatch(/ひとこと/);
    expect(validateProfileDraft(fields({ bio: "あ".repeat(1201) }))).toMatch(/仕事内容/);
  });
  it("中身があるかは、空白だけでは中身にならない", () => {
    expect(draftHasContent(emptyDraftFields)).toBe(false);
    expect(draftHasContent(fields({ job: "   " }))).toBe(false);
    expect(draftHasContent(fields({ job: "x" }))).toBe(true);
  });
  it("pickDraftFields は下書きの項目だけを取り出す", () => {
    expect(pickDraftFields({ ...fields({ job: "x" }), invite_id: "i" } as ProfileDraftFields)).toEqual(fields({ job: "x" }));
  });
});

describe("DBからの返り値を読む（壊れていても落ちない）", () => {
  it("本人に届いた下書き", () => {
    const draft = parseMyProfileDraft({ id: "d1", created_at: "2026-10-19", drafted_by_name: "五島", fields: { job: "税理士" }, filled: ["headline", "ばれ"] });
    expect(draft?.fields.job).toBe("税理士");
    expect(draft?.fields.bio).toBe("");
    expect(draft?.filled).toEqual(["headline"]);
    expect(parseMyProfileDraft(null)).toBeNull();
    expect(parseMyProfileDraft({ id: "d1", fields: { job: 3 } })).toBeNull();
  });
  it("書いた側から見た下書き（返事が済むと中身は無い）", () => {
    expect(parseMemberProfileDraft({ id: "d1", state: "applied", decided_at: "2026-10-19", fields: null })?.fields).toBeNull();
    expect(parseMemberProfileDraft({ id: "d1", state: "なぞ" })).toBeNull();
  });
  it("入会前の下書きの一覧", () => {
    expect(parseInviteProfileDrafts([{ invite_id: "i1", job: "x" }, { job: "招待状なし" }, "x"])).toHaveLength(1);
    expect(parseInviteProfileDrafts(null)).toEqual([]);
  });
});

describe("おしらせ", () => {
  const kinds: NotificationKind[] = ["profile_draft_waiting", "profile_draft_applied", "profile_draft_declined"];
  const note = (kind: NotificationKind): GuildNotification => ({
    id: kind, user_id: "me", kind, actor_id: "a", quest_id: null, intro_request_id: null, intro_status: null,
    changed_fields: [], read_at: null, created_at: "2026-10-19",
  });
  const ctx: NotificationContext = { name: () => "五島", questTitle: () => "", intro: () => undefined, path: (rest) => guildPath("gia", rest) };
  it("届いた下書きは、本人が選ぶ画面（承認の入口）へ案内する", () => {
    expect(notificationText(note("profile_draft_waiting"), ctx).href).toBe("/guild/gia/me/status/draft");
  });
  it("返事は、書いた人が相手の画面を開ける", () => {
    expect(notificationText(note("profile_draft_applied"), ctx).href).toBe("/guild/gia/members/a");
    expect(notificationText(note("profile_draft_declined"), ctx).href).toBe("/guild/gia/members/a");
  });
  it("メニューの数字に数える", () => {
    expect(countNavBadges(kinds.map(note)).total).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 見張り：0130 の SQL が、仕様の3つの線を守っているか
//  1. 本人以外は「載せる」を呼べない  2. 承認前は本人と書いた人以外には読めない  3. 本人が書いた項目を上書きしない
// 手元のPostgreSQLでの実測は tests/sql/0130_profile_drafts.sql。ここは、書き換えで線が外れたらすぐ気づくための文面の見張り。
// ---------------------------------------------------------------------------

const PUBLIC_RPCS = [
  "sakaba_save_member_profile_draft", "sakaba_get_member_profile_draft", "sakaba_save_invite_profile_draft",
  "sakaba_list_invite_profile_drafts", "sakaba_get_my_profile_draft", "sakaba_decide_my_profile_draft",
];
const WRITE_COLUMNS = ["headline", "region", "job", "bio", "values_text", "looking_for"];

/** コメントを消す（コメントの中の文字で、見張りが通ったり落ちたりしないように） */
export function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

/** 「create or replace function <名前>」から、最初の「$$;」までの本体（無ければ null） */
export function sqlFunctionBody(sql: string, name: string): string | null {
  const start = sql.indexOf(`create or replace function ${name}(`);
  if (start < 0) return null;
  const end = sql.indexOf("\n$$;", start);
  return end < 0 ? null : sql.slice(start, end);
}

/** 見つかった問題の一覧（空なら守られている） */
export function checkProfileDraftMigration(rawSql: string): string[] {
  const sql = stripSqlComments(rawSql);
  const problems: string[] = [];
  if (!/alter table sakaba\.profile_drafts enable row level security/.test(sql)) problems.push("表のRLSが有効になっていない");
  if (!/revoke all on table sakaba\.profile_drafts from public, anon, authenticated/.test(sql)) problems.push("表の権限を外していない");
  if (/grant[^;]*on\s+(table\s+)?sakaba\.profile_drafts/i.test(sql)) problems.push("表を直接読める権限を足している");
  if (/create policy[^;]*profile_drafts/i.test(sql)) problems.push("表にポリシーを足している（RPC以外の入口ができる）");

  for (const rpc of PUBLIC_RPCS) {
    const grant = sql.match(new RegExp(`grant execute on function public\\.${rpc}\\([^)]*\\) to ([a-z_, ]+);`));
    if (!grant) problems.push(`${rpc} に実行権限の行がない`);
    else if (grant[1].trim() !== "authenticated") problems.push(`${rpc} を authenticated 以外にも開けている`);
    if (!new RegExp(`revoke all on function public\\.${rpc}\\([^)]*\\) from public, anon, authenticated`).test(sql)) problems.push(`${rpc} の既定の権限を外していない`);
  }

  // 1. 載せる入口は1本。本人（下書きの相手）だけが呼べる
  const decide = sqlFunctionBody(sql, "public.sakaba_decide_my_profile_draft");
  if (!decide) problems.push("sakaba_decide_my_profile_draft が見つからない");
  else {
    if (!/member_user_id is distinct from v_user_id/.test(decide)) problems.push("載せる処理が、本人かどうかを確かめていない");
    if (!/raise exception 'only the member can decide' using errcode = '42501'/.test(decide)) problems.push("本人でないときに失敗にしていない");
    if (!/auth\.uid\(\)/.test(decide)) problems.push("載せる処理が呼んだ人を auth.uid() で決めていない");
    // 3. 空いている項目にだけ書く
    for (const column of WRITE_COLUMNS) {
      if (!new RegExp(`btrim\\(v_profile\\.${column}\\) = ''`).test(decide)) problems.push(`${column}：書いてあるかを確かめていない`);
      if (!new RegExp(`${column} = case when '${column}' = any\\(v_applied\\) then btrim\\(v_row\\.${column}\\) else ${column} end`).test(decide)) {
        problems.push(`${column}：入れる項目だけに絞らず書いている`);
      }
    }
    if (!/if not v_has_industry then/.test(decide)) problems.push("業種：すでにあるかを確かめていない");
  }
  // プロフィールを書くのは、載せる処理の中だけ
  const profileWrites = sql.match(/update sakaba\.profiles/g) ?? [];
  if (profileWrites.length !== 1 || (decide && !decide.includes("update sakaba.profiles"))) problems.push("載せる処理以外でプロフィールを書いている");

  // 書く・見る側はオーナー・マスターだけ。本人用の読み出しは会員だけ
  for (const rpc of ["sakaba_save_member_profile_draft", "sakaba_get_member_profile_draft", "sakaba_save_invite_profile_draft", "sakaba_list_invite_profile_drafts"]) {
    const body = sqlFunctionBody(sql, `public.${rpc}`);
    if (!body || !/sakaba\.is_guild_master\(/.test(body)) problems.push(`${rpc} が、オーナー・マスターかを確かめていない`);
    if (body && /sakaba_decide_my_profile_draft|update sakaba\.profiles/.test(body)) problems.push(`${rpc} から載せる処理に触れている`);
  }
  // 2. 書いた人が読むのは、自分が書いた分だけ
  const memberRead = sqlFunctionBody(sql, "public.sakaba_get_member_profile_draft");
  if (memberRead && !/d\.drafted_by = v_user_id/.test(memberRead)) problems.push("書いた人以外にも、書いた下書きを返している");
  const inviteRead = sqlFunctionBody(sql, "public.sakaba_list_invite_profile_drafts");
  if (inviteRead && !/d\.drafted_by = v_user_id/.test(inviteRead)) problems.push("入会前の下書きを、書いた人以外にも返している");
  const myRead = sqlFunctionBody(sql, "public.sakaba_get_my_profile_draft");
  if (!myRead || !/d\.member_user_id = v_user_id and d\.state = 'waiting'/.test(myRead)) problems.push("本人用の読み出しが、本人の分だけに絞れていない");
  return problems;
}

describe("0130 の SQL の見張り（仕様の3つの線）", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("いまの SQL は、問題なし（読めていないまま素通りさせない）", () => {
    expect(sql).toContain("sakaba_decide_my_profile_draft");
    expect(checkProfileDraftMigration(sql)).toEqual([]);
  });

  it("見張り自身の確かめ：線を外すと、ちゃんと鳴る", () => {
    // 本人かどうかの確認を外す
    expect(checkProfileDraftMigration(sql.replace("member_user_id is distinct from v_user_id", "false"))).toEqual(
      expect.arrayContaining(["載せる処理が、本人かどうかを確かめていない"]),
    );
    // 表を直接読めるようにする
    expect(checkProfileDraftMigration(`${sql}\ngrant select on table sakaba.profile_drafts to authenticated;`)).toEqual(
      expect.arrayContaining(["表を直接読める権限を足している"]),
    );
    expect(checkProfileDraftMigration(`${sql}\ncreate policy p on sakaba.profile_drafts for select using (true);`).length).toBeGreaterThan(0);
    // 書いてある項目も上書きする
    expect(checkProfileDraftMigration(sql.replace("bio = case when 'bio' = any(v_applied) then btrim(v_row.bio) else bio end", "bio = btrim(v_row.bio)")))
      .toEqual(expect.arrayContaining(["bio：入れる項目だけに絞らず書いている"]));
    expect(checkProfileDraftMigration(sql.replace("btrim(v_profile.job) = ''", "true"))).toEqual(expect.arrayContaining(["job：書いてあるかを確かめていない"]));
    // 載せる入口を匿名にも開ける
    expect(checkProfileDraftMigration(sql.replace("sakaba_decide_my_profile_draft(uuid, text) to authenticated;", "sakaba_decide_my_profile_draft(uuid, text) to authenticated, anon;")).length).toBeGreaterThan(0);
    // 書く側の関数が、マスターの確認を落とす
    expect(checkProfileDraftMigration(sql.replace(/(sakaba_save_member_profile_draft[\s\S]*?)sakaba\.is_guild_master\(v_guild_id, v_user_id\)/, "$1true")).length).toBeGreaterThan(0);
    // 書いた人以外にも返す
    expect(checkProfileDraftMigration(sql.replace("d.drafted_by = v_user_id", "true")).length).toBeGreaterThan(0);
  });

  it("見張り自身の確かめ：コメントの中の文字では通らないし、落ちもしない", () => {
    // 確認を外したうえで、コメントに元の文を書いても、通らない
    const commentedOut = sql.replace("member_user_id is distinct from v_user_id", "false -- member_user_id is distinct from v_user_id");
    expect(checkProfileDraftMigration(commentedOut)).toEqual(expect.arrayContaining(["載せる処理が、本人かどうかを確かめていない"]));
    // 禁止の文をコメントに書いただけでは落ちない
    expect(checkProfileDraftMigration(`${sql}\n-- grant select on table sakaba.profile_drafts to authenticated;\n/* create policy x on sakaba.profile_drafts */`)).toEqual([]);
    // 別の関数に書き足した update も見つける
    expect(checkProfileDraftMigration(`${sql}\ncreate or replace function f() returns void language sql as $$ update sakaba.profiles set job = ''; $$;`)).toEqual(
      expect.arrayContaining(["載せる処理以外でプロフィールを書いている"]),
    );
    // 本体が無い／空文字では素通りさせない
    expect(checkProfileDraftMigration("").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 見張り：画面側。載せる入口を呼べるのは、本人の2つの画面だけ。書く側の画面からは呼ばない。表を直接さわらない。
// ---------------------------------------------------------------------------

const DECIDE_ALLOWED = new Set(["components/guild/profile-draft-review.tsx", "components/guild/live-status-form.tsx"]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name).replace(/\\/g, "/");
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : walk(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** コメントを消してから、文字列の中も含めて探す（RPC名は文字列で書かれるため） */
export function stripTsComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

export function screenProblems(path: string, source: string): string[] {
  const code = stripTsComments(source);
  const problems: string[] = [];
  if (code.includes("sakaba_decide_my_profile_draft") && !DECIDE_ALLOWED.has(path)) problems.push(`${path}：本人の画面以外から「載せる」を呼んでいる`);
  if (/from\(\s*["'`](sakaba\.)?profile_drafts["'`]\s*\)/.test(code)) problems.push(`${path}：下書きの表を直接さわっている`);
  return problems;
}

describe("画面側の見張り", () => {
  const files = ["components/guild", "app/guild", "lib"].flatMap(walk);

  it("見る範囲にファイルがある（空振りで通らない）", () => {
    expect(files).toContain("components/guild/profile-draft-review.tsx");
    expect(files).toContain("components/guild/live-member-profile-draft.tsx");
    expect(files).toContain("lib/guild/profile-drafts.ts");
  });

  it("「載せる」を呼ぶのは本人の2つの画面だけ。表は直接さわらない", () => {
    const found = files.flatMap((path) => screenProblems(path, readFileSync(path, "utf8")));
    expect(found).toEqual([]);
    // 本人の画面は実際に呼んでいる（呼び先を取り違えて素通りしない）
    for (const path of DECIDE_ALLOWED) expect(readFileSync(path, "utf8")).toContain("sakaba_decide_my_profile_draft");
  });

  it("見張り自身の確かめ：書く側の画面から呼ぶと鳴る。コメントでは鳴らない", () => {
    expect(screenProblems("components/guild/live-member-profile-draft.tsx", 'rpc("sakaba_decide_my_profile_draft", {})')).toHaveLength(1);
    expect(screenProblems("components/guild/live-prepared-invites.tsx", 'x.from("profile_drafts").select()')).toHaveLength(1);
    expect(screenProblems("components/guild/live-member-profile-draft.tsx", "// sakaba_decide_my_profile_draft は本人だけ\n/* from(\"profile_drafts\") */")).toEqual([]);
    expect(screenProblems("components/guild/profile-draft-review.tsx", 'rpc("sakaba_decide_my_profile_draft", {})')).toEqual([]);
  });

  it("書く側の画面は、本人用の入口（承認の画面）を持たない", () => {
    for (const path of ["components/guild/live-member-profile-draft.tsx", "components/guild/live-prepared-invites.tsx"]) {
      expect(stripTsComments(readFileSync(path, "utf8"))).not.toMatch(/sakaba_get_my_profile_draft|sakaba_decide_my_profile_draft/);
    }
  });
});
