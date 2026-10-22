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

export type StoreTheme = "tavern" | "plain";

/** DB の guilds.terms と同じ5つの呼び名 */
export type StoreTerms = {
  member: string;
  quest: string;
  party: string;
  master: string;
  status: string;
};

/** 未ログインで /guild/<店> を開いたときの案内ページ。無い店は、ログイン画面へ送る */
export type StoreLanding = {
  eyebrow: string;
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
  /** LINE などでURLを送ったときの説明・ブラウザのアプリ名の説明 */
  description: string;
  /** ホーム画面に追加したときのアプリの id と開始位置。GIAの酒場は昔の値のまま（入れ直しにならないように） */
  pwa: { id: string; startPath: string };
  landing?: StoreLanding;
};

/** 店が決まらないとき・店に属さない画面で使う店。昔の道（/guild/…）の転送先もここ */
export const DEFAULT_STORE_SLUG = "gia";

const GIA: StoreConfig = {
  slug: "gia",
  name: "GIAの酒場",
  theme: "tavern",
  terms: { member: "仲間", quest: "クエスト", party: "パーティ", master: "ギルドマスター", status: "ステータス" },
  rosterLabel: "ギルド",
  description: "仕事の話が、次の一歩になる場所。仲間・クエスト・プロジェクトをひとつの酒場に。",
  pwa: { id: "/guild", startPath: "/guild" },
};

const KENSETSU_FUDOSAN: StoreConfig = {
  slug: "kensetsu-fudosan",
  name: "建設・不動産の酒場",
  theme: "plain",
  // 呼び名は仮。五島さんが実画面を見て直す（直すときは migration 0132 の terms と一緒に）
  terms: { member: "仲間", quest: "案件・探しもの", party: "チーム", master: "マスター", status: "プロフィール" },
  rosterLabel: "仲間",
  description: "建設・不動産の仲間どうしで、案件・探しもの・紹介を持ち寄る、招待制の集まりです。",
  pwa: { id: "/guild/kensetsu-fudosan", startPath: "/guild/kensetsu-fudosan" },
  // 案内ページの文言は仮。物件の掲載や広告に読めない書き方にしている（宅建業法・五島さんと詰める）
  landing: {
    eyebrow: "招待制のコミュニティ",
    headline: "現場と不動産の仕事の話が、次の一歩になる場所。",
    lead: "建設・不動産に関わる仲間どうしで、案件・探しもの・人の紹介を持ち寄ります。顔の見える相手とだけ、落ち着いて相談できる場です。",
    points: [
      { title: "案件・探しものを出せる", body: "「こんな工事の相手を探している」「この分野に詳しい人はいないか」を、仲間に向けて出せます。" },
      { title: "仲間を紹介してもらえる", body: "マスターが間に入り、合いそうな仲間どうしをつなぎます。連絡先は、お互いが了承してから開きます。" },
      { title: "進行をひとつの場所で", body: "話が動き出したら、プロジェクトとして期限や担当を共有できます。" },
    ],
    inviteNote: "会員は招待制です。招待リンクを受け取った方は、そのリンクから入会してください。",
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
