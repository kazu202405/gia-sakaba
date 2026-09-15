// 招待・承認フローの mock データ。
//
// network_app の招待制（仮登録は自由登録／本登録は主催者承認）を表現する。
// Phase 1 では state 内のみで完結し、永続化はしない。
// Phase 2 で Supabase の invitations テーブルに置き換える想定。
//
// データ構造の意図:
// - eventId は post/data.ts の Event.id か lib/seminars.ts の SeminarEvent.id。
//   mock 段階では両者を区別しない（参照側で正しいリストを引く前提）。
// - code は招待リンクに埋め込む文字列。mock では eventId と同じで構わないが、
//   将来的に「1イベントに複数の招待コードを発行」する余地を残すため別フィールドにしておく。
// - status: sent           = 招待リンクを発行した（誰が踏むかは未定）
//           pending_approval = 招待先が仮登録した。主催者の承認待ち
//           approved        = 主催者が承認 → 本登録
//           declined        = 主催者が却下

export type InvitationStatus =
  | "sent"
  | "pending_approval"
  | "approved"
  | "declined";

export interface Invitation {
  id: string;
  /** どのセミナー / イベントへの招待か（post/data.ts または lib/seminars.ts と整合） */
  eventId: string;
  /** 招待リンクに埋め込むコード（mock では eventId と同一でも可） */
  code: string;
  /** 主催者がメモした招待先名（任意） */
  invitedName?: string;
  /** 招待先メールアドレス（任意） */
  invitedEmail?: string;
  status: InvitationStatus;
  /** YYYY-MM-DD */
  createdAt: string;
  /** 承認待ち時のみ。仮登録時に申込者が入力した情報を保持 */
  applicantName?: string;
  applicantEmail?: string;
  applicantTier?: "tentative" | "registered";
}

/**
 * 招待リンク URL を組み立てる。
 * クライアント側で `window.location.origin` を prepend する想定で相対パスを返す。
 */
export function buildInviteUrl(code: string): string {
  return `/join?invite=${encodeURIComponent(code)}`;
}

/**
 * 初期 mock データ。
 * post/data.ts の Event id（e1 / e2 / e5 等）に対して、status を散らして並べる。
 * pending_approval の行は applicantName / applicantEmail / applicantTier を埋める。
 */
export const mockInvitations: Invitation[] = [
  // e1: 第12回 経営者グルメ会（upcoming, host=true）
  {
    id: "inv-1",
    eventId: "e1",
    code: "e1",
    invitedName: "高橋 真一",
    invitedEmail: "takahashi@example.com",
    status: "sent",
    createdAt: "2026-02-20",
  },
  {
    id: "inv-2",
    eventId: "e1",
    code: "e1",
    invitedName: "井上 美咲",
    invitedEmail: "inoue@example.com",
    status: "pending_approval",
    createdAt: "2026-02-22",
    applicantName: "井上 美咲",
    applicantEmail: "inoue@example.com",
    applicantTier: "tentative",
  },
  {
    id: "inv-3",
    eventId: "e1",
    code: "e1",
    status: "pending_approval",
    createdAt: "2026-02-25",
    applicantName: "森田 さやか",
    applicantEmail: "morita@example.com",
    applicantTier: "tentative",
  },
  {
    id: "inv-4",
    eventId: "e1",
    code: "e1",
    invitedName: "本田 浩二",
    invitedEmail: "honda@example.com",
    status: "approved",
    createdAt: "2026-02-10",
  },

  // e3: 第11回 経営者グルメ会（past, host=true）
  {
    id: "inv-5",
    eventId: "e3",
    code: "e3",
    invitedName: "中村 明子",
    invitedEmail: "nakamura@example.com",
    status: "approved",
    createdAt: "2026-01-15",
  },

  // GIA セミナー側のサンプル（lib/seminars.ts と整合）
  {
    id: "inv-6",
    eventId: "gia-referral-vol-3",
    code: "gia-referral-vol-3",
    status: "pending_approval",
    createdAt: "2026-04-20",
    applicantName: "小林 健",
    applicantEmail: "kobayashi@example.com",
    applicantTier: "tentative",
  },
];
