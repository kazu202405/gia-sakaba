// 日付リマインド（ai_clone_dated_reminder）の繰り返し計算。
// 配信（morning-briefing）と一覧（/tasks/dates）の両方から使う純関数。
//
// 日付は 'YYYY-MM-DD' の Y/M/D を直接比較する（TZ ずれを避けるため Date 演算しない）。

export type Recurrence = "none" | "yearly" | "monthly" | "milestone";

interface YMD {
  y: number;
  m: number; // 1-12
  d: number;
}

export function parseYMD(s: string): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function ymdToStr({ y, m, d }: YMD): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function ymdEq(a: YMD, b: YMD): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

// その年月の最終日（28-31）
function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// base から n ヶ月後（日が無ければ月末にクランプ）
function addMonths(base: YMD, n: number): YMD {
  const total = base.y * 12 + (base.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const d = Math.min(base.d, lastDayOfMonth(y, m));
  return { y, m, d };
}

// monthly の「その月の該当日」（base.d が無い月は月末）
function monthlyDayInMonth(base: YMD, y: number, m: number): number {
  return Math.min(base.d, lastDayOfMonth(y, m));
}

export interface OccursHit {
  // milestone のときだけ「何ヶ月の節目か」を返す（"3ヶ月" 表示用）
  milestoneMonth?: number;
}

// target 日（'YYYY-MM-DD'）にこのリマインドが鳴るか。鳴らないなら null。
export function occursOn(
  baseDate: string,
  recurrence: Recurrence,
  milestoneMonths: number[],
  target: string,
): OccursHit | null {
  const base = parseYMD(baseDate);
  const t = parseYMD(target);
  if (!base || !t) return null;

  switch (recurrence) {
    case "none":
      return ymdEq(base, t) ? {} : null;
    case "yearly":
      return base.m === t.m && base.d === t.d ? {} : null;
    case "monthly":
      return t.d === monthlyDayInMonth(base, t.y, t.m) ? {} : null;
    case "milestone": {
      for (const n of milestoneMonths) {
        if (n > 0 && ymdEq(addMonths(base, n), t)) return { milestoneMonth: n };
      }
      return null;
    }
    default:
      return null;
  }
}

// from（'YYYY-MM-DD'、含む）以降で次に鳴る日。無ければ null。一覧の「次回」表示用。
export function nextOccurrence(
  baseDate: string,
  recurrence: Recurrence,
  milestoneMonths: number[],
  from: string,
): string | null {
  const base = parseYMD(baseDate);
  const f = parseYMD(from);
  if (!base || !f) return null;
  const fromNum = f.y * 10000 + f.m * 100 + f.d;
  const num = (x: YMD) => x.y * 10000 + x.m * 100 + x.d;

  switch (recurrence) {
    case "none":
      return num(base) >= fromNum ? ymdToStr(base) : null;
    case "yearly": {
      for (let y = f.y; y <= f.y + 1; y++) {
        const d = Math.min(base.d, lastDayOfMonth(y, base.m));
        const cand: YMD = { y, m: base.m, d };
        if (num(cand) >= fromNum) return ymdToStr(cand);
      }
      return null;
    }
    case "monthly": {
      // f の当月から最大13ヶ月先まで走査
      for (let i = 0; i < 13; i++) {
        const total = f.y * 12 + (f.m - 1) + i;
        const y = Math.floor(total / 12);
        const m = (total % 12) + 1;
        const cand: YMD = { y, m, d: monthlyDayInMonth(base, y, m) };
        if (num(cand) >= fromNum) return ymdToStr(cand);
      }
      return null;
    }
    case "milestone": {
      const cands = milestoneMonths
        .filter((n) => n > 0)
        .map((n) => addMonths(base, n))
        .filter((c) => num(c) >= fromNum)
        .sort((a, b) => num(a) - num(b));
      return cands.length > 0 ? ymdToStr(cands[0]) : null;
    }
    default:
      return null;
  }
}

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: "単発",
  yearly: "毎年",
  monthly: "毎月",
  milestone: "節目",
};
