import type { Metadata } from "next";
import { ApprovalGate } from "@/components/guild/approval-gate";
import { GuildShell } from "@/components/guild/guild-shell";
import { isHeldOutside, parseGateState } from "@/lib/guild/approval";
import { createClient } from "@/lib/supabase/server";
import { GUILD_SHARE_DESCRIPTION, GUILD_SITE_URL, guildShareMetadata } from "@/lib/guild/site-meta";
import "@/components/guild/guild-theme.css";

export const metadata: Metadata = {
  // absolute にしないと、親（app/layout.tsx）の「| GIA」が後ろに付く
  title: { absolute: "GIAの酒場", template: "%s | GIAの酒場" },
  // 無いと親（app/layout.tsx）のGIA本体HPの説明・画像が、送ったURLの見え方に出る
  metadataBase: new URL(GUILD_SITE_URL),
  description: GUILD_SHARE_DESCRIPTION,
  ...guildShareMetadata,
  manifest: "/guild/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/images/sakaba/guild-icon-20260929-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/sakaba/guild-icon-20260929-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/images/sakaba/guild-icon-20260929-192.png"],
    apple: [{ url: "/images/sakaba/guild-icon-20260929-apple-touch.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "GIAの酒場", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export default async function GuildLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let isMaster = false;
  if (user) {
    // 役職「その他」で申請した人（承認待ち）と見送られた人には、酒場の中を出さない（0126）。
    // 判定はDBの sakaba.member_gate_state 1か所。ここは見せ方だけで、本当の関門は各RPCの会員判定。
    // 読めなかったときは今までの動きのまま（ここで全員を止めない）
    const { data: gateData, error: gateError } = await supabase.rpc("sakaba_get_my_gate_status", { p_guild_slug: "gia" });
    const gate = gateError ? null : parseGateState(gateData);
    if (isHeldOutside(gate)) return <ApprovalGate state={gate} />;
    const { data } = await supabase.rpc("sakaba_get_my_context", { p_guild_slug: "gia" });
    const context = data as { membership?: { role?: string } } | null;
    isMaster = context?.membership?.role === "owner" || context?.membership?.role === "master";
  }
  return <GuildShell isMaster={isMaster}>{children}</GuildShell>;
}
