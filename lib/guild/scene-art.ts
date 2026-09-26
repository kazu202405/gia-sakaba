// 酒場の画面ごとの背景の絵（public/images/sakaba/<名前>_night.png / _day.png）。guild-shell.tsx が使う。
// 酒場の中の画面はすべて絵を敷く。絵が決まらない道は undefined（明るい帳面のまま）。

// 各画面の背景の絵（public/images/sakaba/<名前>_night.png / _day.png）。
// ギルドマスターはホームと同じ酒場の絵を使う。
export const SCENE_ART: Record<string, string> = {
  "/guild": "tavern",
  "/guild/master": "tavern",
  "/guild/thanks": "tavern",
  "/guild/members": "guild",
  "/guild/quests": "quests",
  "/guild/projects": "projects",
  "/guild/me": "me",
  "/guild/me/status": "me",
};

// 一覧より下の画面（中身・作成・編集・参加希望者など）は、一覧と同じ場所の絵を使う
const SECTION_ART: [prefix: string, art: string][] = [
  ["/guild/members/", "guild"],
  ["/guild/requests", "guild"],
  ["/guild/quests/", "quests"],
  ["/guild/projects/", "projects"],
  ["/guild/me/", "me"],
  ["/guild/notifications", "me"],
  ["/guild/plan", "me"],
  ["/guild/master/", "tavern"],
];

export function sceneArtOf(path: string): string | undefined {
  if (SCENE_ART[path]) return SCENE_ART[path];
  return SECTION_ART.find(([prefix]) => path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`))?.[1];
}
