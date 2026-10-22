// 酒場で「開いてよい道」の表。lib/supabase/middleware.ts（ログイン判定）が読む。
// 店の中の道は、店の名前を外した形（rest：""・"/members"・"/quests/<id>" など）で照合する。
// 一覧に無い道は、ログイン済みでも入口（/guild）へ戻される。道を足したら、ここにも足す（live-routes.test.ts が app/guild の画面と突き合わせる）。

import { parseGuildPath } from "./store-path";
import { findStore } from "./stores";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

const STORE_EXACT = new Set([
  "",
  "/members",
  "/quests",
  "/quests/new",
  "/projects",
  "/projects/new",
  "/me",
  "/me/status",
  "/me/status/draft",
  "/me/wish",
  "/plan",
  "/requests",
  "/notifications",
  "/master",
  "/master/gathering/new",
]);

const STORE_PATTERNS = [
  /^\/members\/.*$/,
  new RegExp(`^/projects/${UUID}(?:/edit)?$`, "i"),
  new RegExp(`^/quests/${UUID}(?:/(?:edit|applicants))?$`, "i"),
];

/** 店の中の道（rest）として開いてよいか */
export function isLiveStoreRest(rest: string): boolean {
  return STORE_EXACT.has(rest) || STORE_PATTERNS.some((pattern) => pattern.test(rest));
}

/** 店に属さない画面のうち、ログイン済みでも開いてよい道（ログイン画面は別扱い＝画面側で戻す） */
const OUTSIDE_LIVE = new Set(["join", "survey", "forgot-password", "reset-password", "auth/callback"]);

/** 未ログインでも開いてよい、店に属さない画面 */
const OUTSIDE_PUBLIC = new Set(["login", "join", "survey", "forgot-password", "reset-password", "auth/callback"]);

/** 店の外の道の名前（"/guild/" の後ろ。"login"・"auth/callback"）。店の外の道でなければ null */
function outsideName(pathname: string): string | null {
  const parsed = parseGuildPath(pathname);
  return parsed.kind === "outside" ? `${parsed.segment}${parsed.rest}` : null;
}

/** 未ログインでも開いてよい酒場の道か。店に属さない画面と、案内ページ（landing）を持つ店のホームだけ */
export function isPublicGuildPath(pathname: string): boolean {
  const name = outsideName(pathname);
  if (name !== null) return OUTSIDE_PUBLIC.has(name);
  const parsed = parseGuildPath(pathname);
  return parsed.kind === "store" && parsed.rest === "" && Boolean(findStore(parsed.slug)?.landing);
}

/** ログイン済みの人が開いてよい酒場の道か（ログイン画面そのものは別に通す） */
export function isLiveGuildPath(pathname: string): boolean {
  const parsed = parseGuildPath(pathname);
  if (parsed.kind === "root") return true;
  if (parsed.kind === "store") return isLiveStoreRest(parsed.rest);
  if (parsed.kind === "outside") return OUTSIDE_LIVE.has(`${parsed.segment}${parsed.rest}`);
  return false;
}

/** ログイン画面か */
export function isLoginPath(pathname: string): boolean {
  return outsideName(pathname) === "login";
}
