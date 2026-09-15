// 紹介依頼コピペボタン用のテンプレート文面ビルダー。
// プロフィール詳細から「主催者経由で紹介してほしい」相手の情報を渡し、
// LINE 送信向けのメッセージ雛形を返す。

export interface ReferralTemplateInput {
  /** 紹介してほしい人の名前 */
  targetName: string;
  /** 肩書き or 職種（roleTitle / jobTitle）。無ければ undefined */
  targetTitle?: string;
}

/**
 * 紹介依頼の本文テンプレートを組み立てる。
 * - targetTitle が指定されていれば「（〜）」で名前の後ろに添える
 * - 「紹介をお願いしたい理由」は利用者がモーダル内で書き換える前提のプレースホルダ
 */
export function buildReferralRequestText({
  targetName,
  targetTitle,
}: ReferralTemplateInput): string {
  const titleSuffix = targetTitle ? `（${targetTitle}）` : "";
  return [
    `GIAのアプリで ${targetName}さん${titleSuffix}のプロフィールを拝見しました。`,
    ``,
    `【紹介をお願いしたい理由】`,
    `（ここに自由にご記入ください）`,
    ``,
    `ご都合つきましたら、お繋ぎいただけますと嬉しいです。`,
    `よろしくお願いいたします。`,
    ``,
    `---`,
    `紹介希望: ${targetName}さん${titleSuffix}`,
  ].join("\n");
}

/**
 * 主催者の LINE 公式アカウント URL。
 * 既存パターン（lib/sitemap.ts 等の NEXT_PUBLIC_SITE_URL）に揃え、env 優先＋実値フォールバック。
 * 散在する他のハードコード（header / footer / hero 等14箇所）は別タスクで一括 env 化予定。
 */
export const HOST_LINE_URL =
  process.env.NEXT_PUBLIC_HOST_LINE_URL || "https://page.line.me/131liqrt";
