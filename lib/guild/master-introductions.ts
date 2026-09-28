export type MasterIntroductionStatus = "waiting" | "connected" | "declined" | "expired" | "cancelled";
export type MasterIntroductionResponseStatus = "pending" | "accepted" | "declined";
export type MasterIntroductionOutcome = "met" | "working" | "no_fit";
export type MasterIntroductionContactKind = "email" | "line" | "website" | "via_admin";

export type MasterIntroductionParticipant = {
  id: string;
  side: "a" | "b";
  member_user_id: string | null;
  name: string;
  company: string;
  response_status: MasterIntroductionResponseStatus;
  viewed_at: string | null;
  responded_at: string | null;
};

export type MasterIntroductionEvent = {
  type: "created" | "viewed" | "accepted" | "declined" | "connected" | "cancelled" | "link_rotated" | "outcome_set";
  participant_id: string | null;
  created_at: string;
};

export type MasterIntroduction = {
  id: string;
  reason: string;
  status: MasterIntroductionStatus;
  outcome: MasterIntroductionOutcome | null;
  expires_at: string;
  connected_at: string | null;
  created_at: string;
  participants: MasterIntroductionParticipant[];
  events: MasterIntroductionEvent[];
};

export type MasterIntroductionView = {
  status: MasterIntroductionStatus;
  administrator_name: string;
  reason: string;
  expires_at: string;
  recipient_name: string;
  recipient_company: string;
  counterpart_preview: string;
  requires_member_account: boolean;
  identity_ok: boolean;
  response_status: MasterIntroductionResponseStatus;
  approved_name: string;
  approved_company: string;
  contact_kind: MasterIntroductionContactKind | null;
  contact_value: string;
  counterpart: {
    name: string;
    company: string;
    contact_kind: MasterIntroductionContactKind;
    contact_value: string;
  } | null;
};

export const MASTER_INTRO_NAME_MAX = 30;
export const MASTER_INTRO_COMPANY_MAX = 60;
export const MASTER_INTRO_TEXT_MAX = 400;

export type MasterIntroductionPersonDraft = {
  member_id: string;
  name: string;
  company: string;
  preview: string;
};

export type MasterIntroductionDraft = {
  reason: string;
  a: MasterIntroductionPersonDraft;
  b: MasterIntroductionPersonDraft;
};

export function validateMasterIntroduction(draft: MasterIntroductionDraft): string | null {
  if (!draft.reason.trim()) return "つなぎたい理由を入力してください。";
  if (draft.reason.trim().length > MASTER_INTRO_TEXT_MAX) return "つなぎたい理由は400文字以内で入力してください。";
  if (!draft.a.member_id && !draft.b.member_id) return "少なくとも一方は酒場の会員を選んでください。";
  if (draft.a.member_id && draft.a.member_id === draft.b.member_id) return "同じ会員を2人に設定することはできません。";
  for (const [label, person] of [["Aさん", draft.a], ["Bさん", draft.b]] as const) {
    if (!person.name.trim()) return `${label}のお名前を入力してください。`;
    if (person.name.trim().length > MASTER_INTRO_NAME_MAX) return `${label}のお名前は30文字以内で入力してください。`;
    if (person.company.trim().length > MASTER_INTRO_COMPANY_MAX) return `${label}の会社名・屋号は60文字以内で入力してください。`;
    if (!person.preview.trim()) return `${label}について相手に先に見せる紹介を入力してください。`;
    if (person.preview.trim().length > MASTER_INTRO_TEXT_MAX) return `${label}の紹介は400文字以内で入力してください。`;
  }
  return null;
}

export const masterIntroductionStatusLabel: Record<MasterIntroductionStatus, string> = {
  waiting: "返事待ち",
  connected: "成立",
  declined: "不成立",
  expired: "期限切れ",
  cancelled: "取消",
};

export const masterIntroductionOutcomeLabel: Record<MasterIntroductionOutcome, string> = {
  met: "会えた",
  working: "仕事・活動につながった",
  no_fit: "今回は進まなかった",
};

export const masterIntroductionContactLabel: Record<MasterIntroductionContactKind, string> = {
  email: "メール",
  line: "LINE",
  website: "ウェブサイト",
  via_admin: "管理者経由",
};
