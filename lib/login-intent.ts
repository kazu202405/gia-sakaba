// ログイン画面に来た理由を、許可した内部パスだけから判定する。
// 決済直前の人に通常ログイン画面を見せると「なぜまたログイン？」となるため、
// Company Note の招待経路だけは本人確認の文脈を明示する。

export type LoginIntent = "company-note-invite" | "default";

export function loginIntentFor(nextPath: string | null): LoginIntent {
  if (!nextPath?.startsWith("/") || nextPath.startsWith("//")) {
    return "default";
  }

  const url = new URL(nextPath, "https://gia2018.com");
  return url.pathname === "/upgrade/invite" &&
    url.searchParams.get("from") === "note"
    ? "company-note-invite"
    : "default";
}
