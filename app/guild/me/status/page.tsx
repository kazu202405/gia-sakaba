import type { Metadata } from "next";
import { LiveStatusForm } from "@/components/guild/live-status-form";
import { getGuildContext, getMyGuildProfile } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "ステータスをなおす" };

export default async function StatusEditPage() {
  const [context, profile] = await Promise.all([getGuildContext(), getMyGuildProfile()]);
  return <LiveStatusForm initial={profile} isPaid={context.is_paid} />;
}
