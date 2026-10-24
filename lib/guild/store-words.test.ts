import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { fillWords, makeWording } from "./store-words";
import { STORES } from "./stores";
import { GIA_WORDS } from "./words/gia";
import { KENSETSU_FUDOSAN_WORDS } from "./words/kensetsu-fudosan";

// 画面の言葉の表（lib/guild/words/）の見張り。
//  1. GIAの酒場の言葉は昔の画面のまま（スナップショットで固定。変えるなら五島さんに確かめてから）
//  2. 建設・不動産の店に、ゲームの言葉・ひらがな見出しが残っていない
//  3. 両店のキーと「{名前}」の差し込み場所が揃っている
//  4. 表の言葉が画面コードのどこかで使われている（使われない言葉を溜めない）

/** 建設・不動産の店で使わない言葉（五島さんが決めた呼び名の表の「GIAの酒場」の列と、ひらがな見出し） */
export const GAME_WORDS = [
  "クエスト", "ギルド", "パーティ", "ステータス", "マスター", "仲間",
  "けいじばん", "なかま", "めいかん", "めいし", "かいしゃ", "しょくぎょう", "ぎょうしゅ", "ちいき",
  "しめきり", "ばしょ", "にんずう", "くわしく", "かんたん", "おしらせ", "しょうかい", "かいすう", "かぞえかた",
  "おしはらい", "しゅるい", "じょうけん", "じょうたい", "ぼしゅう", "おわった", "のこって", "なおす", "なおせ", "いらい",
  "さがす", "きほん", "かくにん", "コマンド", "あゆみ", "しゅみ", "たんじょうび", "しゅっしんち", "れんらく",
] as const;
/** ひらがなの間に空白を挟む書き方（「すすめている プロジェクト」「おわった 日」など）。ゲーム風の区切り */
const SPACED_KANA = /[\u3041-\u3096] [\u3041-\u3096\u30A1-\u30FA]/;

/** 値（文字列）だけを調べる。キー名や、この表の外のコメントは調べない（注意書きで落ちない） */
export function findGameWords(words: Record<string, string>): { key: string; hit: string }[] {
  const found: { key: string; hit: string }[] = [];
  for (const [key, value] of Object.entries(words)) {
    for (const word of GAME_WORDS) if (value.includes(word)) found.push({ key, hit: word });
    if (SPACED_KANA.test(value)) found.push({ key, hit: "ひらがなの間の空白" });
  }
  return found;
}

const placeholdersOf = (text: string) => [...text.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]).sort();

function collectStrings(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") into.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, into);
  else if (value && typeof value === "object") for (const item of Object.values(value)) collectStrings(item, into);
  return into;
}

describe("GIAの酒場の言葉は変えない", () => {
  it("言葉の表は昔の画面の文字のまま（変えると落ちる。意図して変えるときだけスナップショットを更新する）", () => {
    expect(GIA_WORDS).toMatchSnapshot();
  });

  it("店の設定の呼び名・名簿のメニュー・店の名前も昔のまま", () => {
    const gia = STORES.gia;
    expect(gia.name).toBe("GIAの酒場");
    expect(gia.terms).toEqual({ member: "仲間", quest: "クエスト", party: "パーティ", master: "ギルドマスター", status: "ステータス" });
    expect(gia.rosterLabel).toBe("ギルド");
    expect(gia.description).toBe("仕事の話が、次の一歩になる場所。仲間・クエスト・プロジェクトをひとつの酒場に。");
  });

  it("GIAの酒場の画面の文字（差し込みを済ませたもの）の代表例", () => {
    const w = makeWording(GIA_WORDS);
    expect(w("shell.menuTitle")).toBe("コマンド");
    expect(w("quests.title", { quest: "クエスト" })).toBe("クエスト けいじばん");
    expect(w("members.title", { member: "仲間" })).toBe("仲間 めいかん");
    expect(w("status.editButton")).toBe("▶ ステータスをなおす");
    expect(w("home.activeProjects")).toBe("すすめている プロジェクト");
    expect(w("notif.questApplied", { name: "山田", title: "LP" })).toBe("山田さんが「LP」に 参加したいと伝えました");
    expect(w("due.over", { n: 2 })).toBe("2日 すぎています");
  });
});

describe("建設・不動産の店にゲームの言葉が残っていない", () => {
  it("言葉の表の値にゲームの言葉・ひらがなの区切りが無い", () => {
    expect(findGameWords(KENSETSU_FUDOSAN_WORDS)).toEqual([]);
  });

  it("店の設定（呼び名・名簿・説明・案内ページ）にも無い", () => {
    const store = STORES["kensetsu-fudosan"];
    const strings = collectStrings({ ...store, words: undefined });
    const words = Object.fromEntries(strings.map((text, index) => [`s${index}`, text]));
    expect(findGameWords(words)).toEqual([]);
    expect(store.terms).toEqual({ member: "メンバー", quest: "案件", party: "チーム", master: "管理者", status: "プロフィール" });
    expect(store.rosterLabel).toBe("名簿");
  });

  it("見張り自身：旧語・ひらがなの区切りを見つける（空振りで通らない）", () => {
    for (const word of GAME_WORDS) expect(findGameWords({ k: `これは${word}です` }), word).toEqual([{ key: "k", hit: word }]);
    expect(findGameWords({ k: "すすめている プロジェクト" })).toEqual([{ key: "k", hit: "ひらがなの間の空白" }]);
    // 漢字や英数字との間の空白は区切りではない
    expect(findGameWords({ k: "月3件" })).toEqual([]);
    expect(findGameWords({ k: "案件 3件" })).toEqual([]);
    expect(findGameWords({ k: "締め切り 10/5" })).toEqual([]);
    expect(findGameWords({ k: "タスク 3/5 完了" })).toEqual([]);
  });

  it("見張り自身：キー名や表の外の文字は調べない（注意書きで落ちない）", () => {
    expect(findGameWords({ "クエスト.title": "案件", "ギルド注意": "名簿" })).toEqual([]);
  });

  it("見張り自身：建設・不動産の表の1つをGIAの言葉に戻すと落ちる", () => {
    for (const key of ["quests.title", "shell.menuTitle", "status.editButton", "notif.draftWaiting", "home.activeProjects"] as const) {
      const reverted = { ...KENSETSU_FUDOSAN_WORDS, [key]: GIA_WORDS[key] };
      expect(findGameWords(reverted).map((hit) => hit.key), key).toContain(key);
    }
  });
});

describe("両店の表がそろっている", () => {
  it("キーが同じ（片方にだけあるキーがあれば落ちる）", () => {
    expect(Object.keys(KENSETSU_FUDOSAN_WORDS).sort()).toEqual(Object.keys(GIA_WORDS).sort());
    for (const store of Object.values(STORES)) expect(Object.keys(store.words).sort(), store.slug).toEqual(Object.keys(GIA_WORDS).sort());
  });

  it("建設・不動産の「{名前}」は、GIAの表にもある（呼ぶ側は GIAの表の分を全部渡す。足りない名前が出ると落ちる）", () => {
    for (const key of Object.keys(GIA_WORDS) as (keyof typeof GIA_WORDS)[]) {
      const gia = placeholdersOf(GIA_WORDS[key]);
      for (const name of placeholdersOf(KENSETSU_FUDOSAN_WORDS[key])) expect(gia, `${key} の {${name}}`).toContain(name);
    }
  });

  it("空の値が無い", () => {
    for (const store of Object.values(STORES)) for (const [key, value] of Object.entries(store.words)) expect(value.trim(), `${store.slug}:${key}`).not.toBe("");
  });
});

describe("差し込み", () => {
  it("{名前} を値に置き換える。渡されなかった名前はそのまま残る（画面を止めない）", () => {
    expect(fillWords("{a}と{b}", { a: "X", b: 2 })).toBe("Xと2");
    expect(fillWords("{a}と{b}", { a: "X" })).toBe("Xと{b}");
    expect(fillWords("そのまま")).toBe("そのまま");
  });
  it("差し込む値に {} が入っていても、もう一度置き換えない", () => {
    expect(fillWords("{a}", { a: "{b}", b: "危険" })).toBe("{b}");
  });
});

describe("表の言葉は画面コードのどこかで使われている", () => {
  function sourceFiles(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (path.split(sep).join("/").endsWith("lib/guild/words")) continue;
        sourceFiles(path, out);
      } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
    }
    return out;
  }
  const source = ["app", "components", "lib"].flatMap((dir) => sourceFiles(dir)).map((path) => readFileSync(path, "utf8")).join("\n");

  it("使われていないキーが無い", () => {
    const unused = Object.keys(GIA_WORDS).filter((key) => !source.includes(`"${key}"`));
    expect(unused).toEqual([]);
  });
});
