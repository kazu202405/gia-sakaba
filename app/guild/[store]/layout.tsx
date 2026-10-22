import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApprovalGate } from "@/components/guild/approval-gate";
import { GuildShell } from "@/components/guild/guild-shell";
import { NotMemberNotice } from "@/components/guild/not-member-notice";
import { StoreProvider } from "@/components/guild/store-context";
import { isHeldOutside, parseGateState } from "@/lib/guild/approval";
import { currentStore } from "@/lib/guild/current-store";
import { countNavBadges } from "@/lib/guild/nav-badges";
import { listGuildNotifications } from "@/lib/guild/server-data";
import { storeShareMetadata } from "@/lib/guild/site-meta";
import { guildPath } from "@/lib/guild/store-path";
import { findStore, storeThemeAttrs } from "@/lib/guild/stores";
import { createClient } from "@/lib/supabase/server";

type Props = { children: React.ReactNode; params: Promise<{ store: string }> };

// 店ごとの題名・説明・ホーム画面に追加したときの名前。ルート（app/guild/layout.tsx）の GIAの酒場 を店のもので上書きする
export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const config = findStore((await params).store);
  if (!config) return {};
  return {
    // absolute にしないと、親（app/layout.tsx）の「| GIA」が後ろに付く
    title: { absolute: config.name, template: `%s | ${config.name}` },
    description: config.description,
    ...storeShareMetadata(config),
    manifest: guildPath(config.slug, "/manifest.webmanifest"),
    appleWebApp: { capable: true, title: config.name, statusBarStyle: "black-translucent" },
  };
}

export default async function StoreLayout({ children, params }: Props) {
  const { store: slug } = await params;
  const config = findStore(slug);
  // 登録されていない店の名前（/guild/でたらめ）は、ここで 404 にする
  if (!config) notFound();
  const store = await currentStore();
  // proxy.ts が道から決めた「今の店」と、この道の店がずれていたら止める（黙って別の店のデータを出さない）
  if (store.slug !== config.slug) throw new Error(`今の店(${store.slug})と道の店(${config.slug})が一致しません。proxy.ts を確認してください`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // 未ログイン：店の案内ページ（app/guild/[store]/page.tsx）だけがここまで来る。ほかの道は proxy が ログインへ送っている
  if (!user) {
    return <StoreProvider slug={config.slug}><div {...storeThemeAttrs(config)} className="contents">{children}</div></StoreProvider>;
  }

  let isMaster = false;
  let initialBadges = countNavBadges([]);
  // 役職「その他」で申請した人（承認待ち）と見送られた人には、酒場の中を出さない（0126）。
  // 判定はDBの sakaba.member_gate_state 1か所。ここは見せ方だけで、本当の関門は各RPCの会員判定。
  // 読めなかったときは今までの動きのまま（ここで全員を止めない）
  const { data: gateData, error: gateError } = await supabase.rpc("sakaba_get_my_gate_status", { p_guild_slug: store.slug });
  const gate = gateError ? null : parseGateState(gateData);
  if (isHeldOutside(gate)) {
    return <StoreProvider slug={config.slug}><div {...storeThemeAttrs(config)} className="contents"><ApprovalGate state={gate} storeName={config.name} tavern={config.theme === "tavern"} /></div></StoreProvider>;
  }
  // この店の会員ではない人（別の店だけの会員・まだどこにも入っていない人）。名簿やクエストのRPCは会員でなければ必ず拒否するので、
  // 空の画面やエラーを出さず、入会の道（招待リンク）と、入っている店への戻り道を出す
  if (gate === "none") {
    return <StoreProvider slug={config.slug}><div {...storeThemeAttrs(config)} className="contents"><NotMemberNotice storeName={config.name} tavern={config.theme === "tavern"} /></div></StoreProvider>;
  }
  const { data } = await supabase.rpc("sakaba_get_my_context", { p_guild_slug: store.slug });
  const context = data as { membership?: { role?: string } } | null;
  isMaster = context?.membership?.role === "owner" || context?.membership?.role === "master";
  // メニューの数字は飾りなので、読めなくても酒場は止めない（数字なしで出す）
  try {
    initialBadges = countNavBadges(await listGuildNotifications());
  } catch {
    // 数字なし
  }
  return (
    <StoreProvider slug={config.slug}>
      <div {...storeThemeAttrs(config)} className="contents">
        <GuildShell isMaster={isMaster} initialBadges={initialBadges}>{children}</GuildShell>
      </div>
    </StoreProvider>
  );
}
