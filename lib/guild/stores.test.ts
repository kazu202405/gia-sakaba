import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_STORE_SLUG, STORES, STORE_SLUGS, findStore, storeOrDefault, storeThemeAttrs } from "./stores";
import { buildManifest } from "./manifest";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

/** migration から店の行（slug・名前・terms）を読む。コード側の設定と食い違わないことを照合するため */
function giaFromMigration0077() {
  const sql = read("supabase/migrations/0077_sakaba_core_schema.sql");
  // 店の行：insert into sakaba.guilds (id, slug, name) values ('…', 'gia', 'GIAの酒場')
  const row = /insert into sakaba\.guilds \(id, slug, name\)\s*values \('[^']+', '([^']+)', '([^']+)'\)/.exec(sql);
  // terms の既定値：列 terms の default jsonb_build_object('member', '仲間', …)
  const termsBlock = /terms jsonb not null default jsonb_build_object\(([\s\S]*?)\),\n\s*created_at/.exec(sql);
  const terms: Record<string, string> = {};
  for (const m of (termsBlock?.[1] ?? "").matchAll(/'([a-z]+)',\s*'([^']*)'/g)) terms[m[1]] = m[2];
  return { slug: row?.[1], name: row?.[2], terms };
}

// 建設・不動産の店：店の行は 0132、呼び名は 0133 で直した最新（後の migration が先の terms を上書きする）
function kensetsuFromMigrations() {
  const sql = read("supabase/migrations/0132_sakaba_second_store_kensetsu_fudosan.sql");
  const row = /insert into sakaba\.guilds \(id, slug, name, terms\)\s*values \(\s*'[^']+',\s*'([^']+)',\s*'([^']+)',\s*'(\{[^']*\})'::jsonb/.exec(sql);
  const fix = read("supabase/migrations/0133_sakaba_kensetsu_fudosan_terms.sql");
  const update = /update sakaba\.guilds\s*set terms = '(\{[^']*\})'::jsonb\s*where slug = '([^']+)'/.exec(fix);
  const terms = update && update[2] === row?.[1] ? JSON.parse(update[1]) as Record<string, string> : row ? JSON.parse(row[3]) as Record<string, string> : undefined;
  return { slug: row?.[1], name: row?.[2], terms, updatedBy0133: Boolean(update) };
}

describe("店の設定とDB（migration）が食い違わない", () => {
  it("GIAの酒場：slug・名前・呼び名（0077）", () => {
    const db = giaFromMigration0077();
    const code = STORES.gia;
    expect(db.slug).toBe(code.slug);
    expect(db.name).toBe(code.name);
    expect(Object.keys(db.terms).sort()).toEqual(Object.keys(code.terms).sort());
    expect(db.terms).toEqual(code.terms);
  });

  it("建設・不動産の酒場：slug・名前・呼び名（0132＋0133）", () => {
    const db = kensetsuFromMigrations();
    const code = STORES["kensetsu-fudosan"];
    expect(db.slug).toBe(code.slug);
    expect(db.name).toBe(code.name);
    expect(db.terms).toEqual(code.terms);
  });

  it("コードに登録した店は、すべて migration に店の行がある（片方だけ足すと落ちる）", () => {
    const sqlFiles = [read("supabase/migrations/0077_sakaba_core_schema.sql"), read("supabase/migrations/0132_sakaba_second_store_kensetsu_fudosan.sql"), read("supabase/migrations/0133_sakaba_kensetsu_fudosan_terms.sql")].join("\n");
    for (const slug of STORE_SLUGS) expect([slug, sqlFiles.includes(`'${slug}'`)]).toEqual([slug, true]);
  });

  it("見張り自身：migration から読めている（空振りで通らない）", () => {
    expect(giaFromMigration0077().slug).toBe("gia");
    expect(Object.keys(giaFromMigration0077().terms)).toHaveLength(5);
    expect(kensetsuFromMigrations().slug).toBe("kensetsu-fudosan");
    expect(Object.keys(kensetsuFromMigrations().terms ?? {})).toHaveLength(5);
    expect(kensetsuFromMigrations().updatedBy0133).toBe(true);
  });

  it("呼び名が違うとちゃんと見つかる（わざとずらして確かめる）", () => {
    const db = kensetsuFromMigrations();
    const shifted = { ...STORES["kensetsu-fudosan"].terms, quest: "クエスト" };
    expect(db.terms).not.toEqual(shifted);
  });
});

describe("店の設定", () => {
  it("slug はキーと一致し、URLに使える形（DB の guilds_slug_format と同じ）", () => {
    for (const [key, store] of Object.entries(STORES)) {
      expect(store.slug).toBe(key);
      expect(store.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("既定の店は登録されている", () => {
    expect(findStore(DEFAULT_STORE_SLUG)).not.toBeNull();
    expect(storeOrDefault("nonexistent").slug).toBe(DEFAULT_STORE_SLUG);
    expect(storeOrDefault(null).slug).toBe(DEFAULT_STORE_SLUG);
    expect(storeOrDefault("").slug).toBe(DEFAULT_STORE_SLUG);
  });

  it("findStore は登録された slug だけ返す（prototype の名前や大文字は返さない）", () => {
    expect(findStore("kensetsu-fudosan")?.name).toBe("建設・不動産の酒場");
    for (const bad of ["toString", "__proto__", "constructor", "GIA", "Gia", "gia ", "", null, undefined]) expect(findStore(bad)).toBeNull();
  });

  it("2店目は落ち着いた見た目（plain）。ドット文字・ゲーム風の窓を使う tavern ではない", () => {
    expect(STORES["kensetsu-fudosan"].theme).toBe("plain");
    expect(STORES.gia.theme).toBe("tavern");
  });

  it("案内ページ（未ログインで開く）は建設・不動産の店が持つ。文言が空でない", () => {
    const landing = STORES["kensetsu-fudosan"].landing;
    expect(landing).toBeDefined();
    expect(landing?.headline.length).toBeGreaterThan(5);
    expect(landing?.points.length).toBeGreaterThanOrEqual(2);
    for (const point of landing?.points ?? []) {
      expect(point.title).not.toBe("");
      expect(point.body).not.toBe("");
    }
    // GIAの酒場の案内は / （app/page.tsx）。ここには持たない
    expect(STORES.gia.landing).toBeUndefined();
  });

  it("案内の文言に、物件の掲載・広告・投資の勧誘に読める言葉を入れない（宅建業法・金商法の入口）", () => {
    const text = JSON.stringify(STORES["kensetsu-fudosan"].landing);
    for (const word of ["物件情報", "利回り", "儲か", "必ず", "掲載料", "広告"]) expect(text).not.toContain(word);
  });

  it("テーマの属性（CSS が読む）", () => {
    expect(storeThemeAttrs(STORES["kensetsu-fudosan"])).toEqual({ "data-store": "kensetsu-fudosan", "data-theme": "plain" });
    expect(storeThemeAttrs(STORES.gia)).toEqual({ "data-store": "gia", "data-theme": "tavern" });
  });

  it("メニューの「クエスト」の呼び名は DB の terms.quest と同じ", () => {
    // guild-shell.tsx の buildNav が config.terms.quest を使う。ここでは設定に空が無いことだけ確かめる
    for (const store of Object.values(STORES)) for (const value of Object.values(store.terms)) expect(value.trim()).not.toBe("");
  });
});

describe("店ごとのCSS（色・形）が実際にある", () => {
  const css = read("components/guild/guild-theme.css");
  it("テーマ plain と、店ごとの色が guild-theme.css にある", () => {
    for (const store of Object.values(STORES)) {
      if (store.theme === "plain") expect(css).toContain(`[data-theme="plain"]`);
    }
    expect(css).toContain(`[data-store="kensetsu-fudosan"]`);
  });

  it("plain の店は、ドット文字（--font-pixel-jp）に戻さない", () => {
    const plain = /\[data-theme="plain"\] \{[\s\S]*?\n\}/.exec(css)?.[0] ?? "";
    expect(plain).toContain("--guild-heading-font: var(--font-jp-sans)");
    expect(plain).not.toContain("pixel");
  });

  it("色は変数で呼ぶ（共通部品の窓・ボタンに直書きの色が残っていない）", () => {
    for (const selector of [".c-window {", ".c-card {", ".rpg-button {", ".c-button {", ".c-button-sub {", ".c-input {"]) {
      const start = css.indexOf(`\n${selector}`);
      expect(start, selector).toBeGreaterThan(-1);
      const block = css.slice(start, css.indexOf("\n}", start));
      expect(block, selector).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      // 数字で書いた色（rgb(27 42 65 / …)）は不可。変数を読む rgb(var(--guild-ink-rgb) / …) は可
      expect(block, selector).not.toMatch(/rgba?\(\s*\d/);
    }
  });
});

describe("manifest（ホーム画面に追加するアプリ）", () => {
  it("GIAの酒場は昔の id と開始位置のまま（入れ直しにならない）", () => {
    const manifest = buildManifest(STORES.gia);
    expect(manifest.id).toBe("/guild");
    expect(manifest.start_url).toBe("/guild");
    expect(manifest.scope).toBe("/guild");
    expect(manifest.name).toBe("GIAの酒場");
  });
  it("2店目は自分の名前・開始位置。範囲（scope）は /guild 全体（通知の Service Worker と同じ）", () => {
    const manifest = buildManifest(STORES["kensetsu-fudosan"]);
    expect(manifest.id).toBe("/guild/kensetsu-fudosan");
    expect(manifest.start_url).toBe("/guild/kensetsu-fudosan");
    expect(manifest.scope).toBe("/guild");
    expect(manifest.name).toBe("建設・不動産の酒場");
  });
});
