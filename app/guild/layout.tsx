import type { Metadata } from "next";
import { GuildShell } from "@/components/guild/guild-shell";
import { createClient } from "@/lib/supabase/server";
import "@/components/guild/guild-theme.css";

export const metadata: Metadata = {
  // absolute にしないと、親（app/layout.tsx）の「| GIA」が後ろに付く
  title: { absolute: "GIAの酒場", template: "%s | GIAの酒場" },
  robots: { index: false, follow: false },
};

export default async function GuildLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let isMaster = false;
  if (user) {
    const { data } = await supabase.rpc("sakaba_get_my_context", { p_guild_slug: "gia" });
    const context = data as { membership?: { role?: string } } | null;
    isMaster = context?.membership?.role === "owner" || context?.membership?.role === "master";
  }
  return <GuildShell isMaster={isMaster}>{children}</GuildShell>;
}
