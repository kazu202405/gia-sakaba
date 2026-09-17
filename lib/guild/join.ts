// 入会と、限定の集まりへの申し込みの決まり。画面にもDBにも依存しない関数だけを置き、テスト（join.test.ts）で見張る。
//
// - 入会は招待リンクからだけ。酒場そのものは だれでも入れる（経営者の条件は 限定の集まりだけにかける）
// - 経営者の確認を 別の作業にしない：限定の集まりへの はじめての申し込みを ギルドマスターが承認したら確認ずみ。
//   次からは 承認なしで そのまま参加できる

import type { Invite, Position, Profile, Quest, QuestApplication } from "./types";

export const JOIN_NAME_MAX = 30;
export const JOIN_COMPANY_MAX = 60;

/** 代表・役員・決裁者を「経営者」とする */
export function isExecutive(position: Position): boolean {
  return position !== "other";
}

export type InviteCheck =
  { ok: true; invite: Invite } | { ok: false; reason: "missing" | "not_found" | "expired" | "used_up" };

export function checkInvite(invites: Invite[], code: string | null | undefined, today: string): InviteCheck {
  const trimmed = code?.trim() ?? "";
  if (trimmed === "") return { ok: false, reason: "missing" };
  // 大文字・小文字の違いでは はじかない（口頭や手入力で伝わることがあるため）
  const invite = invites.find((i) => i.code.toUpperCase() === trimmed.toUpperCase());
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.expires_at !== null && invite.expires_at < today) return { ok: false, reason: "expired" };
  if (invite.used >= invite.max_uses) return { ok: false, reason: "used_up" };
  return { ok: true, invite };
}

/** 招待リンクが使えないときの文言。原因ごとに分ける（1つの文言にまとめると、何をすればいいか分からない） */
export const inviteErrorText: Record<Exclude<InviteCheck, { ok: true }>["reason"], string> = {
  missing: "入会は 招待リンクから できます。招待してくれた人に リンクを もらってください。",
  not_found: "この招待リンクは 見つかりませんでした。リンクが 途中で切れていないか 確かめてください。",
  expired: "この招待リンクは 期限が すぎています。招待してくれた人に 新しいリンクを もらってください。",
  used_up: "この招待リンクは 決められた人数に 達しました。招待してくれた人に 新しいリンクを もらってください。",
};

export const JOIN_SOLVE_MAX = 60;

export type JoinDraft = {
  display_name: string;
  company_name: string;
  position: Position | "";
  show_company: boolean;
  /** いま、なにを解決したいですか？（任意） */
  want_to_solve: string;
  /** ギルドの約束に 同意したか（必須） */
  agreed: boolean;
};
export type JoinErrors = Partial<
  Record<"display_name" | "company_name" | "position" | "want_to_solve" | "agreed", string>
>;

export function validateJoin(d: JoinDraft): JoinErrors {
  const errors: JoinErrors = {};
  if (d.display_name.trim() === "") errors.display_name = "お名前を 入れてください";
  else if (d.display_name.trim().length > JOIN_NAME_MAX) errors.display_name = `${JOIN_NAME_MAX}字までに してください`;
  if (d.company_name.trim() === "") errors.company_name = "会社名を 入れてください（個人事業の方は 屋号）";
  else if (d.company_name.trim().length > JOIN_COMPANY_MAX)
    errors.company_name = `${JOIN_COMPANY_MAX}字までに してください`;
  if (d.position === "") errors.position = "役職を えらんでください";
  if (d.want_to_solve.trim().length > JOIN_SOLVE_MAX) errors.want_to_solve = `${JOIN_SOLVE_MAX}字までに してください`;
  if (!d.agreed) errors.agreed = "ギルドの約束に 同意すると 入会できます";
  return errors;
}

/** 限定の集まりに申し込んだときの結果。前に承認されていれば そのまま参加、はじめてなら 承認待ち */
export function gatheringApplyResult(profile: Pick<Profile, "gathering_approved_at">): "joined" | "pending" {
  return profile.gathering_approved_at ? "joined" : "pending";
}

/** ギルドマスターの承認待ち（限定の集まりへの申し込みで、まだ承認していないもの） */
export function pendingGatheringApplications(quests: Quest[], applications: QuestApplication[]): QuestApplication[] {
  const limited = new Set(quests.filter((q) => q.members_only && q.status === "open").map((q) => q.id));
  return applications
    .filter((a) => limited.has(a.quest_id) && a.status === "applied" && a.approved_at === null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
