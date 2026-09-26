// 集まりの日程調整（調整さん方式）。DBは supabase/migrations/0103_sakaba_gathering_schedule.sql。
// 日時は日本時間で見せ、日本時間として保存する（入力欄の「2026-10-03T19:00」を +09:00 として送る）。

export type ScheduleAnswer = "yes" | "maybe" | "no";

export type ScheduleOption = {
  id: string;
  starts_at: string;
  yes: number;
  maybe: number;
  no: number;
};

export type ScheduleRespondent = {
  is_me: boolean;
  is_guest: boolean;
  /** 主催者以外が見るとき、ほかのゲストは「ゲスト」になる */
  name: string;
  comment: string;
  answers: Record<string, ScheduleAnswer>;
};

export type GatheringSchedule = {
  decided_option_id: string | null;
  options: ScheduleOption[];
  /** ゲストが見るときは空（人数の集計だけを見せる） */
  respondents: ScheduleRespondent[];
  my_comment: string | null;
  my_answers: Record<string, ScheduleAnswer>;
  /** 会員の画面だけ */
  is_host?: boolean;
  /** ゲストの画面だけ：ゲストの登録名 */
  my_name?: string | null;
};

export const ANSWER_MARK: Record<ScheduleAnswer, string> = { yes: "○", maybe: "△", no: "×" };
export const ANSWER_LABEL: Record<ScheduleAnswer, string> = { yes: "行ける", maybe: "たぶん", no: "行けない" };
export const SCHEDULE_OPTION_LIMIT = 10;
export const SCHEDULE_COMMENT_LIMIT = 120;

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function jstParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    w: WEEKDAYS[d.getUTCDay()],
    hh: String(d.getUTCHours()).padStart(2, "0"),
    mm: String(d.getUTCMinutes()).padStart(2, "0"),
  };
}

/** 表の見出し用の短い形「10/3(金) 19:00」 */
export function formatScheduleShort(iso: string): string {
  const p = jstParts(iso);
  return `${p.m}/${p.day}(${p.w}) ${p.hh}:${p.mm}`;
}

/** 文章用「10月3日（金）19:00」 */
export function formatScheduleLong(iso: string): string {
  const p = jstParts(iso);
  return `${p.m}月${p.day}日（${p.w}）${p.hh}:${p.mm}`;
}

/** 保存された日時 → 入力欄（datetime-local）の値「2026-10-03T19:00」（日本時間） */
export function toJstInputValue(iso: string): string {
  const p = jstParts(iso);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.day).padStart(2, "0")}T${p.hh}:${p.mm}`;
}

/** 入力欄の値 → 日本時間として送る日時。形がおかしければ null */
export function fromJstInputValue(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const iso = `${value}:00+09:00`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}
