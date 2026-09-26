// 酒場（guild.gia2018.com）で開いてよい道の判定。proxy.ts から呼ぶ。
//
// このリポジトリは gia-next の丸ごとコピーなので、何もしないと GIA 本体の画面
// （/login・/plans・/clone など）や API まで酒場のドメインで開けてしまう。
// そこで「通してよい道」だけを並べ、それ以外は閉じる（書き漏れたら閉じる側に倒れる）。
//
// - /（公開の酒場案内）と /guild 配下 → 通す
// - /guild-look（見た目の見比べ）→ 手元の開発中だけ通す
// - Next.js の内部ファイル・画像など → 通す
// - 酒場の決済・プッシュ通知APIとStripe Webhookだけ通し、その他の /api 配下 → 404
//   （リダイレクトすると外部からの呼び出しが 200 で成功したように見える）
// - それ以外 → /guild へ飛ばす

export type GuildGateResult =
  | { kind: "pass" }
  | { kind: "redirect"; to: string }
  | { kind: "notFound" };

export const GUILD_HOME = "/guild";

const ALLOWED_GUILD_API_PATHS = new Set([
  "/api/guild/billing/checkout",
  "/api/guild/billing/portal",
  "/api/guild/push/subscriptions",
  "/api/guild/push/dispatch",
  "/api/stripe/webhook",
]);

/** pathname がちょうど prefix か、prefix/ で始まるか（/guildx を /guild と見なさない） */
function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function guildGate(pathname: string, options: { allowLook: boolean }): GuildGateResult {
  if (pathname === "/") return { kind: "pass" };
  // 招待制の集まりだけは公開。推測しやすい文字列や余分な下位パスは通さない。
  if (/^\/e\/[0-9a-f]{64}$/i.test(pathname)) return { kind: "pass" };
  if (isUnder(pathname, GUILD_HOME)) return { kind: "pass" };
  if (options.allowLook && isUnder(pathname, "/guild-look")) return { kind: "pass" };

  // Next.js の内部（静的ファイル・開発時の自動更新やエラー表示）と、公開してよい固定ファイル
  if (pathname.startsWith("/_next/") || pathname.startsWith("/__nextjs")) return { kind: "pass" };
  if (isUnder(pathname, "/images")) return { kind: "pass" };
  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/guild-sw.js" || pathname === "/gia-logo.png") return { kind: "pass" };

  if (ALLOWED_GUILD_API_PATHS.has(pathname)) return { kind: "pass" };
  if (isUnder(pathname, "/api")) return { kind: "notFound" };

  return { kind: "redirect", to: GUILD_HOME };
}
