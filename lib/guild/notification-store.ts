// おしらせの「読んだ」状態を、ヘッダーの未読数とおしらせ一覧で共有する（見本用）。
// 本番では sakaba.notifications の read_at を更新し、ここはその読み込みに差し替える。

import type { GuildNotification } from "./types";
import { ME_ID, TODAY, listNotifications } from "./mock-data";

const initialItems = listNotifications(ME_ID);
let items: GuildNotification[] = initialItems;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeNotifications(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotifications(): GuildNotification[] {
  return items;
}

/** サーバー側の描画とはじめの描画は、読んだ状態を持たない同じ一覧にそろえる */
export function getInitialNotifications(): GuildNotification[] {
  return initialItems;
}

export function markNotificationRead(id: string): void {
  if (!items.some((n) => n.id === id && n.read_at === null)) return;
  items = items.map((n) => (n.id === id ? { ...n, read_at: TODAY } : n));
  emit();
}

export function markAllNotificationsRead(): void {
  if (!items.some((n) => n.read_at === null)) return;
  items = items.map((n) => (n.read_at === null ? { ...n, read_at: TODAY } : n));
  emit();
}
