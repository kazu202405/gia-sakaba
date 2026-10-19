// 酒場の事前アンケート（/guild/survey）の文言・値段の札・入力の決まり。
// 「30人で始める」前に、この値段で入る人が何人いるかを数えるためのもの。
// 文言と札の値段はここ1か所だけに置き、画面（survey-form.tsx）はここを読む。差し替えるときはこのファイルだけ直す。
// 仕様：contexts/projects/gia/sakaba_survey_spec.md

/** アンケートの識別子。次のアンケートを作るときは別の値にする（表の survey_key に入る） */
export const SURVEY_KEY = "community_2026_10";

export const SURVEY_NAME_MAX = 30;
export const SURVEY_WISH_MAX = 300;
/** 「ほかの金額」に入れられる上限（打ち間違いよけ。月額の会費なので十分大きい） */
export const SURVEY_CUSTOM_PRICE_MAX = 1_000_000;

/** 値段の札（月額の会費。「月いくらまでなら入るか」）。0 は「入らない」 */
export const SURVEY_NOT_JOINING = 0;
export const SURVEY_PRICE_CHIPS = [3000, 5000, 10000, 15000] as const;

export const SURVEY_COPY = {
  pageTitle: "頼る・頼られるで、いっしょに仕事をつくる",
  pageLead: "酒場をひらく前に、入りたいかどうかと、いくらまでなら入れるかを教えてください。",
  // 入ったら何が起きるか（機能の説明ではなく）。中身は五島さんと詰める
  conceptTitle: "こんな酒場を考えています",
  concept: [
    "ひとりでは受けられない仕事も、仲間とパーティを組めば受けられる",
    "月に1度、リアルの会で顔を合わせて、組む相手を見つける",
    "酒場の世話役が、合う仲間どうしをつなぐ",
  ],
  formTitle: "アンケート",
  nameLabel: "おなまえ",
  nameHint: "ニックネームでかまいません（30字まで）",
  priceLabel: "月いくらまでなら入りますか",
  priceHint: "月額の会費として、1つ選んでください。",
  customPriceLabel: "ほかの金額（数字だけ）",
  customPriceUnit: "円まで",
  notJoiningLabel: "入らない",
  priceNote: "会の参加費は別です。",
  wishLabel: "こんなのがあったらほしい",
  wishHint: "自由に書いてください（300字まで）",
  confirmButton: "▶ 内容を確認する",
  reviewTitle: "この内容で送りますか？",
  reviewLead: "送った内容は、五島に届きます。",
  backButton: "もどって なおす",
  sendButton: "▶ この内容で送る",
  sending: "送信中…",
  doneTitle: "送りました",
  doneMessage: "ありがとうございます。30人そろったら、五島からLINEでご連絡します。",
  inviteLead: "酒場は招待制です。先に登録だけしておくこともできます。",
  inviteButton: "▶ 先に酒場に登録しておく",
  errors: {
    name: `おなまえを${SURVEY_NAME_MAX}字以内で入力してください。`,
    price: "月いくらまでかを選ぶか、金額を入れてください。",
    customPrice: `ほかの金額は、1〜${SURVEY_CUSTOM_PRICE_MAX.toLocaleString("ja-JP")}の数字だけで入力してください。`,
    wish: `こんなのがあったらほしい、は${SURVEY_WISH_MAX}字以内にしてください。`,
    rateLimited: "いま送信が混み合っています。時間をおいて送ってください。入力した内容は残っています。",
    failed: "送れませんでした。時間をおいてもう一度お試しください。入力した内容は残っています。",
  },
} as const;

/** 送り直しの目印（回答ID）を端末に残す場所。同じ端末から送り直したときだけ、前の回答を更新する */
export const SURVEY_TOKEN_STORAGE_KEY = `sakaba_survey_response_token_${SURVEY_KEY}`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 回答IDとして使える形か（変なものは送らない） */
export function isResponseToken(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** 保存した回答IDを読む。読めない（プライベート窓など）ときは null ＝ 毎回新規 */
export function readStoredResponseToken(): string | null {
  try {
    const value = window.localStorage.getItem(SURVEY_TOKEN_STORAGE_KEY);
    return isResponseToken(value) ? value : null;
  } catch {
    return null;
  }
}

/** 回答IDを保存する。保存できなくても送信は成功扱い（次回は新規になるだけ） */
export function storeResponseToken(token: unknown): void {
  if (!isResponseToken(token)) return;
  try {
    window.localStorage.setItem(SURVEY_TOKEN_STORAGE_KEY, token);
  } catch {
    // 保存できない端末では、送り直しが新しい1件になるだけ
  }
}

export function formatYen(yen: number): string {
  return `${yen.toLocaleString("ja-JP")}円`;
}

/** 札・見直し画面に出す文字 */
export function priceLabel(yen: number): string {
  return yen === SURVEY_NOT_JOINING ? SURVEY_COPY.notJoiningLabel : `${formatYen(yen)}まで`;
}

export type PriceResult = { ok: true; yen: number } | { ok: false; error: string };

/**
 * 選んだ札（chip）か「ほかの金額」（custom）から、送る値段を決める。
 * 「ほかの金額」が入っていればそちらを使う（画面側でも、片方を触ったらもう片方を空にする）。
 * 全角数字・カンマ・空白は取り除く。数字以外が混ざったら受けない。
 */
export function resolvePrice(chip: number | null, custom: string): PriceResult {
  const normalized = custom.normalize("NFKC").replace(/[,\s]/g, "");
  if (normalized !== "") {
    if (!/^\d+$/.test(normalized)) return { ok: false, error: SURVEY_COPY.errors.customPrice };
    const yen = Number(normalized);
    if (!Number.isSafeInteger(yen) || yen < 1 || yen > SURVEY_CUSTOM_PRICE_MAX) {
      return { ok: false, error: SURVEY_COPY.errors.customPrice };
    }
    return { ok: true, yen };
  }
  if (chip === null) return { ok: false, error: SURVEY_COPY.errors.price };
  return { ok: true, yen: chip };
}

export type SurveyAnswer = { displayName: string; priceYen: number; wishText: string };
export type SurveyInput = { name: string; chip: number | null; customPrice: string; wish: string };
export type SurveyCheck =
  | { ok: true; answer: SurveyAnswer }
  | { ok: false; errors: { name?: string; price?: string; wish?: string } };

/** 送る前の入力チェック。画面の「確認する」と、送る直前の両方で使う */
export function checkSurveyInput(input: SurveyInput): SurveyCheck {
  const errors: { name?: string; price?: string; wish?: string } = {};
  const name = input.name.trim();
  const wish = input.wish.trim();
  if (!name || [...name].length > SURVEY_NAME_MAX) errors.name = SURVEY_COPY.errors.name;
  const price = resolvePrice(input.chip, input.customPrice);
  if (!price.ok) errors.price = price.error;
  if ([...wish].length > SURVEY_WISH_MAX) errors.wish = SURVEY_COPY.errors.wish;
  if (errors.name || errors.price || errors.wish || !price.ok) return { ok: false, errors };
  return { ok: true, answer: { displayName: name, priceYen: price.yen, wishText: wish } };
}

/**
 * 「この値段なら何人入るか」の数え方。
 * 「月いくらまで」で答えてもらうので、上の値段を選んだ人は下の値段でも入る人として数える。
 * 0（入らない）は、どの値段でも数えない。
 * 例：10,000円まで3人・5,000円まで10人・3,000円まで20人 → 5,000円なら13人、3,000円なら33人。
 * 本番のSQLでの数え方は migration 0129 の末尾コメントに同じ意味で置いてある（survey.test.ts が照合する）。
 */
export function countJoiners(maxMonthlyPricesYen: readonly number[], priceYen: number): number {
  return maxMonthlyPricesYen.filter((max) => max > SURVEY_NOT_JOINING && max >= priceYen).length;
}

/**
 * 送ったあとの「先に酒場に登録しておく」の行き先（五島さんの招待リンク1つ）。
 * 環境変数 SAKABA_SURVEY_INVITE_URL から読む。未設定・形が違うときは null（ボタンを出さない）。
 * http(s) 以外（javascript: など）は受けない。
 */
export function normalizeInviteUrl(raw: string | undefined | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** サーバー側（page.tsx）だけが呼ぶ */
export function surveyInviteUrlFromEnv(): string | null {
  return normalizeInviteUrl(process.env.SAKABA_SURVEY_INVITE_URL);
}
