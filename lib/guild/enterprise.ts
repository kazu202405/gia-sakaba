// エンタープライズプラン（管理者が事業を手伝う・要相談）の相談の話題と、届いた相談の読み取り（0115）。
// 話題のキーはDBの consult_requests_topics_check と同じ。enterprise.test.ts で見張る。
// 説明の | は折り返してよい位置（components/guild/phrase.tsx）。

export const CONSULT_TOPICS = [
  { key: "dx", title: "業務の見える化・DX／AI活用", desc: "どこに時間が|かかっているかを|洗い出し、|AIや仕組みで|減らします。" },
  { key: "sales", title: "営業の仕組みづくり", desc: "紹介や商談の流れを|整えて、|人に頼りきらずに|回る形にします。" },
  { key: "dev", title: "システム・アプリ開発", desc: "仕事に合わせた|システムやアプリを、|設計から作ります。" },
  { key: "intro", title: "人の紹介の相談", desc: "会うべき相手を、|管理者が一緒に探して|おつなぎします。" },
  { key: "other", title: "そのほか", desc: "どこから手を付けるか|決まっていなくても|大丈夫です。" },
] as const;

export type ConsultTopic = (typeof CONSULT_TOPICS)[number]["key"];
export type ConsultStatus = "new" | "contacted" | "closed";
export type ConsultRequest = {
  id: string;
  user_id: string;
  display_name: string;
  topics: ConsultTopic[];
  message: string;
  status: ConsultStatus;
  created_at: string;
};

export const CONSULT_MESSAGE_MAX = 1000;
export const CONSULT_STATUS_LABEL: Record<ConsultStatus, string> = { new: "未対応", contacted: "連絡済み", closed: "おわり" };

const topicKeys = new Set<string>(CONSULT_TOPICS.map((topic) => topic.key));
export const consultTopicTitle = (key: ConsultTopic) => CONSULT_TOPICS.find((topic) => topic.key === key)?.title ?? key;

/** 送る前の確かめ。DBと同じ条件 */
export function consultError(topics: string[], message: string): string | null {
  if (topics.length === 0) return "相談したいことを1つ以上えらんでください。";
  if (topics.some((topic) => !topicKeys.has(topic))) return "相談したいことをえらび直してください。";
  const text = message.trim();
  if (!text) return "いまの状況や困っていることを、ひとこと書いてください。";
  if (text.length > CONSULT_MESSAGE_MAX) return `${CONSULT_MESSAGE_MAX}字までにしてください。`;
  return null;
}

/** 管理者向け一覧の返り値を読む。形のおかしいものは捨てる */
export function parseConsultRequests(data: unknown): ConsultRequest[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw): ConsultRequest[] => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.user_id !== "string" || typeof r.message !== "string" || typeof r.created_at !== "string") return [];
    if (r.status !== "new" && r.status !== "contacted" && r.status !== "closed") return [];
    const topics = Array.isArray(r.topics) ? r.topics.filter((t): t is ConsultTopic => typeof t === "string" && topicKeys.has(t)) : [];
    return [{ id: r.id, user_id: r.user_id, display_name: typeof r.display_name === "string" ? r.display_name : "メンバー", topics, message: r.message, status: r.status, created_at: r.created_at }];
  });
}
