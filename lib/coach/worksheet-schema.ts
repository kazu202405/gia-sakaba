// 紹介設計ワークシートのスキーマ定義（3シート × 22項目）。
// 出典: contexts/projects/gia/decks/seminar_referral_slides.html
//   - WS01: スライド16（見せ方の設計）
//   - WS02: スライド18（価値の設計）
//   - WS03: スライド26（仕組み化）
//
// 用途:
//   1. 入力画面 (/members/app/worksheet) のフォーム生成
//   2. 紹介コーチ chat の system prompt に埋め込む context
//   3. 将来 Supabase テーブル `referral_worksheets` の jsonb スキーマと一致させる
//
// 注意:
//   field の id（ws01_01 など）は localStorage / Supabase の永続化キーになるため、
//   後方互換のため変更不可。ラベル・ヒントは安全に編集可能。

export interface WorksheetField {
  /** 永続化キー。 ws<sheet>_<row> 固定。変更不可。 */
  id: string;
  /** 行番号（"01"〜）。UI のナンバリング表示用。 */
  num: string;
  /** 入力欄の見出し。 */
  label: string;
  /** 入力欄の下にうすく出すガイド。スライドの data-hint と同じ。 */
  hint: string;
  /** 良い記入例（「何を書けばいいか分からない」を消す。安全に編集可能）。 */
  example: string;
}

export interface Worksheet {
  /** 永続化キー兼ルーティング識別子。"ws01" 等。 */
  id: "ws01" | "ws02" | "ws03";
  /** 表示用の通し番号。 */
  number: string;
  /** タブやヘッダー表示用の短い見出し。 */
  title: string;
  /** タブ下に薄く出すサブコピー。 */
  subtitle: string;
  /** 埋めると紹介がどう変わるか（入力の動機づけ）。 */
  payoff: string;
  /** ワークシート最後に置く完成基準コメント。 */
  closingNote: string;
  fields: WorksheetField[];
}

export const WORKSHEETS: Worksheet[] = [
  {
    id: "ws01",
    number: "01",
    title: "見せ方の設計",
    subtitle: "お客様の目に最初に触れる『届き方』を整える",
    payoff:
      "ここが埋まると、相手が「あなたをどう紹介すればいいか」の言葉を持てて、紹介が口に出やすくなります。",
    closingNote: "完璧でなくて大丈夫。出てきた言葉を、まず書き留める。",
    fields: [
      {
        id: "ws01_01",
        num: "01",
        label: "話題になる要素",
        hint: "ギャップ／意外性／話したくなる要素",
        example: "元エンジニアの不動産屋／占いもできる税理士、のような“意外な組み合わせ”",
      },
      {
        id: "ws01_02",
        num: "02",
        label: "ストーリー",
        hint: "きっかけ・想い・一言で話せるストーリー",
        example: "自分が紹介で苦労したから、紹介が自然に回る仕組みを広めたい。",
      },
      {
        id: "ws01_03",
        num: "03",
        label: "イメージ",
        hint: "こんな人に合う／こんな場面で役立つ／使うとこうなる",
        example: "人脈はあるのに紹介が売上に変わらない経営者に向く。",
      },
      // 04「自分のタイプ（DISC）」は一旦外す（2026-06-09・五島さん判断）。
      // 復活する可能性があるため削除せずコメントアウトで保持（num 04 は欠番になる）。
      // データキー ws01_04 は変えていないので、コメントを外せば過去入力ごと復活する。
      // {
      //   id: "ws01_04",
      //   num: "04",
      //   label: "自分のタイプ（DISC）",
      //   hint: "自分は D／I／S／C どれに近い？（複数あれば優先順）／その特性が紹介でどう活きるか",
      //   example: "I（社交型）。初対面で打ち解けるのが強み。紹介の場づくりが得意。",
      // },
      {
        id: "ws01_05",
        num: "04",
        label: "紹介しやすい言葉",
        hint: "「〇〇って会社あってさ…」／30秒で説明すると",
        example: "「経理をまるごと任せられる事務所があってさ」と言ってもらえると話が早い。",
      },
      {
        id: "ws01_06",
        num: "05",
        label: "考えられる接点",
        hint: "今ある接点／増やしたい接点／相手の属性（業種・役職・年代など）／発信で伝えること",
        example: "経営者の勉強会／士業の交流会／既存クライアントからの紹介。",
      },
      {
        id: "ws01_07",
        num: "06",
        label: "安心して勧める工夫",
        hint: "不安ポイント／保証・安心材料／紹介後の流れ",
        example: "まず無料相談から。合わなければ断れると最初に伝える。",
      },
      {
        id: "ws01_08",
        num: "07",
        label: "まとめ（1文で）",
        hint: "紹介される時の一言 ＝",
        example: "「中小企業の経理を、丸ごと安心して任せられる事務所」",
      },
    ],
  },
  {
    id: "ws02",
    number: "02",
    title: "価値の設計",
    subtitle: "『紹介したくなる価値』を自社の言葉で言語化する",
    payoff:
      "ここが埋まると、「なぜあなたから買うのか」が明確になり、紹介された人が動く理由になります。",
    closingNote:
      "最後にこの1文が完成すれば合格：『〇〇な人に、〇〇の悩みに対し、〇〇を提供する会社』",
    fields: [
      {
        id: "ws02_01",
        num: "01",
        label: "誰の何を解決",
        hint: "お客様像／主な悩み／よくある困りごと",
        example: "忙しくて人脈・案件を覚えきれない経営者の“取りこぼし”を解決。",
      },
      {
        id: "ws02_02",
        num: "02",
        label: "本当に欲しい結果",
        hint: "欲しいもの／その先の状態／最終的に得たいもの",
        example: "売り込まなくても、紹介で仕事が回り続ける状態。",
      },
      {
        id: "ws02_03",
        num: "03",
        label: "特徴 → 利益",
        hint: "自社の特徴 → 相手にとっての良いこと",
        example: "担当が固定 → 毎回説明し直さなくても話が通じる。",
      },
      {
        id: "ws02_04",
        num: "04",
        label: "USP",
        hint: "他との違い／魅力／特に向いている相手",
        example: "価格でなく“対応の速さと相談しやすさ”で選ばれている。",
      },
      {
        id: "ws02_05",
        num: "05",
        label: "MVV",
        hint: "Mission ／ Vision ／ Value",
        example: "Mission: 地域の中小企業を支える／Value: 誠実・長期・スピード。",
      },
      {
        id: "ws02_06",
        num: "06",
        label: "不安を減らす",
        hint: "お客様の不安／先回り／保証・対応策",
        example: "初回は小さく試せる。合わなければいつでも止められる。",
      },
      {
        id: "ws02_07",
        num: "07",
        label: "あなたから買う理由",
        hint: "なぜあなた／なぜ今／紹介したくなる理由",
        example: "同業の中でも対応が早く、長く付き合えると評判だから。",
      },
    ],
  },
  {
    id: "ws03",
    number: "03",
    title: "仕組み化",
    subtitle: "行動・担当・タイミング・数字を、自社の言葉で",
    payoff:
      "ここが埋まると、紹介が“偶然”でなく“仕組み”で起き始めます。今月動かす1つが決まります。",
    closingNote:
      "全部決めなくていい。今月動かす『1つ』が書ければ、仕組みは動き始める。",
    fields: [
      {
        id: "ws03_01",
        num: "01",
        label: "必要な行動",
        hint: "紹介が起こる前に必要な行動 ①〜⑤",
        example: "①接点を増やす ②お客様の声を取る ③入口商品を案内する。",
      },
      {
        id: "ws03_02",
        num: "02",
        label: "測る行動（先行指標）",
        hint: "接点数・声取得数・配信数・入口案内数 など",
        example: "月の新規接点数／紹介依頼を出した件数。",
      },
      {
        id: "ws03_03",
        num: "03",
        label: "結果指標（KPI）",
        hint: "紹介件数・商談数・成約率・リピート率",
        example: "紹介 月5件／紹介経由の成約率 50%。",
      },
      {
        id: "ws03_04",
        num: "04",
        label: "ボトルネック",
        hint: "接点不足／話題性／入口なし／声不足／紹介後対応",
        example: "接点はあるのに「紹介してください」と言えていない（声不足）。",
      },
      {
        id: "ws03_05",
        num: "05",
        label: "今月の改善アクション",
        hint: "1つでOK。必ず実行する1個を書く",
        example: "既存顧客10人に、紹介をお願いするメッセージを送る。",
      },
    ],
  },
];

/** 全 field の id 一覧（型安全な永続化キー）。 */
export type WorksheetFieldId = string;

/** Supabase の jsonb で保持する形（フラット）。referral_worksheets.data の型。 */
export type WorksheetData = Record<WorksheetFieldId, string>;

/** 進捗率（0〜1）。空白文字のみのフィールドは未記入扱い。 */
export function calcProgress(data: WorksheetData): number {
  const total = WORKSHEETS.reduce((acc, ws) => acc + ws.fields.length, 0);
  const filled = WORKSHEETS.reduce(
    (acc, ws) =>
      acc +
      ws.fields.filter((f) => (data[f.id] ?? "").trim().length > 0).length,
    0,
  );
  return total === 0 ? 0 : filled / total;
}

/** シート単位の進捗（記入済 / 全体）。 */
export function calcSheetProgress(
  sheetId: Worksheet["id"],
  data: WorksheetData,
): { filled: number; total: number } {
  const sheet = WORKSHEETS.find((w) => w.id === sheetId);
  if (!sheet) return { filled: 0, total: 0 };
  const filled = sheet.fields.filter(
    (f) => (data[f.id] ?? "").trim().length > 0,
  ).length;
  return { filled, total: sheet.fields.length };
}
