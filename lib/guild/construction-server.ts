import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentStore } from "./current-store";
import { CONSTRUCTION_STORE_SLUG } from "./stores";

export const constructionContext = cache(async () => {
  const store = await currentStore();
  if (store.slug !== CONSTRUCTION_STORE_SLUG) notFound();

  const db = await createClient();
  const [{ data: { user }, error: userError }, gate] = await Promise.all([
    db.auth.getUser(),
    db.rpc("sakaba_get_my_gate_status", { p_guild_slug: store.slug }),
  ]);
  if (gate.error) throw new Error("建設・不動産の酒場の会員資格を確認できませんでした。");
  if (userError || !user || gate.data !== "active") notFound();
  return { db, store, userId: user.id };
});

export async function constructionRows<Row>(name: string, args?: Record<string, unknown>): Promise<Row[]> {
  const { db } = await constructionContext();
  const { data, error } = await db.rpc(name, args);
  if (error || !Array.isArray(data)) {
    console.error("[construction.rpc]", name, error?.code ?? "invalid_response");
    throw new Error("建設・不動産の酒場のデータを取得できませんでした。");
  }
  return data as Row[];
}
