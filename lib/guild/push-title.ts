// プッシュ通知の題名。通知の行き先（href）がどの店の道かで、その店の名前にする。
// DB の sakaba_push_candidates は本文と行き先だけを返す（店の名前は返さない）ので、題名はここで道から決める。
// 店の道でないもの・昔の道は既定の店（GIAの酒場）。

import { parseGuildPath } from "./store-path";
import { findStore, storeOrDefault } from "./stores";

export function pushTitleFor(href: string): string {
  let pathname = "";
  try {
    pathname = new URL(href, "https://example.invalid").pathname;
  } catch {
    return storeOrDefault(null).name;
  }
  const parsed = parseGuildPath(pathname);
  if (parsed.kind === "store") return (findStore(parsed.slug) ?? storeOrDefault(null)).name;
  return storeOrDefault(null).name;
}
