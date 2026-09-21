import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Guild, Profile, Project, ProjectContact, ProjectStep, ProjectTask, Quest, QuestApplication, StepRecord } from "@/lib/guild/types";

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

export type GuildProject = Project & { tasks: ProjectTask[] };
export type GuildProjectPipeline = { steps: ProjectStep[]; contacts: ProjectContact[]; records: StepRecord[] };

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
  const { data, error } = await supabase.rpc("sakaba_list_members", {
    p_guild_slug: "gia",
  });

  if (error) throw rpcError("メンバー名鑑を取得できませんでした", error.message);
  return Array.isArray(data) ? (data as Profile[]) : [];
}

export async function listGuildQuests(): Promise<GuildQuest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_list_quests", {
    p_guild_slug: "gia",
  });

  if (error) throw rpcError("クエストを取得できませんでした", error.message);
  return Array.isArray(data) ? (data as GuildQuest[]) : [];
}

export async function listGuildProjects(): Promise<GuildProject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sakaba_list_my_projects", {
    p_guild_slug: "gia",
  });
  if (error) throw rpcError("プロジェクトを取得できませんでした", error.message);
  return Array.isArray(data) ? (data as GuildProject[]) : [];
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
