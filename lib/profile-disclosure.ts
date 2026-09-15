// 相互開示（ギブ＆シー）のグループ定義と判定。
//
// プロフィール詳細ページ（/members/app/profile/[id]）で
// 「自分が書いたグループは、相手の同じグループも読める」を実現する。
//
// 設計意図:
//   - 無料会員でも人脈を体験できるようにしつつ、フリーライドを防ぐ。
//   - 「見たいなら自分も出す」という対称ルールが、同時にプロフィール記入の動機になる。
//   - 基本情報（写真/名前/肩書/ジャンル/拠点/サービス）は常時公開＝ここでは扱わない。
//     ここで制御するのは story / personality / contact の3グループのみ。
//   - 有料会員は相互開示の対象外で全グループ解禁＝書かなくても全員を見て回れる（課金特典）。
//     判定は tier==='paid'（旧本会員/サロン）または plan==='terakoya'（キャンパス月額11,000円）。
//     ※ テラこや会員は webhook で plan='terakoya' を付けるだけで tier は 'paid' にしない
//        （紹介リンク等の誤作動防止）ため、plan も見ないと課金特典が効かない。

export const DISCLOSURE_GROUPS = ["story", "personality", "contact"] as const;
export type DisclosureGroup = (typeof DISCLOSURE_GROUPS)[number];

// 各グループを「自分が開示する」ために埋める必要のある applicants カラム。
const UNLOCK_REQUIRED: Record<DisclosureGroup, readonly string[]> = {
  story: ["story_origin", "story_turning_point", "story_now", "story_future"],
  personality: [
    "favorites",
    "current_hobby",
    "school_days_self",
    "personal_values",
  ],
  contact: ["contact_line", "contact_instagram", "contact_website"],
};

// グループごとの開示条件。
//   全グループ「1つでも」入力すれば解禁（＝自分が入力したところだけ相手のも見える）。
//   合格ライン（プロフィール全項目埋め）を廃止したのに合わせ、記入コストを下げつつ
//   give&see の対称性は保つ。1行でも書けば同グループが解禁されるので動機が軽くなる。
const UNLOCK_MODE: Record<DisclosureGroup, "all" | "any"> = {
  story: "any",
  personality: "any",
  contact: "any",
};

function isFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

// viewer 自身の applicants 行から、どのグループを閲覧解禁できるかを判定する。
// viewer が null（行が取れない）の場合は全グループ未解禁。
// 有料会員（viewerTier==='paid' または viewerPlan==='terakoya'）は相互開示の対象外で全解禁。
export function computeUnlockedGroups(
  viewer: Record<string, unknown> | null | undefined,
  viewerTier: string,
  viewerPlan?: string | null,
): Record<DisclosureGroup, boolean> {
  if (viewerTier === "paid" || viewerPlan === "terakoya") {
    return { story: true, personality: true, contact: true };
  }
  const result = {} as Record<DisclosureGroup, boolean>;
  for (const group of DISCLOSURE_GROUPS) {
    const fields = UNLOCK_REQUIRED[group];
    const filled = fields.filter((f) => isFilled(viewer?.[f])).length;
    result[group] =
      UNLOCK_MODE[group] === "all" ? filled === fields.length : filled > 0;
  }
  return result;
}

// ロック時の案内文（自分のプロフィール編集への誘導に使う）。
export const DISCLOSURE_GROUP_PROMPT: Record<DisclosureGroup, string> = {
  story:
    "あなたが自分のストーリー（始めたきっかけ・転機・今・これから）を書くと、相手のストーリーも読めるようになります。",
  personality:
    "あなたが自分の「人柄」を書くと、相手の人柄も読めるようになります。",
  contact:
    "あなたが自分の連絡先を1つでも登録すると、相手の連絡先が見られるようになります。",
};
