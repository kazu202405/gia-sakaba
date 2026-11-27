// 酒場の「店」ごとの設定（見た目・案内ページの文言・呼び名）を置く、唯一の場所。
// 画面コードで店の slug を決め打ちしない。「今の店」は lib/guild/current-store.ts（サーバー）と
// components/guild/store-context.tsx（ブラウザ）から読む。
//
// DB の sakaba.guilds（slug・名前・terms）と食い違わないよう、stores.test.ts が migration と照合している。
//  - gia：0077 の店の行（terms は列の既定値）
//  - kensetsu-fudosan：0132 の店の行
// 店を足す・呼び名を変えるときは、この表と migration（or update の SQL）を一緒に直す。
//
// 店に属さない画面（ログインなど）や、店が決まらないときの既定は DEFAULT_STORE_SLUG。
// 店を作る画面はまだ無い（2号店以降は SQL で行を足し、ここにも1店分を足す）。

import { GIA_WORDS } from "./words/gia";
import { KENSETSU_FUDOSAN_WORDS } from "./words/kensetsu-fudosan";
import type { StoreWords } from "./store-words";
import type { ProfileField } from "./store-profile";

export type StoreTheme = "tavern" | "plain";

/** DB の guilds.terms と同じ5つの呼び名 */
export type StoreTerms = {
  member: string;
  quest: string;
  party: string;
  master: string;
  status: string;
};

/** 未ログインで /guild/<店> を開いたときの案内ページ。無い店は、ログイン画面へ送る。
 *  文言の | は折り返してよい位置（components/guild/phrase.tsx の Ph）。| 以外では折り返さない */
export type StoreLanding = {
  headline: string;
  lead: string;
  points: { title: string; body: string }[];
  /** 招待された人への案内 */
  inviteNote: string;
};

export type StoreConfig = {
  /** URL に入る名前（DB の guilds.slug と同じ） */
  slug: string;
  /** DB の guilds.name と同じ */
  name: string;
  /** 見た目。tavern＝夜の酒場（ドット文字・ゲーム風の窓）／plain＝落ち着いた普通の見た目 */
  theme: StoreTheme;
  /** DB の guilds.terms と同じ */
  terms: StoreTerms;
  /** メニューの「名簿」の呼び名（terms.member とは別。GIAの酒場は昔から「ギルド」） */
  rosterLabel: string;
  /** 画面の言葉の表（terms の5語で足りない言い回し。lib/guild/words/）。キーは全店で同じ */
  words: StoreWords;
  /** この店のプロフィールで出す項目（DB の guilds.profile_fields と同じ。0134。食い違うと stores.test.ts が落ちる） */
  profileFields: readonly ProfileField[];
  /** LINE などでURLを送ったときの説明・ブラウザのアプリ名の説明 */
  description: string;
  /** ホーム画面に追加したときのアプリの id と開始位置。GIAの酒場は昔の値のまま（入れ直しにならないように） */
  pwa: { id: string; startPath: string };
  landing?: StoreLanding;
  /** 登録の入口で「無料で登録できます」と約束してよい店（FREE_JOIN_COPY を出す）。有料の入口にする店には付けない */
  freeJoin?: boolean;
};

/** 店が決まらないとき・店に属さない画面で使う店。昔の道（/guild/…）の転送先もここ */
export const DEFAULT_STORE_SLUG = "gia";

const GIA: StoreConfig = {
  slug: "gia",
  name: "GIAの酒場",
  freeJoin: true,
  theme: "tavern",
  terms: { member: "仲間", quest: "クエスト", party: "パーティ", master: "ギルドマスター", status: "ステータス" },
  rosterLabel: "ギルド",
  words: GIA_WORDS,
  profileFields: ["headline", "job", "industry", "region", "bio", "can_help_with", "strengths", "values_text", "vision", "social_issue", "looking_for", "want_to_meet", "want_to_solve", "hometown", "hobbies", "life_story", "birthday"],
  description: "仕事の話が、次の一歩になる場所。仲間・クエスト・プロジェクトをひとつの酒場に。",
  pwa: { id: "/guild", startPath: "/guild" },
};

export const CONSTRUCTION_STORE_SLUG = "kensetsu-fudosan";

const KENSETSU_FUDOSAN: StoreConfig = {
  slug: CONSTRUCTION_STORE_SLUG,
  name: "建設・不動産の酒場",
  theme: "plain",
  // 呼び名は五島さんが決めた（2026-10-24）。直すときは DB の terms（migration 0133）と一緒に
  terms: { member: "メンバー", quest: "案件", party: "チーム", master: "管理者", status: "プロフィール" },
  rosterLabel: "名簿",
  words: KENSETSU_FUDOSAN_WORDS,
  profileFields: ["headline", "industry_choice", "work_areas", "work_types", "licenses", "bio", "work_photos", "looking_for", "hometown", "hobbies", "life_story"],
  description: "工事の相談、協力会社探し、知り合いからの紹介。建設・不動産の招待制の酒場です。",
  pwa: { id: "/guild/kensetsu-fudosan", startPath: "/guild/kensetsu-fudosan" },
  landing: {
    headline: "工事の相談、|協力会社探し、|知り合いからの紹介。",
    lead: "建設・不動産のメンバー同士で、|相談や依頼ができる|招待制の酒場です。",
    points: [
      {
        title: "案件・探しものを出す",
        body: "外壁塗装を頼める会社や、|リノベの協力会社を探せます。|依頼を出すと、|メンバーから返事を受け取れます。",
      },
      {
        title: "知り合いに紹介を頼む",
        body: "間に入る知り合いと、|紹介してほしい相手が|了承すると、つながれます。",
      },
    ],
    inviteNote: "招待を受けた方は、|届いた招待リンクから入会できます。",
  },
};

/** 全店。キーは slug */
export const STORES: Readonly<Record<string, StoreConfig>> = {
  [GIA.slug]: GIA,
  [KENSETSU_FUDOSAN.slug]: KENSETSU_FUDOSAN,
};

export const STORE_SLUGS: readonly string[] = Object.keys(STORES);

/** slug から店の設定を引く。登録されていない slug は null（大文字小文字は区別する。URLは小文字だけ） */
export function findStore(slug: string | null | undefined): StoreConfig | null {
  if (!slug || !Object.prototype.hasOwnProperty.call(STORES, slug)) return null;
  return STORES[slug];
}

/** slug から店の設定を引く。登録されていなければ既定の店 */
export function storeOrDefault(slug: string | null | undefined): StoreConfig {
  return findStore(slug) ?? STORES[DEFAULT_STORE_SLUG];
}

/** 店のラッパーに付ける属性。guild-theme.css の [data-theme]（形）と [data-store]（色）がこれを読む */
export function storeThemeAttrs(config: StoreConfig) {
  return { "data-store": config.slug, "data-theme": config.theme } as const;
}
