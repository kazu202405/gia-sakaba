import type { Metadata } from "next";
import { GuildLoginForm } from "@/components/guild/login-form";
import { GUILD_ROOT, isGuildLocalPath, storeSlugOfPath } from "@/lib/guild/store-path";
import { storeOrDefault, storeThemeAttrs } from "@/lib/guild/stores";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** ログイン後の行き先。酒場の中の道だけ受け付ける（外へは飛ばさない） */
function safeNext(value: string | string[] | undefined): string {
  const next = typeof value === "string" ? value : null;
  return isGuildLocalPath(next) ? next : GUILD_ROOT;
}

// ログイン画面は店に属さない道（/guild/login）。どの店から来たかは next の道で決め、その店の名前・見た目で出す。
// next が店の道でないとき（/guild など）は既定の店（GIAの酒場）。
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const config = storeOrDefault(storeSlugOfPath(safeNext((await searchParams).next)));
  return { title: { absolute: `ログイン | ${config.name}` } };
}

export default async function GuildLoginPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next);
  const config = storeOrDefault(storeSlugOfPath(next));
  return (
    <div {...storeThemeAttrs(config)} className="contents">
      <GuildLoginForm storeName={config.name} tavern={config.theme === "tavern"} next={next} />
    </div>
  );
}
