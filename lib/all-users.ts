// 紹介者検索（仮登録 /join の autocomplete）専用の軽量データ。
//
// なぜ Member 型を使わないか:
// - Member 型は本登録メンバー前提のフルスキーマ（storyOrigin / wantToConnectWith 等が required）
// - 仮登録ユーザーはまだほぼ空の状態で記録しておきたい
// - 「紹介者候補リスト」は名前と tier だけあれば成立するので、軽量な独自型に切り出す
//
// Phase 2 で Supabase に置き換える際は users テーブルから tier 込みで引く。

export type UserTier = "registered" | "tentative";

export interface UserCandidate {
  /** users テーブルの id（mock 段階では Member.id と整合させておく） */
  id: string;
  /** 表示名（漢字・本名想定） */
  name: string;
  /** ふりがな（autocomplete の絞り込み対象） */
  nameFurigana?: string;
  /** 候補行に補助表示する肩書き等。tentative はほぼ空で良い */
  affiliation?: string;
  /** 本登録 / 仮登録 の区別。バッジ表示と並び順制御に使う */
  tier: UserTier;
}

/**
 * 全ユーザー候補（本登録 + 仮登録）。
 * 並び順は tier に依存させない（autocomplete 側で必要なら sort する）。
 *
 * registered 6 名は lib/mock-data.ts の members[] と整合（id / name / nameFurigana を流用）。
 * tentative 3 名は架空。仮登録段階なので肩書きは空、ふりがなのみ持つ。
 */
export const allUsers: UserCandidate[] = [
  // ── 本登録メンバー（mock-data.ts と整合） ────────────────────────────
  {
    id: "1",
    name: "田中 一郎",
    nameFurigana: "たなか いちろう",
    affiliation: "経営コンサルタント",
    tier: "registered",
  },
  {
    id: "2",
    name: "佐藤 裕樹",
    nameFurigana: "さとう ゆうき",
    affiliation: "IT起業家",
    tier: "registered",
  },
  {
    id: "3",
    name: "山本 恵美",
    nameFurigana: "やまもと えみ",
    affiliation: "オーナーシェフ",
    tier: "registered",
  },
  {
    id: "4",
    name: "鈴木 健二",
    nameFurigana: "すずき けんじ",
    affiliation: "不動産デベロッパー",
    tier: "registered",
  },
  {
    id: "5",
    name: "中村 明子",
    nameFurigana: "なかむら あきこ",
    affiliation: "予防医療クリニック院長",
    tier: "registered",
  },
  {
    id: "6",
    name: "渡辺 剛",
    nameFurigana: "わたなべ たけし",
    affiliation: "ファイナンシャルアドバイザー",
    tier: "registered",
  },

  // ── 仮登録ユーザー（架空・名前とふりがなのみ） ─────────────────────
  {
    id: "t-1",
    name: "高橋 美咲",
    nameFurigana: "たかはし みさき",
    tier: "tentative",
  },
  {
    id: "t-2",
    name: "小林 健",
    nameFurigana: "こばやし けん",
    tier: "tentative",
  },
  {
    id: "t-3",
    name: "森田 さやか",
    nameFurigana: "もりた さやか",
    tier: "tentative",
  },
];

/**
 * 入力文字列で候補を絞り込む。
 * - 大文字小文字を区別しない部分一致
 * - name / nameFurigana の両方を対象
 * - 空文字（または空白のみ）の場合は全件返す
 */
export function filterUserCandidates(
  query: string,
  source: UserCandidate[] = allUsers
): UserCandidate[] {
  const q = query.trim().toLowerCase();
  if (!q) return source;
  return source.filter((u) => {
    const inName = u.name.toLowerCase().includes(q);
    const inFurigana = (u.nameFurigana ?? "").toLowerCase().includes(q);
    return inName || inFurigana;
  });
}
