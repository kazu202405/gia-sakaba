import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Guild, Profile } from "@/lib/guild/types";

type GuildContext = {
  guild: Guild;
  membership: {
    role: "owner" | "master" | "member";
  };
  is_paid: boolean;
};

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

export async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw rpcError("ログイン情報を確認できませんでした", error?.message);
  return data.user.id;
}
