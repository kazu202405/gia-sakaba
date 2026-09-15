// 紹介コーチ chat の初回挨拶文。
// クライアント側で初期 assistant メッセージとして state に注入する。
// API には送らない（毎回 system prompt で人格を作るので、greeting を再送する必要なし）。

export const COACH_GREETING = (name: string | null): string => {
  const callName = name ? `${name}さん` : "";
  return `こんにちは${callName ? "、" + callName : ""}。紹介コーチです。

紹介を増やしたい / 紹介してもらった後の進め方 / 紹介を頼むタイミング、どんなテーマでも一緒に考えます。

マイページで「紹介設計」を書いてくれていれば、その内容に合わせて答えます。今日はどんな悩みですか？`;
};
