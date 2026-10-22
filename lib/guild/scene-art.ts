// 酒場の画面ごとの背景の絵（public/images/sakaba/<名前>_night.png / _day.png）。guild-shell.tsx が使う。
// 酒場の中の画面はすべて絵を敷く。絵が決まらない道は undefined（明るい帳面のまま）。
// 道は店の名前を外した形（lib/guild/store-path.ts の storeRestOf）で照合するので、どの店でも同じ表を使う。
// （絵そのものを出すかは店のテーマ次第＝落ち着いた見た目の店は絵を敷かない。guild-shell.tsx）

import { storeRestOf } from "./store-path";

// 各画面の背景の絵。キーは店の中の道（""＝店のホーム）。
// ギルドマスターはホームと同じ酒場の絵を使う。
export const SCENE_ART: Record<string, string> = {
  "": "tavern",
  "/master": "tavern",
  "/thanks": "tavern",
  "/members": "guild",
  "/quests": "quests",
  "/projects": "projects",
  "/me": "me",
  "/me/status": "me",
};

// 一覧より下の画面（中身・作成・編集・参加希望者など）は、一覧と同じ場所の絵を使う
const SECTION_ART: [prefix: string, art: string][] = [
  ["/members/", "guild"],
  ["/requests", "guild"],
  ["/quests/", "quests"],
  ["/projects/", "projects"],
  ["/me/", "me"],
  ["/notifications", "me"],
  ["/plan", "me"],
  ["/master/", "tavern"],
];

/** pathname（/guild/<店>/…）の背景の絵。店の道でなければ undefined */
export function sceneArtOf(pathname: string): string | undefined {
  const rest = storeRestOf(pathname);
  if (rest === null) return undefined;
  if (Object.prototype.hasOwnProperty.call(SCENE_ART, rest)) return SCENE_ART[rest];
  return SECTION_ART.find(([prefix]) => rest === prefix || rest.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`))?.[1];
}
