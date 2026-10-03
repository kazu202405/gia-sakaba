// くり返しタスクの 次のしめきりの計算。
// DB 側（supabase/migrations/0125 の sakaba.recurrence_next_date / recurrence_first_date）と
// 同じ決まりで書いている。直すときは両方。日付はすべて "YYYY-MM-DD"（日本時間のきょうを呼ぶ側が渡す）。

export type RecurrenceKind = "weekly" | "monthly" | "month_end";

export type Recurrence = { kind: RecurrenceKind; day: number | null };

/** 画面の「くり返し」欄の選びかた */
export type RecurrenceChoice = "" | RecurrenceKind;

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"]; // 1=月 … 7=日（DB の isodow と同じ）

export function weekdayName(day: number): string {
  return WEEKDAYS[day - 1] ?? "";
}

function parse(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

function fmt(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 1=月 … 7=日 */
function isoDow(date: string): number {
  const { y, m, d } = parse(date);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=日
  return dow === 0 ? 7 : dow;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate(); // m は 1〜12
}

function addDaysTo(date: string, days: number): string {
  const { y, m, d } = parse(date);
  return fmt(Date.UTC(y, m - 1, d + days));
}

/** くり返しの種類と日にちの組み合わせが正しいか（DB の表の制約と同じ） */
export function isValidRecurrence(kind: RecurrenceKind, day: number | null): boolean {
  if (kind === "weekly") return day !== null && Number.isInteger(day) && day >= 1 && day <= 7;
  if (kind === "monthly") return day !== null && Number.isInteger(day) && day >= 1 && day <= 31;
  return day === null;
}

/**
 * 基準日（前の回のしめきり。無ければ済にした日）の「次の回」。
 * 計算した日が today より前なら、today 以降の最初の該当日まで進める（過去の分をためない）。
 */
export function nextDueDate(kind: RecurrenceKind, day: number | null, base: string, today: string): string {
  if (!isValidRecurrence(kind, day)) throw new Error("invalid recurrence");
  if (kind === "weekly") {
    // 基準より後で いちばん近い その曜日（基準がその曜日なら +7日）
    let v = addDaysTo(base, ((day! - isoDow(base) + 6) % 7) + 1);
    if (v < today) {
      const { y, m, d } = parse(v);
      const behind = Math.round((Date.UTC(...ymd(today)) - Date.UTC(y, m - 1, d)) / 86400000);
      v = addDaysTo(v, 7 * Math.ceil(behind / 7));
    }
    return v;
  }
  const b = parse(base);
  let y = b.y;
  let m = b.m + 1; // 翌月から
  for (;;) {
    if (m > 12) {
      y += Math.floor((m - 1) / 12);
      m = ((m - 1) % 12) + 1;
    }
    const last = daysInMonth(y, m);
    const dd = kind === "month_end" ? last : Math.min(day!, last);
    const v = fmt(Date.UTC(y, m - 1, dd));
    if (v >= today) return v;
    m += 1;
  }
}

function ymd(date: string): [number, number, number] {
  const { y, m, d } = parse(date);
  return [y, m - 1, d];
}

/** today 以降で 最初の該当日（くり返しを付けたとき、しめきりが空の場合に入れる日） */
export function firstDueDate(kind: RecurrenceKind, day: number | null, today: string): string {
  if (kind === "weekly") return nextDueDate(kind, day, addDaysTo(today, -1), today);
  const t = parse(today);
  // 前の月の末日を基準にすると「今月の該当日」から探せる
  return nextDueDate(kind, day, fmt(Date.UTC(t.y, t.m - 1, 0)), today);
}

/** 一覧の印・読み上げに使う言い方（例：毎週月曜／毎月25日／毎月末） */
export function recurrenceLabel(kind: RecurrenceKind | null | undefined, day: number | null | undefined): string {
  if (kind === "weekly" && day) return `毎週${weekdayName(day)}曜`;
  if (kind === "monthly" && day) return `毎月${day}日`;
  if (kind === "month_end") return "毎月末";
  return "";
}

export type RecurrenceDraft = { choice: RecurrenceChoice; weekday: string; monthDay: string };

/** 画面の入力 → DB に送る値。なしなら null */
export function toRecurrence(draft: RecurrenceDraft): Recurrence | null {
  if (draft.choice === "weekly") return { kind: "weekly", day: Number(draft.weekday) };
  if (draft.choice === "monthly") return { kind: "monthly", day: Number(draft.monthDay) };
  if (draft.choice === "month_end") return { kind: "month_end", day: null };
  return null;
}

/** 保存済みの値 → 画面の入力（日にちが空なら、しめきり／きょうの曜日・日を初期値にする） */
export function toDraft(kind: RecurrenceKind | null | undefined, day: number | null | undefined, hintDate: string): RecurrenceDraft {
  const hint = parse(hintDate);
  return {
    choice: kind ?? "",
    weekday: String(kind === "weekly" && day ? day : isoDow(hintDate)),
    monthDay: String(kind === "monthly" && day ? day : hint.d),
  };
}

/** 入力チェック。問題なければ null（日にちが範囲外のときだけ理由を返す） */
export function validateRecurrenceDraft(draft: RecurrenceDraft): string | null {
  if (draft.choice === "weekly" && !isValidRecurrence("weekly", Number(draft.weekday))) return "曜日を えらんでください。";
  if (draft.choice === "monthly" && !isValidRecurrence("monthly", Number(draft.monthDay))) return "日にちは 1〜31 のあいだで えらんでください。";
  return null;
}

/**
 * 保存時のしめきり。くり返しを付けるのにしめきりが空なら、きょう以降の最初の該当日を入れる
 * （DB も同じことをする。画面に出る値と保存される値を合わせるため、こちらでも入れておく）。
 */
export function dueForSave(due: string, recurrence: Recurrence | null, today: string): string | null {
  if (due) return due;
  if (!recurrence) return null;
  return firstDueDate(recurrence.kind, recurrence.day, today);
}
