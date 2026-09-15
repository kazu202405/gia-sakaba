// 画面に出す言葉と、状態ごとの見せ方。
// 状態の文言はここ1か所にまとめる（画面ごとに書くと食い違う）。

import type {
  IntroOutcome,
  IntroPurpose,
  IntroStatus,
  JobIconKey,
  QuestCategory,
  QuestStatus,
  VisibleGroup,
} from "./types";

/** 職業アイコンの選択肢に出す名前 */
export const jobIconLabel: Record<JobIconKey, string> = {
  owner: "経営",
  web: "IT・Web",
  marketing: "集客・広告",
  design: "デザイン",
  tax: "お金・税務",
  legal: "法務",
  build: "建設・職人",
  realestate: "不動産",
  food: "飲食",
  health: "健康・医療",
  teach: "教える",
};

export const purposeLabel: Record<IntroPurpose, string> = {
  work: "仕事を頼みたい",
  consult: "相談したい",
  collab: "協業したい",
  info: "情報交換したい",
};

export const questCategoryLabel: Record<QuestCategory, string> = {
  work: "仕事の依頼",
  consult: "相談",
  collab: "協業",
  info: "情報交換",
};

/** クエストを出す画面で、しゅるいの下に出す説明 */
export const questCategoryHint: Record<QuestCategory, string> = {
  work: "やってほしい仕事がある",
  consult: "話を聞いてほしい・知恵を借りたい",
  collab: "いっしょに何かを始めたい",
  info: "知っている人に教えてほしい",
};

export const questStatusLabel:Record<QuestStatus, string> = {
  open: "募集中",
  in_progress: "進行中",
  completed: "クリア",
  withdrawn: "取り下げ",
};

export const outcomeLabel: Record<IntroOutcome, string> = {
  met: "会えた",
  working: "仕事になった",
  no_fit: "合わなかった",
};

export const groupLabel: Record<VisibleGroup, { title: string; note: string }> = {
  work: { title: "しごと", note: "仕事内容・できること・キーワード" },
  values: { title: "おもい", note: "強み・大事にしていること・これから" },
  connect: { title: "つながり", note: "探しているもの・出会いたい人" },
};

/**
 * master＝ギルドマスター画面での呼び方。requester＝依頼した本人に見せる呼び方。
 * 期限切れ・相手の辞退は、依頼者には角が立たない言い方にする（design §3.4 の非対称）。
 */
export const introStatusLabel: Record<IntroStatus, { master: string; requester: string }> = {
  requested: { master: "届いた", requester: "送りました" },
  reviewing: { master: "確認中", requester: "ギルドマスターが確認中" },
  proposed: { master: "相手に打診中", requester: "相手に打診中" },
  accepted: { master: "承諾（連絡先公開）", requester: "承諾されました" },
  introduced: { master: "紹介済み", requester: "紹介済み" },
  declined_by_master: { master: "見送り", requester: "今回は見送りになりました" },
  declined_by_target: { master: "相手が辞退", requester: "今回はご縁がありませんでした" },
  expired: { master: "期限切れ（依頼者には「取り下げ」）", requester: "取り下げました" },
  redirected: { master: "別の人を提案", requester: "別の方をご提案しました" },
  cancelled: { master: "依頼者が取り下げ", requester: "取り下げました" },
};

/** 依頼者に見せる進み具合の段。ここに無い状態は「終了」 */
export const introSteps: IntroStatus[] = ["requested", "reviewing", "proposed", "accepted", "introduced"];

export const closedStatuses: IntroStatus[] = [
  "declined_by_master",
  "declined_by_target",
  "expired",
  "redirected",
  "cancelled",
];

/** "2026-09-12" → "9月12日"。サーバーとブラウザで同じ結果になるよう Date を使わない */
export function formatDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${Number(m)}月${Number(d)}日`;
}
