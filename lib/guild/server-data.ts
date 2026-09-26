import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Guild, GuildNotification, IntroRequest, Position, Profile, Project, ProjectContact, ProjectStep, ProjectTask, Quest, QuestApplication, StepRecord } from "@/lib/guild/types";

type GuildContext = {
  guild: Guild;
  membership: {
    role: "owner" | "master" | "member";
  };
  is_paid: boolean;
};

export type GuildQuest = Quest & {
  applicant_count: number;
  my_application: QuestApplication | null;
};

export type GuildQuestApplicant = {
  user_id: string;
  message: string;
  created_at: string;
  intro_request_id: string | null;
  intro_status: IntroRequest["status"] | null;
};

export type GuildIntroRequest = IntroRequest & {
  other_contact: { email: string; line_url: string; website_url: string } | null;
  /** お返事の期限（0106）。過ぎると申請した人には「取り下げ」に見える */
  expires_at?: string | null;
  /** 承諾するときに添えたひとこと（承諾後に当事者2人だけ） */
  accept_message?: string;
};

export type GuildPendingGatheringApplication = {
  quest_id: string;
  quest_title: string;
  user_id: string;
  display_name: string;
  company_name: string;
  position: Position;
  want_to_solve: string;
  message: string;
  created_at: string;
};

export type GuildMasterInvite = {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  used_count: number;
  max_uses: number;
  created_by_name: string;
  members: { user_id: string; display_name: string; joined_at: string; suspended: boolean }[];
};

export type MyMemberInvite = {
  link: { id: string; code: string; created_at: string } | null;
  people: { user_id: string; display_name: string; joined_at: string; suspended: boolean }[];
};

export type GuildBillingStatus = "free" | "trialing" | "active" | "past_due" | "canceled" | "exempt";
export type GuildBilling = {
  guild_id: string;
  user_id: string;
  role: "owner" | "master" | "member";
  billing_status: GuildBillingStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  is_paid: boolean;
};

export type GuildInviteNetworkMember = {
  user_id: string;
  display_name: string;
  joined_at: string;
  role: "owner" | "master" | "member";
  suspended: boolean;
  invited_by_user_id: string | null;
  invited_by_name: string | null;
};

export type GuildMemberIntroduction = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
  can_delete: boolean;
};

export type GuildProject = Project & { tasks: ProjectTask[] };
export type GuildProjectPipeline = { steps: ProjectStep[]; contacts: ProjectContact[]; records: StepRecord[] };
export type ContactVisibility = "members" | "approved";
export type ContactKind = "email" | "line" | "website";
export type MyGuildProfile = Profile & {
  show_achievements: boolean;
  contact_visibility: Record<ContactKind, ContactVisibility>;
  contact: { email: string; line_url: string; website_url: string };
};

type ProfileExtra = {
  id: string;
  name_kana: string;
  hometown: string;
  hobbies: string;
  life_story: string;
  birth_month: number | null;
  birth_day: number | null;
  birth_year: number | null;
  email: string;
  line_url: string;
  website_url: string;
  email_visibility: ContactVisibility | null;
  line_visibility: ContactVisibility | null;
  website_visibility: ContactVisibility | null;
};

async function getProfileExtras(): Promise<ProfileExtra[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_get_profile_extras", { p_guild_slug: "gia" });
  if (error) throw rpcError("プロフィールの公開設定を取得できませんでした", error.message);
  return Array.isArray(data) ? data as ProfileExtra[] : [];
}

function rpcError(message: string, detail?: string): Error {
  return new Error(detail ? `${message}: ${detail}` : message);
}

export async function getGuildContext(): Promise<GuildContext> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_get_my_context", {
    p_guild_slug: "gia",
  });

  if (error) throw rpcError("酒場の会員情報を取得できませんでした", error.message);
  return data as GuildContext;
}

export async function listGuildMembers(): Promise<Profile[]> {
  const supabase = await createClient();
  const [{ data, error }, extras] = await Promise.all([
    supabase.rpc("sakaba_list_members", { p_guild_slug: "gia" }),
    getProfileExtras(),
  ]);

  if (error) throw rpcError("メンバー名鑑を取得できませんでした", error.message);
  const byId = new Map(extras.map((extra) => [extra.id, extra]));
  return Array.isArray(data) ? (data as Profile[]).map((member) => ({
    ...member,
    name_kana: byId.get(member.id)?.name_kana ?? "",
    hometown: byId.get(member.id)?.hometown ?? "",
    hobbies: byId.get(member.id)?.hobbies ?? "",
    life_story: byId.get(member.id)?.life_story ?? "",
    birth_month: byId.get(member.id)?.birth_month ?? null,
    birth_day: byId.get(member.id)?.birth_day ?? null,
    birth_year: byId.get(member.id)?.birth_year ?? null,
    email: byId.get(member.id)?.email ?? "",
    line_url: byId.get(member.id)?.line_url ?? "",
    website_url: byId.get(member.id)?.website_url ?? "",
  })) : [];
}

export async function listGuildQuests(): Promise<GuildQuest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_list_quests", {
    p_guild_slug: "gia",
  });

  if (error) throw rpcError("クエストを取得できませんでした", error.message);
  return Array.isArray(data) ? (data as GuildQuest[]) : [];
}

export async function listGuildQuestApplicants(questId: string): Promise<GuildQuestApplicant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_list_quest_applicants", { p_quest_id: questId });
  if (error) throw rpcError("参加希望者を取得できませんでした", error.message);
  return Array.isArray(data) ? data as GuildQuestApplicant[] : [];
}

export async function listGuildIntroRequests(): Promise<GuildIntroRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_list_intro_requests", { p_guild_slug: "gia" });
  if (error) throw rpcError("紹介依頼を取得できませんでした", error.message);
  return Array.isArray(data) ? data as GuildIntroRequest[] : [];
}

export async function listPendingGatheringApplications(): Promise<GuildPendingGatheringApplication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_list_pending_gathering_applications", { p_guild_slug: "gia" });
  if (error) throw rpcError("集まりの承認待ちを取得できませんでした", error.message);
  return Array.isArray(data) ? data as GuildPendingGatheringApplication[] : [];
}

export async function listGuildMasterInvites(): Promise<GuildMasterInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_list_master_invites", { p_guild_slug: "gia" });
  if (error) throw rpcError("招待リンクを取得できませんでした", error.message);
  return Array.isArray(data) ? data as GuildMasterInvite[] : [];
}

export async function getMyMemberInvite(): Promise<MyMemberInvite> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_get_my_member_invite", { p_guild_slug: "gia" });
  if (error) throw rpcError("自分の招待リンクを取得できませんでした", error.message);
  return data as MyMemberInvite;
}

export async function getMyGuildBilling(): Promise<GuildBilling> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_get_my_billing", { p_guild_slug: "gia" });
  if (error) throw rpcError("有料会員の状態を取得できませんでした", error.message);
  return data as GuildBilling;
}

export async function listGuildInviteNetwork(): Promise<GuildInviteNetworkMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_list_invite_network", { p_guild_slug: "gia" });
  if (error) throw rpcError("招待のつながりを取得できませんでした", error.message);
  return Array.isArray(data) ? data as GuildInviteNetworkMember[] : [];
}

export async function listGuildMemberIntroductions(targetId: string): Promise<GuildMemberIntroduction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_list_member_introductions", {
    p_guild_slug: "gia",
    p_target_id: targetId,
  });
  if (error) throw rpcError("仲間からの紹介文を取得できませんでした", error.message);
  return Array.isArray(data) ? data as GuildMemberIntroduction[] : [];
}

export async function listGuildNotifications(): Promise<GuildNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_list_my_notifications", { p_guild_slug: "gia" });
  if (error) throw rpcError("おしらせを取得できませんでした", error.message);
  return Array.isArray(data) ? data as GuildNotification[] : [];
}

export async function listGuildProjects(): Promise<GuildProject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_list_my_projects", {
    p_guild_slug: "gia",
  });
  if (error) throw rpcError("プロジェクトを取得できませんでした", error.message);
  return Array.isArray(data) ? (data as GuildProject[]) : [];
}

export async function getMyGuildProfile(): Promise<MyGuildProfile> {
  const supabase = await createClient();
  const [{ data, error }, extras] = await Promise.all([
    supabase.rpc("sakaba_get_my_profile", { p_guild_slug: "gia" }),
    getProfileExtras(),
  ]);
  if (error) throw rpcError("マイページを取得できませんでした", error.message);
  const profile = data as MyGuildProfile;
  const extra = extras.find((item) => item.id === profile.id);
  return {
    ...profile,
    name_kana: extra?.name_kana ?? "",
    hometown: extra?.hometown ?? "",
    hobbies: extra?.hobbies ?? "",
    life_story: extra?.life_story ?? "",
    birth_month: extra?.birth_month ?? null,
    birth_day: extra?.birth_day ?? null,
    birth_year: extra?.birth_year ?? null,
    website_url: extra?.website_url ?? "",
    contact_visibility: {
      email: extra?.email_visibility ?? "approved",
      line: extra?.line_visibility ?? "approved",
      website: extra?.website_visibility ?? "approved",
    },
  };
}

export async function getGuildProjectPipeline(projectId: string): Promise<GuildProjectPipeline> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_get_project_pipeline", {
    p_project_id: projectId,
  });
  if (error) throw rpcError("あいてごとの状況を取得できませんでした", error.message);
  return data as GuildProjectPipeline;
}

export async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw rpcError("ログイン情報を確認できませんでした", error?.message);
  return data.user.id;
}
