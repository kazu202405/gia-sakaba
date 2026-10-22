// 酒場の道（URL）を作る・読む、唯一の場所。画面コードに "/guild/..." を直書きしない（store-literal-guard.test.ts で見張る）。
//
// 道の形：
//   /guild/<店>/…         店に属する画面（ホーム・名簿・クエスト・マイページなど）
//   /guild/login ほか      店に属さない画面（ログイン・パスワード再設定・入会・アンケート）。下の OUTSIDE_STORE_SEGMENTS
//   /guild/<店に属する画面の名前>/…   昔の道。/guild/<既定の店>/… へ転送する（proxy.ts → route-gate.ts）
//
// 店の slug の一覧と見た目・文言は lib/guild/stores.ts。ここは道の組み立てだけを持つ（店の一覧は読むだけ）。

import { DEFAULT_STORE_SLUG, findStore } from "./stores";

/** 酒場の道の入口。「どの店に入るか」を決める /guild（ログイン後の既定の行き先） */
export const GUILD_ROOT = "/guild";

/**
 * 店に属さない画面の名前。/guild/<名前> の形のまま使う（店の slug にはできない）。
 * - join：招待コードが店を決める（入会フォームは招待の店の見た目で出る）
 * - survey：事前アンケート（店を持たない）
 */
export const OUTSIDE_STORE_SEGMENTS = ["login", "join", "forgot-password", "reset-password", "auth", "survey", "manifest.webmanifest"] as const;

/**
 * 昔の道の最初の1文字列。/guild/<これ>/… は、店ができる前の道なので既定の店へ転送する。
 * （招待リンク・プッシュ通知の行き先・ブックマークを壊さないため）
 */
export const LEGACY_STORE_SEGMENTS = ["master", "me", "members", "notifications", "plan", "projects", "quests", "requests", "thanks"] as const;

/** 店の slug にしてはいけない名前（上の2つと衝突する）。stores.test.ts が全店を照合する */
export const RESERVED_STORE_SLUGS: readonly string[] = [...OUTSIDE_STORE_SEGMENTS, ...LEGACY_STORE_SEGMENTS, "api", "e", "i", "p"];

/**
 * 店の中の道を作る。rest は店の中での道（"/quests"・"/quests/abc?x=1"・"?welcome=1"・"" など）。
 *   guildPath("gia", "/quests") → "/guild/gia/quests"
 *   guildPath("gia", "") → "/guild/gia"
 */
export function guildPath(slug: string, rest = ""): string {
  if (rest !== "" && !/^[/?#]/.test(rest)) throw new Error(`guildPath: rest は "/" "?" "#" で始めてください: ${rest}`);
  return `${GUILD_ROOT}/${slug}${rest}`;
}

/** 店に属さない画面の道を作る。name は OUTSIDE_STORE_SEGMENTS のどれか（"auth/callback" のような下位も可）。query は "?…" を含めて渡す */
export function outsideStorePath(name: string, query = ""): string {
  const head = name.split("/")[0];
  if (!(OUTSIDE_STORE_SEGMENTS as readonly string[]).includes(head)) throw new Error(`outsideStorePath: 店に属さない画面ではありません: ${name}`);
  if (query !== "" && !/^[?#]/.test(query)) throw new Error(`outsideStorePath: query は "?" か "#" で始めてください: ${query}`);
  return `${GUILD_ROOT}/${name}${query}`;
}

export type ParsedGuildPath =
  | { kind: "root" }
  | { kind: "store"; slug: string; rest: string }
  | { kind: "outside"; segment: string; rest: string }
  | { kind: "legacy"; segment: string; rest: string }
  | { kind: "unknown"; segment: string; rest: string }
  | { kind: "none" };

/**
 * pathname を読む。rest は "/" で始まる残り（なければ ""）。
 * - /guild → root／/guild/<登録された店>/… → store／/guild/login ほか → outside／昔の道 → legacy
 * - それ以外の /guild/xxx → unknown（店の slug として登録されていない）
 * - /guild で始まらない → none
 */
export function parseGuildPath(pathname: string): ParsedGuildPath {
  if (pathname === GUILD_ROOT || pathname === `${GUILD_ROOT}/`) return { kind: "root" };
  if (!pathname.startsWith(`${GUILD_ROOT}/`)) return { kind: "none" };
  const tail = pathname.slice(GUILD_ROOT.length + 1);
  const slash = tail.indexOf("/");
  const segment = slash === -1 ? tail : tail.slice(0, slash);
  const rest = slash === -1 ? "" : tail.slice(slash);
  if ((OUTSIDE_STORE_SEGMENTS as readonly string[]).includes(segment)) return { kind: "outside", segment, rest };
  if ((LEGACY_STORE_SEGMENTS as readonly string[]).includes(segment)) return { kind: "legacy", segment, rest };
  if (findStore(segment)) return { kind: "store", slug: segment, rest: rest === "/" ? "" : rest };
  return { kind: "unknown", segment, rest };
}

/** 店の中の道（rest）だけを取り出す。店の道でなければ null。"/guild/gia/quests/abc" → "/quests/abc" */
export function storeRestOf(pathname: string): string | null {
  const parsed = parseGuildPath(pathname);
  return parsed.kind === "store" ? parsed.rest : null;
}

/** pathname が /guild/<店> の店なら slug。なければ null */
export function storeSlugOfPath(pathname: string): string | null {
  const parsed = parseGuildPath(pathname);
  return parsed.kind === "store" ? parsed.slug : null;
}

/** 昔の道を既定の店の道にした形。昔の道でなければ null。"/guild/quests/abc" → "/guild/gia/quests/abc" */
export function legacyPathToStore(pathname: string): string | null {
  const parsed = parseGuildPath(pathname);
  if (parsed.kind !== "legacy") return null;
  return guildPath(DEFAULT_STORE_SLUG, `/${parsed.segment}${parsed.rest}`);
}

/** メールのリンクで戻ってくる先（ログイン用・登録確認用）。next は戻ったあとに行く道 */
export function authCallbackUrl(origin: string, next: string): string {
  return `${origin.replace(/\/+$/, "")}${outsideStorePath("auth/callback", `?next=${encodeURIComponent(next)}`)}`;
}

/** 招待リンク（入会画面）の道。招待コードが店を決めるので、店の名前は入れない（昔の招待リンクもそのまま使える） */
export function joinInvitePath(code: string): string {
  return outsideStorePath("join", `?invite=${encodeURIComponent(code)}`);
}

/**
 * 酒場のAPI（/api/guild/…）を呼ぶ道。どの店の話かを ?store= で渡す（proxy.ts が今の店として受け取る）。
 *   guildApiPath("gia", "/billing/portal", { from: "me" }) → "/api/guild/billing/portal?store=gia&from=me"
 */
export function guildApiPath(slug: string, path: string, params: Record<string, string> = {}): string {
  if (!path.startsWith("/")) throw new Error(`guildApiPath: path は "/" で始めてください: ${path}`);
  const query = new URLSearchParams({ [STORE_QUERY_PARAM]: slug, ...params });
  return `/api/guild${path}?${query}`;
}

/** ホーム画面に追加するアプリの設定ファイル（manifest）の道か。ログイン前にも取得される公開の固定ファイル */
export function isManifestPath(pathname: string): boolean {
  const parsed = parseGuildPath(pathname);
  if (parsed.kind === "outside") return parsed.segment === "manifest.webmanifest" && parsed.rest === "";
  return parsed.kind === "store" && parsed.rest === "/manifest.webmanifest";
}

/** ログイン後などの戻り先（?next=）として安全な、酒場の中の道か。外のサイトや "//" で始まる値は拒否する */
export function isGuildLocalPath(value: string | null | undefined): value is string {
  if (!value || value.startsWith("//") || value.includes("\\")) return false;
  return value === GUILD_ROOT || value.startsWith(`${GUILD_ROOT}/`) || value.startsWith(`${GUILD_ROOT}?`);
}

/**
 * proxy.ts が「今の店」をサーバーの画面コードへ渡すのに使うリクエストヘッダー名。
 * 画面コードは直接読まず、lib/guild/current-store.ts の currentStore() を使う。
 * クライアントが勝手に付けたものは proxy.ts が必ず消して、道から決め直す（ヘッダーは信用の根拠にしない。
 * 店の権限そのものは、DB の関数が会員かどうかで判定する）。
 */
export const STORE_HEADER = "x-guild-store";

/** 酒場のAPIが「どの店の話か」を受け取る検索パラメータ名（/api/guild/…?store=<slug>） */
export const STORE_QUERY_PARAM = "store";

/** このリクエストが指す店の slug。決まらなければ null（その場合、画面コードは既定の店を使う） */
export function requestStoreSlug(pathname: string, searchParams: URLSearchParams): string | null {
  const fromPath = storeSlugOfPath(pathname);
  if (fromPath) return fromPath;
  if (pathname.startsWith("/api/guild/")) {
    const slug = searchParams.get(STORE_QUERY_PARAM);
    return findStore(slug) ? slug : null;
  }
  return null;
}
