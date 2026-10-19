import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SURVEY_COPY,
  SURVEY_CUSTOM_PRICE_MAX,
  SURVEY_NOT_JOINING,
  SURVEY_PRICE_CHIPS,
  SURVEY_TOKEN_STORAGE_KEY,
  checkSurveyInput,
  countJoiners,
  isResponseToken,
  readStoredResponseToken,
  storeResponseToken,
  normalizeInviteUrl,
  priceLabel,
  resolvePrice,
} from "./survey";

// 事前アンケート（/guild/survey）の見張り。
// 1) 数え方（上の値段を選んだ人は下の値段でも入る人。入らない人は数えない）
// 2) 入力の決まり
// 3) 連続で送れない対策：2度押しの錠・見えない入力欄・SQLの上書き／上限／直接読み書き不可
// 4) 標準ダイアログを使っていないこと・ログインなしで開けること

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

// コメントの中の文字は数えない（見張り自身が注意書きに落とされないように）
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
function stripSqlComments(code: string): string {
  return code.replace(/--.*$/gm, "");
}

// 「function 名(」から、対応する } までの本体
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

describe("数え方（countJoiners）", () => {
  // 仕様の例：10,000円まで3人・5,000円まで10人・3,000円まで20人（＋入らない7人）
  const answers = [
    ...Array<number>(3).fill(10000),
    ...Array<number>(10).fill(5000),
    ...Array<number>(20).fill(3000),
    ...Array<number>(7).fill(SURVEY_NOT_JOINING),
  ];

  it("上の値段を選んだ人は、下の値段でも入る人として数える", () => {
    expect(countJoiners(answers, 10000)).toBe(3);
    expect(countJoiners(answers, 5000)).toBe(13);
    expect(countJoiners(answers, 3000)).toBe(33);
  });

  it("「入らない」（0）はどの値段でも数えない", () => {
    expect(countJoiners([0, 0, 0], 3000)).toBe(0);
    expect(countJoiners([0], 0)).toBe(0);
  });

  it("「ほかの金額」の人も、その金額以下の値段で数える", () => {
    expect(countJoiners([4000], 3000)).toBe(1);
    expect(countJoiners([4000], 5000)).toBe(0);
  });
});

describe("値段の決め方（resolvePrice）", () => {
  it("札を選んだらその値段、「入らない」は 0", () => {
    expect(resolvePrice(5000, "")).toEqual({ ok: true, yen: 5000 });
    expect(resolvePrice(SURVEY_NOT_JOINING, "")).toEqual({ ok: true, yen: 0 });
  });
  it("何も選んでいなければ受けない", () => {
    expect(resolvePrice(null, "")).toMatchObject({ ok: false });
    expect(resolvePrice(null, "  ")).toMatchObject({ ok: false });
  });
  it("「ほかの金額」は数字だけ（全角・カンマ・空白は直して受ける）", () => {
    expect(resolvePrice(null, "4000")).toEqual({ ok: true, yen: 4000 });
    expect(resolvePrice(null, "４，５００")).toEqual({ ok: true, yen: 4500 });
    expect(resolvePrice(null, " 2 000 ")).toEqual({ ok: true, yen: 2000 });
  });
  it("数字以外・0・大きすぎる値は受けない", () => {
    for (const bad of ["abc", "3000円", "-100", "1.5", "0", "0000", String(SURVEY_CUSTOM_PRICE_MAX + 1)]) {
      expect(resolvePrice(null, bad), bad).toMatchObject({ ok: false });
    }
    expect(resolvePrice(null, String(SURVEY_CUSTOM_PRICE_MAX))).toEqual({ ok: true, yen: SURVEY_CUSTOM_PRICE_MAX });
  });
  it("札と「ほかの金額」が両方あれば「ほかの金額」が勝つ", () => {
    expect(resolvePrice(3000, "4000")).toEqual({ ok: true, yen: 4000 });
  });
  it("札の値段は 1 か所の定数（昇順）で、表示は「〇円まで」", () => {
    expect(SURVEY_PRICE_CHIPS.length).toBeGreaterThan(0);
    expect([...SURVEY_PRICE_CHIPS]).toEqual([...SURVEY_PRICE_CHIPS].sort((a, b) => a - b));
    expect(priceLabel(3000)).toBe("3,000円まで");
    expect(priceLabel(0)).toBe(SURVEY_COPY.notJoiningLabel);
  });
});

describe("入力チェック（checkSurveyInput）", () => {
  const ok = { name: "ごしま", chip: 5000, customPrice: "", wish: "" };
  it("正しい入力は通り、前後の空白は取る", () => {
    expect(checkSurveyInput({ ...ok, name: "  ごしま  ", wish: " 要望 " })).toEqual({
      ok: true,
      answer: { displayName: "ごしま", priceYen: 5000, wishText: "要望" },
    });
  });
  it("名前は必須・30字まで", () => {
    expect(checkSurveyInput({ ...ok, name: "   " })).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
    expect(checkSurveyInput({ ...ok, name: "あ".repeat(30) }).ok).toBe(true);
    expect(checkSurveyInput({ ...ok, name: "あ".repeat(31) })).toMatchObject({ ok: false });
  });
  it("値段は必須", () => {
    expect(checkSurveyInput({ ...ok, chip: null })).toMatchObject({ ok: false, errors: { price: expect.any(String) } });
  });
  it("こんなのがあったらほしい、は任意・300字まで", () => {
    expect(checkSurveyInput({ ...ok, wish: "あ".repeat(300) }).ok).toBe(true);
    expect(checkSurveyInput({ ...ok, wish: "あ".repeat(301) })).toMatchObject({ ok: false, errors: { wish: expect.any(String) } });
  });
});

describe("招待リンク（normalizeInviteUrl）", () => {
  it("未設定・空・形が違うときは null（ボタンを出さない）", () => {
    for (const v of [undefined, null, "", "  ", "not a url", "javascript:alert(1)", "ftp://example.com"]) {
      expect(normalizeInviteUrl(v), String(v)).toBeNull();
    }
  });
  it("http(s) のリンクは通す", () => {
    expect(normalizeInviteUrl(" https://guild.gia2018.com/guild/join?invite=abc ")).toBe("https://guild.gia2018.com/guild/join?invite=abc");
  });
});

describe("回答ID（端末への保存）", () => {
  const id = "123e4567-e89b-42d3-a456-426614174000";
  function fakeWindow(store: Record<string, string> | "throws") {
    const storage = {
      getItem: (k: string) => { if (store === "throws") throw new Error("blocked"); return store[k] ?? null; },
      setItem: (k: string, v: string) => { if (store === "throws") throw new Error("blocked"); store[k] = v; },
    };
    (globalThis as unknown as { window: unknown }).window = { localStorage: storage };
  }
  it("uuid の形だけを回答IDとして受ける", () => {
    expect(isResponseToken(id)).toBe(true);
    for (const bad of ["", "abc", null, undefined, 1, id + "x", "' or 1=1 --"]) expect(isResponseToken(bad)).toBe(false);
  });
  it("保存して読み戻せる／変な値は保存も読みもしない", () => {
    const store: Record<string, string> = {};
    fakeWindow(store);
    expect(readStoredResponseToken()).toBeNull();
    storeResponseToken(id);
    expect(store[SURVEY_TOKEN_STORAGE_KEY]).toBe(id);
    expect(readStoredResponseToken()).toBe(id);
    storeResponseToken("bad");
    expect(store[SURVEY_TOKEN_STORAGE_KEY]).toBe(id);
    store[SURVEY_TOKEN_STORAGE_KEY] = "garbage";
    expect(readStoredResponseToken()).toBeNull();
  });
  it("localStorage が使えなくても落ちず、毎回新規（null）になる", () => {
    fakeWindow("throws");
    expect(readStoredResponseToken()).toBeNull();
    expect(() => storeResponseToken(id)).not.toThrow();
  });
  it("画面は送るとき保存した回答IDを渡し、返ってきた回答IDを保存する", () => {
    const code = stripComments(read("components/guild/survey-form.tsx"));
    expect(code).toMatch(/p_response_token:\s*readStoredResponseToken\(\)/);
    expect(code).toMatch(/storeResponseToken\(/);
  });
});

// ---- ソースの見張り ----

// 送信処理の中の順番：錠の確認 → 錠をかける → await rpc。錠が await より前にあること
function checkSendLock(source: string): string[] {
  const problems: string[] = [];
  const body = functionBody(source, "send");
  if (!body) return ["send() の本体が読めない"];
  const code = stripComments(body);
  const lock = code.indexOf("sendLock.current = true");
  const rpc = code.indexOf('.rpc("sakaba_submit_survey"');
  const guard = code.indexOf("if (sendLock.current) return");
  if (rpc < 0) problems.push("RPC を呼んでいない");
  if (guard < 0 || (rpc >= 0 && guard > rpc)) problems.push("送信前に錠の確認が無い");
  if (lock < 0 || (rpc >= 0 && lock > rpc)) problems.push("錠を await より前にかけていない");
  if (!/useRef/.test(source)) problems.push("錠が useRef ではない");
  // 失敗の道（if (error) { … return; }）では錠を外し、そのあとの成功の道では外さない
  const errStart = code.indexOf("if (error)");
  const errEnd = errStart < 0 ? -1 : code.indexOf("return;", errStart);
  if (errStart < 0 || errEnd < 0) {
    problems.push("失敗の道が読めない");
  } else {
    if (!/sendLock\.current = false/.test(code.slice(errStart, errEnd))) problems.push("失敗したとき錠を外していない");
    if (/sendLock\.current = false/.test(code.slice(errEnd))) problems.push("成功したあとに錠を外している");
  }
  return problems;
}

function checkForm(source: string): string[] {
  const code = stripComments(source);
  const problems: string[] = [];
  if (!/p_trap:\s*trap/.test(code)) problems.push("見えない入力欄の値を RPC に渡していない");
  if (!/name="website"/.test(code) || !/tabIndex=\{-1\}/.test(code)) problems.push("見えない入力欄が無い");
  if (!/SURVEY_COPY\.sending/.test(code)) problems.push("送信中の表示が無い");
  if (!/disabled=\{busy\}/.test(code)) problems.push("送信中にボタンを押せなくしていない");
  if (/\b(alert|confirm|prompt)\s*\(/.test(code)) problems.push("標準ダイアログを使っている");
  if (!/SURVEY_COPY\.backButton/.test(code)) problems.push("「もどって なおす」が無い");
  // 値段を画面に直書きしない
  if (/[0-9],?[0-9]{3}\s*円/.test(code) || /\b(3000|5000|10000|15000)\b/.test(code)) problems.push("値段を画面に直書きしている");
  return problems;
}

function checkMigration(sql: string): string[] {
  const code = stripSqlComments(sql);
  const problems: string[] = [];
  if (!/alter table sakaba\.survey_responses enable row level security/i.test(code)) problems.push("RLS を有効にしていない");
  if (!/revoke all on sakaba\.survey_responses from public, anon, authenticated/i.test(code)) problems.push("表の直接アクセスを外していない");
  if (/create policy/i.test(code)) problems.push("ポリシーを作っている（直接読み書きさせない）");
  // 上書きの目印は名前ではなく回答ID：名前の一意制約・名前での上書きは置かない（同名の別人を両方残す）
  if (/create unique index[^;]*display_name/i.test(code) || /on conflict/i.test(code)) problems.push("名前で上書きしている（同名の別人が消える）");
  if (!/response_token uuid not null default gen_random_uuid\(\) unique/i.test(code)) problems.push("回答IDの列が無い");
  if (!/where response_token = p_response_token and survey_key = p_survey_key/i.test(code)) problems.push("回答IDが一致する行だけを更新していない");
  if (!/insert into sakaba\.survey_responses[^;]*returning response_token into v_token/i.test(code)) problems.push("新規の行で回答IDを返していない");
  if (!/security definer/i.test(code)) problems.push("security definer ではない");
  if (!/pg_advisory_xact_lock/.test(code)) problems.push("上限の数え方が同時実行に弱い");
  if (!/updated_at > now\(\) - interval '1 minute'/.test(code) || !/v_recent >= 30(?![0-9])/.test(code) || !/survey_rate_limited/.test(code)) problems.push("1分あたりの上限が無い");
  if (!/btrim\(coalesce\(p_trap, ''\)\) <> ''/.test(code)) problems.push("見えない入力欄の判定が無い");
  if (!/grant execute on function public\.sakaba_submit_survey\(text, text, integer, text, text, uuid\) to anon, authenticated/i.test(code)) problems.push("ログインなしで呼べない");
  return problems;
}

describe("連続で送れない対策（見張り）", () => {
  const form = read("components/guild/survey-form.tsx");
  const sql = read("supabase/migrations/0129_sakaba_survey_responses.sql");

  it("送信：錠は await より前に useRef でかけ、成功したら外さず、失敗したら外す", () => {
    expect(checkSendLock(form)).toEqual([]);
  });
  it("画面：見えない入力欄・送信中の表示・もどって なおす・標準ダイアログ不使用・値段の直書きなし", () => {
    expect(checkForm(form)).toEqual([]);
  });
  it("SQL：直接読み書き不可・回答IDで上書き（同名は別の行）・1分あたりの上限・見えない入力欄・ログインなしで呼べる", () => {
    expect(checkMigration(sql)).toEqual([]);
  });
  it("SQL のコメントの数え方が countJoiners と同じ意味（以上・0は数えない）", () => {
    expect(sql).toMatch(/filter \(where r\.max_monthly_price_yen >= p\.price_yen\)/);
    expect(sql).toMatch(/r\.max_monthly_price_yen > 0/);
  });
  it("ログインなしで開ける：未ログインの行き先の例外と、ログイン済みの道に /guild/survey がある", () => {
    const middleware = read("lib/supabase/middleware.ts");
    expect(middleware).toMatch(/isPublicGuildRoute = [^;]*pathname === "\/guild\/survey"/);
    expect(middleware).toMatch(/isLiveGuildRoute =[\s\S]*?pathname === "\/guild\/survey"[\s\S]*?;\n\n/);
  });
});

describe("見張り自身の自己テスト（外すと落ちる）", () => {
  const form = read("components/guild/survey-form.tsx");
  const sql = read("supabase/migrations/0129_sakaba_survey_responses.sql");

  it("錠をかける行を消すと見つかる", () => {
    const broken = form.replace("    sendLock.current = true;\n", "");
    expect(broken).not.toBe(form);
    expect(checkSendLock(broken)).toContain("錠を await より前にかけていない");
  });
  it("成功したあとに錠を外すと見つかる", () => {
    const broken = form.replace("// 成功：錠は外さない（同じ内容をもう一度送れないように）", "sendLock.current = false;");
    expect(broken).not.toBe(form);
    expect(checkSendLock(broken)).toContain("成功したあとに錠を外している");
  });
  it("失敗しても錠を外さないと見つかる", () => {
    const broken = form.replace("      sendLock.current = false;\n      setBusy(false);\n      setSendError", "      setBusy(false);\n      setSendError");
    expect(broken).not.toBe(form);
    expect(checkSendLock(broken)).toContain("失敗したとき錠を外していない");
  });
  it("見えない入力欄を RPC に渡さないと見つかる", () => {
    expect(checkForm(form.replace("p_trap: trap,", "")).length).toBeGreaterThan(0);
  });
  it("画面に confirm() を足すと見つかる／コメントの中の confirm( は無視する", () => {
    expect(checkForm(`${form}\nif (confirm("x")) {}`)).toContain("標準ダイアログを使っている");
    expect(checkForm(`${form}\n// confirm( は使わない`)).toEqual([]);
  });
  it("値段を画面に直書きすると見つかる", () => {
    expect(checkForm(`${form}\nconst x = "3,000円";`)).toContain("値段を画面に直書きしている");
  });
  it("SQL の上限・上書き・RLS・直接アクセスを外すと見つかる", () => {
    for (const [from, to] of [
      ["v_recent >= 30", "v_recent >= 3000000"],
      ["where response_token = p_response_token and survey_key", "where lower(display_name) = lower(v_name) and survey_key"],
      ["response_token uuid not null default gen_random_uuid() unique", "response_token uuid not null default gen_random_uuid()"],
      ["enable row level security", "disable row level security"],
      ["revoke all on sakaba.survey_responses from public, anon, authenticated;", "revoke all on sakaba.survey_responses from public;"],
    ]) {
      const broken = sql.replace(from, to);
      expect(broken, from).not.toBe(sql);
      expect(checkMigration(broken).length, from).toBeGreaterThan(0);
    }
    expect(checkMigration(`${sql}\ncreate unique index x on sakaba.survey_responses (survey_key, lower(btrim(display_name)));`)).toContain("名前で上書きしている（同名の別人が消える）");
    expect(checkMigration(`${sql}\ncreate policy p on sakaba.survey_responses for select using (true);`).length).toBeGreaterThan(0);
  });
  it("SQL のコメントに書いた語では通らない（本体をコメントにすると落ちる）", () => {
    const broken = sql.replace("perform pg_advisory_xact_lock(hashtext('sakaba_submit_survey'));", "-- perform pg_advisory_xact_lock");
    expect(broken).not.toBe(sql);
    expect(checkMigration(broken)).toContain("上限の数え方が同時実行に弱い");
  });
});
