// ホーム画面に置いたアプリのアイコンの数字（Badging API）。
// 対応していない端末・ブラウザ・許可が無いときは何もしない（数字は飾りなので、失敗しても酒場は止めない）。
// iPhone は、ホーム画面に追加したアプリで、通知を許可しているときに出る。

type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** 0 のときは数字を消す。100以上は端末に任せる（そのまま渡す） */
export function setAppIconBadge(total: number): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as BadgeNavigator;
  const apply = total > 0 ? nav.setAppBadge?.(Math.floor(total)) : nav.clearAppBadge?.();
  void apply?.catch(() => undefined);
}
