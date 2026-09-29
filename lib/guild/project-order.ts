// プロジェクトの並び順（0118）。並び順は人ごと。
// 順が無いもの（作ったばかり・並べ替えたことがない）は上に、新しい順で出す。そのあとに自分で並べた順。

type Orderable = { id: string; created_at: string };

export function applyProjectOrder<T extends Orderable>(projects: T[], orderIds: string[]): T[] {
  const position = new Map(orderIds.map((id, index) => [id, index]));
  const unplaced = projects.filter((project) => !position.has(project.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const placed = projects.filter((project) => position.has(project.id))
    .sort((a, b) => position.get(a.id)! - position.get(b.id)!);
  return [...unplaced, ...placed];
}

/** index の項目を1つ上（-1）か下（+1）へ。端なら そのまま */
export function moveItem<T>(list: T[], index: number, step: -1 | 1): T[] {
  const to = index + step;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** 読んだ並び順を確かめる。形がおかしければ空（＝並べ替える前と同じ、新しい順） */
export function parseProjectOrder(data: unknown): string[] {
  return Array.isArray(data) ? data.filter((id): id is string => typeof id === "string") : [];
}
