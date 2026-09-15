// 月律分野（節気司令分日法）— 算命学 二十八元表 準拠。
// 月支・年支・日支の蔵干が、節入りからの経過日数によって
// 「初元（余気）→ 中元（中気）→ 本元（本気）」と切り替わる。
//
// 高尾義政系 算命学「二十八元表」（五島さん監修 PDF・正本）:
//
//   子: 本元のみ        → 癸（節明け）
//   丑: 9日 / 3日 / 本元 → 癸 / 辛 / 己
//   寅: 7日 / 7日 / 本元 → 戊 / 丙 / 甲
//   卯: 本元のみ        → 乙（節明け）
//   辰: 9日 / 3日 / 本元 → 乙 / 癸 / 戊
//   巳: 5日 / 9日 / 本元 → 戊 / 庚 / 丙
//   午: 中元19日 / 本元  → 己 / 丁（初元なし）
//   未: 9日 / 3日 / 本元 → 丁 / 乙 / 己
//   申: 10日 / 3日 / 本元 → 戊 / 壬 / 庚
//   酉: 本元のみ        → 辛（節明け）
//   戌: 9日 / 3日 / 本元 → 辛 / 丁 / 戊
//   亥: 中元12日 / 本元  → 甲 / 壬（初元なし）
//
// 日数の意味：
//   節入り当日（daysSinceSetsuiri=0）は便宜上「最初の段階（初元/中元）」に含めて扱う。
//   PDF の「N日間」は節入りの翌日から N 日後（daysSinceSetsuiri 1〜N）の範囲を指す。
//   実装上は untilDay = N（つまり daysSinceSetsuiri 0〜N が最初の段階に該当）と設定する。
//
// 検証済み生年月日（4 ケースすべて PDF 計算結果と一致）:
//   1983-04-14（清明+9日、月支辰）  → 中心 初元乙 → 調舒星
//   1969-12-09（大雪+2日、月支子）  → 中心 本元癸 → 司禄星（戊×癸）
//   1986-08-10（立秋+2日、月支申）  → 中心 初元戊 → 鳳閣星（丙×戊）
//   1984-03-29（啓蟄+23日、月支卯） → 中心 本元乙 → 調舒星（壬×乙）
//
// 表記上「初元/中元/本元」と「余気/中気/本気」は同義。コード内では従来通り余気/中気/本気を使う。

import type { Junishi, Jikkan } from "./constants";

interface BunyaPhase {
  /** この区間の終了日（節入りからの日数、含む）。最後の段階は Infinity。 */
  untilDay: number;
  /** この区間に司令する蔵干。 */
  kan: Jikkan;
  /** 表記用（余気=初元・中気=中元・本気=本元）。 */
  role: "余気" | "中気" | "本気";
}

export const ZOUKAN_BUNYA: Record<Junishi, BunyaPhase[]> = {
  子: [
    { untilDay: Infinity, kan: "癸", role: "本気" },
  ],
  丑: [
    { untilDay: 9,        kan: "癸", role: "余気" },
    { untilDay: 12,       kan: "辛", role: "中気" },
    { untilDay: Infinity, kan: "己", role: "本気" },
  ],
  寅: [
    { untilDay: 7,        kan: "戊", role: "余気" },
    { untilDay: 14,       kan: "丙", role: "中気" },
    { untilDay: Infinity, kan: "甲", role: "本気" },
  ],
  卯: [
    { untilDay: Infinity, kan: "乙", role: "本気" },
  ],
  辰: [
    { untilDay: 9,        kan: "乙", role: "余気" },
    { untilDay: 12,       kan: "癸", role: "中気" },
    { untilDay: Infinity, kan: "戊", role: "本気" },
  ],
  巳: [
    { untilDay: 5,        kan: "戊", role: "余気" },
    { untilDay: 14,       kan: "庚", role: "中気" },
    { untilDay: Infinity, kan: "丙", role: "本気" },
  ],
  午: [
    { untilDay: 19,       kan: "己", role: "中気" },
    { untilDay: Infinity, kan: "丁", role: "本気" },
  ],
  未: [
    { untilDay: 9,        kan: "丁", role: "余気" },
    { untilDay: 12,       kan: "乙", role: "中気" },
    { untilDay: Infinity, kan: "己", role: "本気" },
  ],
  申: [
    { untilDay: 10,       kan: "戊", role: "余気" },
    { untilDay: 13,       kan: "壬", role: "中気" },
    { untilDay: Infinity, kan: "庚", role: "本気" },
  ],
  酉: [
    { untilDay: Infinity, kan: "辛", role: "本気" },
  ],
  戌: [
    { untilDay: 9,        kan: "辛", role: "余気" },
    { untilDay: 12,       kan: "丁", role: "中気" },
    { untilDay: Infinity, kan: "戊", role: "本気" },
  ],
  亥: [
    { untilDay: 12,       kan: "甲", role: "中気" },
    { untilDay: Infinity, kan: "壬", role: "本気" },
  ],
};

/** 月支と節入りからの経過日数（0始まり）で、月律分野の蔵干を返す。 */
export function getZoukanWithBunya(shi: Junishi, daysSinceSetsuiri: number): Jikkan {
  const phases = ZOUKAN_BUNYA[shi];
  for (const phase of phases) {
    if (daysSinceSetsuiri <= phase.untilDay) return phase.kan;
  }
  return phases[phases.length - 1].kan;
}

/** 月支と節入りからの経過日数で、月律分野のロール（余気・中気・本気）も含めて返す。 */
export function getZoukanBunyaPhase(
  shi: Junishi, daysSinceSetsuiri: number,
): { kan: Jikkan; role: "余気" | "中気" | "本気" } {
  const phases = ZOUKAN_BUNYA[shi];
  for (const phase of phases) {
    if (daysSinceSetsuiri <= phase.untilDay) {
      return { kan: phase.kan, role: phase.role };
    }
  }
  const last = phases[phases.length - 1];
  return { kan: last.kan, role: last.role };
}
