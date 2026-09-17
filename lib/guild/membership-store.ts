// 見本の本人が 有料会員か、実績を見せるか（見本用）。
// 本番では 有料かどうかは GIA の applicants.plan をサーバー側で見る（ここで切り替えられてはいけない）。
// 見本では 無料／有料 の両方の見え方を確かめるために、マイページから切り替えられるようにしている。

type State = { isPaid: boolean; showAchievements: boolean };

const initial: State = { isPaid: false, showAchievements: true };
let state: State = initial;
const listeners = new Set<() => void>();

export function subscribeMembership(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMembership(): State {
  return state;
}

/** サーバー側の描画とはじめの描画は、切り替える前の同じ値にそろえる */
export function getInitialMembership(): State {
  return initial;
}

export function setMembership(patch: Partial<State>): void {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}
