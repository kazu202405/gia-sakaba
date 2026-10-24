import type { Wording } from "./store-words";
import { GIA_WORDS } from "./words/gia";

// ギルドの約束。画面にもDBにも依存しない決まりだけを置き、テスト（rules.test.ts）で見張る。
//
// 「儲かるなら何でもいい、ではない」は クエストの種類ではなく、入会で同意する「ギルドの約束」にする。

/** 入会のときに 同意してもらう ギルドの約束（ビジネスの約束） */
export const GUILD_PROMISES = [
  "ネットワークビジネス・情報商材などの 勧誘を しない",
  "紹介料だけが 目的の 紹介を しない",
  "紹介してくれた人と、紹介された相手の 信頼を 裏切らない",
] as const;

/**
 * 話すときの約束（グランドルール）。集まり・紹介で会うときの 場の決まり。
 * 「否定しない」は 反対意見を言うなという意味ではないので、「まず受け止める」を先に書く
 * 文字は店ごとの言葉の表（lib/guild/words/）。GROUND_RULES・PROMISE_NOTE は GIAの酒場の言葉で、店を持たない入会の画面が使う。
 * 店の画面は groundRulesFor(store.w)・store.w("rules.promiseNote") を使う。
 */
export const GROUND_RULES = [GIA_WORDS["rules.ground.1"], GIA_WORDS["rules.ground.2"], GIA_WORDS["rules.ground.3"]] as const;

export function groundRulesFor(w: Wording): string[] {
  return [w("rules.ground.1"), w("rules.ground.2"), w("rules.ground.3")];
}

/** 約束に反するクエストは ギルドマスターが取り下げる（出すときの注意にも使う） */
export const PROMISE_NOTE = GIA_WORDS["rules.promiseNote"];
