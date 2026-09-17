// 「くわしく／かんたん」の見え方を、画面をまたいで共有する。
// その人のブラウザにだけ覚えさせる（ほかの人にも、ほかの端末にも影響しない）。

import { loadViewMode, saveViewMode, type ViewMode } from "./filters";

let mode: ViewMode | null = null;
const listeners = new Set<() => void>();

export function subscribeViewMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getViewMode(): ViewMode {
  // はじめて聞かれたときに ブラウザの記録を読む（読めなければ「くわしく」）
  if (mode === null) mode = loadViewMode();
  return mode;
}

/** サーバー側の描画と、はじめの描画は そろえる（ちらつかせない） */
export function getServerViewMode(): ViewMode {
  return "full";
}

export function setViewMode(next: ViewMode): void {
  mode = next;
  saveViewMode(next);
  listeners.forEach((fn) => fn());
}
