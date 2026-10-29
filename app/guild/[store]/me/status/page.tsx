import type { Metadata } from "next";
import { currentStore } from "@/lib/guild/current-store";
import { BusinessCardEditor } from "@/components/guild/business-card-editor";
import { ContactItemsEditor } from "@/components/guild/contact-items-editor";
import { LiveStatusForm } from "@/components/guild/live-status-form";
import type { BusinessCard } from "@/lib/guild/business-card";
import { parseContactItemsMap, type GuildContactItem } from "@/lib/guild/contact-items";
import { signBusinessCards, signWorkPhotos } from "@/lib/guild/business-card-server";
import { mergeDraftIntoProfile } from "@/lib/guild/profile-drafts";
import { getGuildContext, getMyGuildProfile, getMyProfileDraft } from "@/lib/guild/server-data";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await currentStore()).w("status.editTitle") };
}

export default async function StatusEditPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { draft: draftId } = await searchParams;
  const savedProfile = await getMyGuildProfile();
  // 下書きから来たとき：本人が書いている項目は変えず、空いている項目にだけ下書きを入れて開く。載るのは、本人が保存を押したとき
  const draftResult = draftId ? await getMyProfileDraft() : null;
  const draft = draftResult?.ok && draftResult.draft?.id === draftId ? draftResult.draft : null;
  const merge = draft ? mergeDraftIntoProfile(savedProfile, draft.fields) : null;
  const profile = merge ? { ...savedProfile, ...merge.merged } : savedProfile;
  const store = await currentStore();
  const { guild } = await getGuildContext();
  const supabase = await createClient();
  const { data: cardData } = await supabase.rpc("sakaba_get_business_card", { p_user_id: profile.id, p_guild_slug: store.slug });
  const card = (cardData as BusinessCard | null) ?? { front: null, back: null, agreed_at: null };
  const urls = await signBusinessCards(supabase, [card.front, card.back]);
  // 連絡先：読めなかったときは null（編集させない。空のまま保存して消さないように）
  const { data: contactData, error: contactError } = await supabase.rpc("sakaba_get_contact_items", { p_user_ids: [profile.id], p_guild_slug: store.slug });
  const contactItems: GuildContactItem[] | null = contactError ? null : (parseContactItemsMap(contactData)[profile.id] ?? []).flatMap((item, index) =>
    item.value === null ? [] : [{ kind: item.kind, label: item.label, value: item.value, visibility: item.visibility ?? "approved", sort_order: index }]);
  const workPhotoUrls = await signWorkPhotos(supabase, profile.work_photos ?? []);
  return <div className="space-y-11">
    <LiveStatusForm initial={profile} guildId={guild.id} workPhotoUrls={workPhotoUrls} profileDraft={draft && merge ? { id: draft.id, from: draft.drafted_by_name, skipped: merge.skipped } : undefined} contactEditor={<ContactItemsEditor initial={contactItems} />} />
    {/* 名刺は画像を選んだその場で保存する（上の「保存して戻る」とは別） */}
    <BusinessCardEditor userId={profile.id} guildId={guild.id} initial={card} initialUrls={urls} />
  </div>;
}
