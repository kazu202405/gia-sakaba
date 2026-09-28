// ご意見・不具合の報告（0117）。会員が送り、届くのは管理者画面だけ。
// 種類のキーはDBの feedback_reports_kind_check と同じ。feedback.test.ts で見張る。

export const FEEDBACK_KINDS = [
  { key: "bug", title: "うまく動かない・おかしい", placeholder: "例：タスクの「追加」を押しても一覧に出てこない。iPhoneのSafariで、プロジェクトの画面から。" },
  { key: "idea", title: "こうしてほしい", placeholder: "例：タスクに担当者を決められるようにしてほしい。" },
  { key: "other", title: "そのほか", placeholder: "気づいたこと、わかりにくかったことなど、なんでも。" },
] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]["key"];
export type FeedbackStatus = "new" | "done";
export type FeedbackReport = {
  id: string;
  user_id: string;
  display_name: string;
  kind: FeedbackKind;
  message: string;
  page_path: string | null;
  user_agent: string | null;
  status: FeedbackStatus;
  created_at: string;
};

export const FEEDBACK_MESSAGE_MAX = 2000;
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = { new: "未対応", done: "対応ずみ" };

const kindKeys = new Set<string>(FEEDBACK_KINDS.map((kind) => kind.key));
export const feedbackKindTitle = (key: FeedbackKind) => FEEDBACK_KINDS.find((kind) => kind.key === key)?.title ?? key;

/** 送る前の確かめ。DBと同じ条件 */
export function feedbackError(kind: string | null, message: string): string | null {
  if (!kind || !kindKeys.has(kind)) return "どんな内容か、1つえらんでください。";
  const text = message.trim();
  if (!text) return "内容を書いてください。";
  if (text.length > FEEDBACK_MESSAGE_MAX) return `${FEEDBACK_MESSAGE_MAX}字までにしてください。`;
  return null;
}

/** 管理者向け一覧の返り値を読む。形のおかしいものは捨てる */
export function parseFeedbackReports(data: unknown): FeedbackReport[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw): FeedbackReport[] => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.user_id !== "string" || typeof r.message !== "string" || typeof r.created_at !== "string") return [];
    if (typeof r.kind !== "string" || !kindKeys.has(r.kind)) return [];
    if (r.status !== "new" && r.status !== "done") return [];
    return [{
      id: r.id,
      user_id: r.user_id,
      display_name: typeof r.display_name === "string" ? r.display_name : "メンバー",
      kind: r.kind as FeedbackKind,
      message: r.message,
      page_path: typeof r.page_path === "string" ? r.page_path : null,
      user_agent: typeof r.user_agent === "string" ? r.user_agent : null,
      status: r.status,
      created_at: r.created_at,
    }];
  });
}

/** 端末のざっくりした名前（管理者が「どの端末で起きたか」を見るため）。わからなければ null */
export function deviceLabel(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const os = /iPhone|iPad/.test(userAgent) ? "iPhone/iPad" : /Android/.test(userAgent) ? "Android" : /Mac OS X/.test(userAgent) ? "Mac" : /Windows/.test(userAgent) ? "Windows" : null;
  const browser = /Line\//.test(userAgent) ? "LINE" : /Edg\//.test(userAgent) ? "Edge" : /CriOS|Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : null;
  if (!os && !browser) return null;
  return [os, browser].filter(Boolean).join("・");
}
