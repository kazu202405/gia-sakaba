// 決済導線から人を返す先を決める。
//
// なぜ切り出すか:
//   「Company Note から来た人を Company Note に返す」ための ?from=note は、
//   /upgrade（¥4,980）・/upgrade/[plan]（¥11,000/¥33,000）・Server Action の
//   3箇所で手書きされていた。同じ規則を3回書いた結果、/upgrade/[plan] の
//   未ログイン分岐だけ from が落ち、招待された人が登録・決済したあと
//   GIA のマイページに着地していた（＝招待された人の経路だけが壊れていた）。
//   既ログインでは通るので、自分で踏んでも気づけない。規則は1箇所にする。
//
// ⚠️ **origin は既知の値だけ通す。** 任意文字列をリダイレクト先に混ぜると
//    オープンリダイレクトになる。呼び出し側で `from === "note" ? "note" : null`
//    に正規化してから渡すこと。

export type UpgradeOrigin = "note" | null;

/** 決済起動時の戻り先以外に "ok" 以外で行き先が要る status。 */
export type UpgradeFallbackStatus =
  | "unauthenticated"
  | "already_active"
  | "unavailable";

/**
 * 内部パスに ?from=note を足す（既にクエリがあれば & で継ぐ）。
 * origin が null のときは元のパスをそのまま返す。
 */
export function withOrigin(path: string, origin: UpgradeOrigin): string {
  if (origin !== "note") return path;
  return `${path}${path.includes("?") ? "&" : "?"}from=note`;
}

/**
 * Checkout に渡す success / cancel パス。
 *
 * `entryPath` は申込を始めたページ（"/upgrade" や "/upgrade/invite"）。
 * キャンセルはそこへ戻す ＝ もう一度押せば同じ段の決済に入れる。
 */
export function checkoutPaths(
  entryPath: string,
  origin: UpgradeOrigin,
): { successPath: string; cancelPath: string } {
  return {
    successPath: withOrigin(
      "/upgrade/success?session_id={CHECKOUT_SESSION_ID}",
      origin,
    ),
    cancelPath: withOrigin(entryPath, origin),
  };
}

/**
 * Checkout が "ok" 以外を返したときの行き先。
 *
 * - unauthenticated … ログイン後に同じ申込ページへ戻す（再クリック不要）
 * - already_active  … 既に会員。Company Note から来たなら Company Note へ返す
 * - unavailable     … 準備中。公開の /upgrade に倒す
 */
export function upgradeFallbackUrl(
  status: UpgradeFallbackStatus,
  opts: { entryPath: string; origin: UpgradeOrigin; noteUrl: string },
): string {
  const { entryPath, origin, noteUrl } = opts;
  switch (status) {
    case "unauthenticated":
      return `/login?next=${encodeURIComponent(withOrigin(entryPath, origin))}`;
    case "already_active":
      return origin === "note"
        ? noteUrl
        : "/members/app/mypage?checkout=already";
    case "unavailable":
      return withOrigin("/upgrade?checkout=unavailable", origin);
  }
}
