// AI Clone 夜ブリーフィングの「占術セクション」。
//
// 目的（2026-07-28 追加 / 2026-07-29 改稿）:
//   配信対象日（＝明日）について、次の2つを分けて出す。
//     ①【一般】その日そのものが、誰にとってどんな日か
//        → 明日の年柱・月柱・日柱の干支と、6要素の五行バランスだけで決まる。生年月日は使わない。
//     ②【個別】その日が、この人にとってどんな日か
//        → 本人の日干（陰占の主役）× 明日の日干の通変で「方向」を、
//          本人の日干 × 明日の地支の十二運で「強度」を出し、
//          陽占の中心星でその人の型に翻訳する。天中殺日ならさらに注記。
//
// AI は使わない（2026-07-29 方針転換）:
//   一時期この本文を gpt-4o-mini に書かせていたが、毎晩届くものは書きぶりが
//   安定していることのほうが価値が高いと判断し、解釈を全て固定辞書
//   （divination-day-templates.ts）へ移した。OpenAI キーの有無に一切依存しない。
//
// 位置づけ:
//   夜ブリーフィングの中の1セクション。売上行動セクションと独立して動く。
//
// データ源:
//   * 本人の生年月日 = ai_clone_tenants.owner_birthday / owner_birth_hour（migration 0029）。
//     未設定のテナントは占術セクションを丸ごと出さない（空配列を返す）。
//   * 占術計算 = lib/divination（/admin/divination と同じエンジンを共有）。新規DB列なし。

import {
  calculateInyo,
  getJuniUnsei,
  type InyoResult,
} from "@/lib/divination/sanmei/inyo";
import { calculateYojo, type YojoResult } from "@/lib/divination/sanmei/yojo";
import { getPillars, type Pillars } from "@/lib/divination/kanshi/calc";
import {
  calculateFortuneBalance,
  type FortuneBalance,
} from "@/lib/divination/fortune/balance";
import {
  calculatePersonalFortune,
  type PersonalFortune,
} from "@/lib/divination/fortune/personal";
import {
  calculatePillarFortune,
  type PillarFortune,
} from "@/lib/divination/fortune/timeframe";
import {
  JUDAI_DESCRIPTIONS,
  type JuniUnsei,
} from "@/lib/divination/sanmei/descriptions";
import {
  PERSONAL_DAY_ADVICE,
  JUNI_UNSEI_DAY_TONE,
  MONTH_BACKGROUND,
  TENCHUU_DAY_NOTE,
} from "./divination-day-templates";

export interface DivinationOwner {
  /** ai_clone_tenants.owner_birthday（'YYYY-MM-DD'）。null なら占術は出さない。 */
  birthday: string | null;
  /** ai_clone_tenants.owner_birth_hour（0-23）。任意。 */
  birthHour?: number | null;
}

/** 明日という日の素材一式。 */
interface DayContext {
  pillars: Pillars;
  balance: FortuneBalance;
  dayFortune: PillarFortune;   // 日柱単独の汎用トーン（一般）
  personal: PersonalFortune;   // 本人 vs 明日3柱（個別・方向）
  juniUnsei: JuniUnsei;        // 本人の日干 × 明日の地支（個別・強度）
  isTenchuuDay: boolean;       // 明日の日支が本人の天中殺に入るか
}

// ── エントリ：占術セクションの Slack blocks を返す ────────────────

/**
 * 「明日は一般的にどんな日か」＋「あなたにとってどんな日か」の Slack blocks を生成する。
 * 生年月日が無ければ空配列（セクションを出さない）。同期処理だが、
 * 呼び出し側の形（await）を変えないため Promise を返す。
 * @param owner   テナントのオーナー占術プロフィール
 * @param date    配信対象日 'YYYY-MM-DD'（＝明日。runMorningBriefing が算出済み）
 */
export async function buildDivinationBlocks(
  owner: DivinationOwner,
  date: string,
): Promise<any[]> {
  const birth = parseBirthday(owner.birthday);
  if (!birth) return [];

  const target = parseYmd(date);
  if (!target) return [];

  // 本人の生涯変わらない宿命（陰占＝命式、陽占＝人体星図）
  const inyo = calculateInyo({
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: typeof owner.birthHour === "number" ? owner.birthHour : undefined,
  });
  const yojo = calculateYojo(birth.year, birth.month, birth.day);

  const ctx = buildDayContext(inyo, target);
  return buildBlocks(inyo, yojo, ctx, date);
}

// ── 明日という日の素材を組む ────────────────────────────────

function buildDayContext(
  inyo: InyoResult,
  target: { year: number; month: number; day: number },
): DayContext {
  // 明日の3柱。年柱は立春、月柱は節入り日で切り替わる（暦上の月日とはズレる）。
  const pillars = getPillars(target.year, target.month, target.day);

  return {
    pillars,
    // 一般：年干・年支・月干・月支・日干・日支の6要素で五行の偏りを見る（生年月日を使わない）
    balance: calculateFortuneBalance(pillars),
    dayFortune: calculatePillarFortune("今日", pillars.day.kan, pillars.day.shi),
    // 個別・方向：本人の日干 vs 明日の3柱（主軸は日干同士の通変）
    personal: calculatePersonalFortune(inyo.dayKan, pillars),
    // 個別・強度：本人の日干から見た明日の地支の十二運。日ごとに動く層。
    juniUnsei: getJuniUnsei(inyo.dayKan, pillars.day.shi),
    // 天中殺日：明日の日支が本人の空亡2支に入るか。動くより整える日として扱う。
    isTenchuuDay: (inyo.tenchuuSatsu as string[]).includes(pillars.day.shi),
  };
}

// ── 本文の組み立て（全て固定テンプレ／AI不使用）──────────────

/** ①明日という日そのもの。生年月日に依らない。 */
function composeGeneral(ctx: DayContext): string {
  const { balance, dayFortune } = ctx;
  const lack =
    balance.absent.length > 0
      ? `${balance.absent.join("・")}の気が薄いので、その方向の動きは無理に押さず翌日に回して構いません。`
      : "五行は比較的そろっており、極端に不足する方向はありません。";

  return (
    `${dayFortune.headline}。${dayFortune.body} ` +
    `年月日を合わせた場全体では${balance.strongest.join("・")}の気が強く出ます。${lack}`
  );
}

/** ②その日が本人にとってどうか。通変×中心星＋十二運＋天中殺＋今月の背景。 */
function composePersonal(yojo: YojoResult, ctx: DayContext): string {
  const center = yojo.jintai.center;
  const { personal, juniUnsei, isTenchuuDay } = ctx;

  const lines = [
    // 芯：エンジンのテンプレ（その日の性質）＋ 型に翻訳した具体行動（50パターン辞書）
    `${personal.body}`,
    `${center}のあなたは、${PERSONAL_DAY_ADVICE[personal.vsDay][center]}`,
    // 強度：十二運。同じ通変の日でも体感が変わる層。
    `エネルギーの位置は「${juniUnsei}」。${JUNI_UNSEI_DAY_TONE[juniUnsei]}`,
  ];
  if (isTenchuuDay) lines.push(TENCHUU_DAY_NOTE);
  // 背景：日運だけ見て前日と逆のことを言われたように感じないよう、月の基調を最後に置く。
  lines.push(`（背景）${MONTH_BACKGROUND[personal.vsMonth]}`);

  return lines.join("\n");
}

// ── Slack blocks 整形 ──────────────────────────────────────────

function buildBlocks(
  inyo: InyoResult,
  yojo: YojoResult,
  ctx: DayContext,
  date: string,
): any[] {
  const { pillars, balance, personal } = ctx;
  const center = yojo.jintai.center;

  // ①一般：明日の3柱と五行の偏り。生年月日に依らない事実だけを並べる。
  // 「日の主気」（日柱そのものの五行＝その日の性格）と「場の偏り」（年月日を合算した偏り）は
  // 別物なので、混同されないよう並べて書く。
  const generalFacts =
    `・年柱 ${kanshiLabel(pillars.year.kan, pillars.year.shi)}／` +
    `月柱 ${kanshiLabel(pillars.month.kan, pillars.month.shi)}／` +
    `日柱 ${kanshiLabel(pillars.day.kan, pillars.day.shi)}\n` +
    `・日の主気 *${ctx.dayFortune.dominant}*　` +
    `場の偏り：最多 ${balance.strongest.join("・")}（${balance.strongestCount}／6）` +
    `／欠け ${balance.absent.join("・") || "なし"}`;

  // ②個別：本人の命式と、明日との噛み合い方。
  // 3大従星エネルギーは生涯不変で日ごとに動かないため、日次表示からは外している
  // （毎晩同じ数字を出しても情報量がない。必要なら /admin/divination で見る）。
  const dayPillar = inyo.pillars.find((p) => p.label === "日柱");
  const meishi = dayPillar ? `${dayPillar.kan}${dayPillar.shi}` : `${inyo.dayKan}`;
  const personalFacts =
    `・あなたの日柱 ${meishi}（${inyo.dayGogyo}・${inyo.dayInyo}）　` +
    `中心星 *${center}*（${JUDAI_DESCRIPTIONS[center].subtitle}）\n` +
    `・明日の日干 ${pillars.day.kan}（${ctx.dayFortune.kanGogyo}）との関係：*${personal.vsDay}*` +
    `　十二運：*${ctx.juniUnsei}*` +
    (ctx.isTenchuuDay
      ? `\n・⚠️ 明日はあなたの天中殺日（${inyo.tenchuuSatsu.join("・")}）`
      : "");

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🔮 明日 ${dateLabel(date)} はどんな日か`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "上＝明日という日そのもの（誰にとっても共通）／下＝あなたの宿命と掛け合わせた場合。",
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*■ 明日という日（一般）*\n${generalFacts}\n\n${toTomorrow(composeGeneral(ctx))}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*■ あなたにとっての明日*\n${personalFacts}\n\n${toTomorrow(composePersonal(yojo, ctx))}`,
      },
    },
  ];
}

// ── 小物 ────────────────────────────────────────────────────

function kanshiLabel(kan: string, shi: string): string {
  return `${kan}${shi}`;
}

// 占術エンジンのテンプレも解釈辞書も「今日」表記で書かれている
// （TimeframeLabel が今年/今月/今日 の3値しかない、辞書は当日配信にも流用可能にしてある）。
// 夜配信は翌日分なので、表示直前にここで「明日」へ言い換える。
// エンジン側に "明日" を足すと /admin/divination の型と表示にも波及するため、
// 影響範囲をこのモジュール内に閉じている。「今月」は月の話なのでそのまま残る。
function toTomorrow(s: string): string {
  return s.split("今日").join("明日");
}

function dateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

// 'YYYY-MM-DD' を年月日に分解。不正なら null。
function parseYmd(
  s: string,
): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

// owner_birthday は Supabase から 'YYYY-MM-DD' 文字列で来る想定。ISO 日時が来ても頭を拾う。
function parseBirthday(
  raw: string | null,
): { year: number; month: number; day: number } | null {
  if (!raw) return null;
  return parseYmd(raw.slice(0, 10));
}
