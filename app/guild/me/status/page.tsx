import type { Metadata } from "next";
import { LiveStatusForm } from "@/components/guild/live-status-form";
import { getMyGuildProfile } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "ステータスをなおす" };

export default async function StatusEditPage() {
  const profile = await getMyGuildProfile();
  return <LiveStatusForm initial={profile} />;
}
