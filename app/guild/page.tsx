import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotMemberNotice } from "@/components/guild/not-member-notice";
import { guildPath } from "@/lib/guild/store-path";
import { STORE_SLUGS } from "@/lib/guild/stores";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "酒場へ" };
export const dynamic = "force-dynamic";

// 酒場の入口（/guild）。店の道（/guild/<店>）ではない昔の入口・ログイン後の既定の行き先・ホーム画面のアイコンの開始位置。
// 入っている酒場へ移す。複数の店に入っている人は、STORE_SLUGS の先頭（GIAの酒場）を優先する。
// ログインしていない人は proxy が /guild/login へ送っているので、ここへは来ない。
export default async function GuildEntryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  let readFailed = false;
  for (const slug of STORE_SLUGS) {
    const { data, error } = await supabase.rpc("sakaba_get_my_gate_status", { p_guild_slug: slug });
    // 'none'＝その店の会員ではない。読めなかったとき（error）は次の店を見る
    if (error) readFailed = true;
    if (!error && typeof data === "string" && data !== "none") {
      const qs = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (typeof value === "string") qs.set(key, value);
      }
      redirect(`${guildPath(slug)}${qs.size ? `?${qs}` : ""}`);
    }
  }
  // 読めなかった店があるのに「会員ではありません」と出すと、会員を締め出したように見える。エラー画面に任せる
  if (readFailed) throw new Error("酒場の会員情報を読み込めませんでした");
  return <NotMemberNotice storeName="酒場" showEntryLink={false} />;
}
