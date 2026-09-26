import type { Metadata } from "next";
import { BusinessCardEditor } from "@/components/guild/business-card-editor";
import { LiveStatusForm } from "@/components/guild/live-status-form";
import type { BusinessCard } from "@/lib/guild/business-card";
import { signBusinessCards } from "@/lib/guild/business-card-server";
import { getMyGuildProfile } from "@/lib/guild/server-data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "ステータスをなおす" };

export default async function StatusEditPage() {
  const profile = await getMyGuildProfile();
  const supabase = await createClient();
  const { data: cardData } = await supabase.rpc("sakaba_get_business_card", { p_user_id: profile.id });
  const card = (cardData as BusinessCard | null) ?? { front: null, back: null, agreed_at: null };
  const urls = await signBusinessCards(supabase, [card.front, card.back]);
  return <div className="space-y-11">
    <LiveStatusForm initial={profile} />
    {/* 名刺は画像を選んだその場で保存する（上の「保存して戻る」とは別） */}
    <BusinessCardEditor userId={profile.id} initial={card} initialUrls={urls} />
  </div>;
}
