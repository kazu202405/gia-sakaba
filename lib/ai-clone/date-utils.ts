// 相対日付（曜日表現）の解決ヘルパー。
// LLM（gpt-4o-mini）は「今日の曜日」と「今週の金曜」の算術を誤りやすく、
// 「今週の金曜＝6/12」を 6/10 等と取り違える。曜日が絡む締切はコードで確定する。

export const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"] as const;

// YYYY-MM-DD の暦日の曜日番号（日=0〜土=6）。曜日は時刻非依存なので UTC midnight で解釈。
export function weekdayOfYMD(ymd: string): number {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

// "2026-06-09" → "2026-06-09（火）"。LLM プロンプトに曜日を明示するため。
export function withWeekday(ymd: string): string {
  return `${ymd}（${WEEKDAY_JP[weekdayOfYMD(ymd)]}）`;
}

// 「今週の金曜」「金曜まで」「来週の月曜」等の曜日表現を today 起点で YYYY-MM-DD に確定。
// 締切用途なので「今日以降の最初の該当曜日」を返す（今日が該当曜日なら今日）。
// 「来週の◯曜」はさらに +7。曜日表現が無ければ null（呼び出し側は LLM 値にフォールバック）。
export function resolveRelativeWeekday(
  text: string,
  todayYMD: string,
): string | null {
  const wdMap: Record<string, number> = {
    日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6,
  };
  const m = text.match(/(来週|今週)?[のな]?\s*([日月火水木金土])\s*曜/);
  if (!m) return null;
  const targetWd = wdMap[m[2]];
  const base = new Date(`${todayYMD}T00:00:00Z`);
  const todayWd = base.getUTCDay();
  let diff: number;
  if (m[1] === "今週" || m[1] === "来週") {
    // 月曜始まりの週で該当曜日を確定する（「来週」はさらに +7）。
    const mondayOffset = (todayWd + 6) % 7; // 今日 → 今週月曜への戻り日数
    const targetIdxMon = (targetWd + 6) % 7; // 月=0 … 日=6
    diff = -mondayOffset + targetIdxMon + (m[1] === "来週" ? 7 : 0);
  } else {
    // 修飾なし（「金曜まで」等）は今日以降の最初の該当曜日（過去日にしない）。
    diff = (targetWd - todayWd + 7) % 7;
  }
  const r = new Date(base.getTime() + diff * 86400000);
  return `${r.getUTCFullYear()}-${String(r.getUTCMonth() + 1).padStart(2, "0")}-${String(r.getUTCDate()).padStart(2, "0")}`;
}

// 相対日付（曜日に加え「今日/明日/明後日/N日後」）を today 起点で YYYY-MM-DD に確定。
// gpt-4o-mini は「明日」も含め日付算術を誤りやすいので、コードで確定できるものは上書きする。
// 該当表現が無ければ null（呼び出し側は LLM 値にフォールバック）。
export function resolveRelativeDate(
  text: string,
  todayYMD: string,
): string | null {
  const addDays = (n: number): string => {
    const base = new Date(`${todayYMD}T00:00:00Z`);
    const r = new Date(base.getTime() + n * 86400000);
    return `${r.getUTCFullYear()}-${String(r.getUTCMonth() + 1).padStart(2, "0")}-${String(r.getUTCDate()).padStart(2, "0")}`;
  };
  // 「N日後」
  const nDays = text.match(/(\d+)\s*日後/);
  if (nDays) return addDays(parseInt(nDays[1], 10));
  if (/明後日|あさって/.test(text)) return addDays(2);
  if (/明日|あした|翌日/.test(text)) return addDays(1);
  if (/今日|本日/.test(text)) return addDays(0);
  // 曜日表現は既存ロジックへ委譲
  return resolveRelativeWeekday(text, todayYMD);
}

// 今日（JST）の YYYY-MM-DD。
export function todayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
}
