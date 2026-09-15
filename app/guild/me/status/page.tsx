import type { Metadata } from "next";
import { StatusWizard } from "@/components/guild/status-wizard";
import { ME_ID, getProfile, guild, myContact, myGiaApplicant } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: `${guild.terms.status}を作る` };

type Props = { searchParams: Promise<{ new?: string }> };

// ?new=1 … はじめて酒場に来た人の画面（見本）。無ければ今のステータスを直す画面
export default async function StatusEditPage({ searchParams }: Props) {
  const { new: isNewParam } = await searchParams;
  const isNew = isNewParam === "1";
  const me = getProfile(ME_ID)!;

  return (
    <StatusWizard
      key={isNew ? "new" : "edit"}
      isNew={isNew}
      initial={isNew ? null : me}
      initialContact={isNew ? null : { email: myContact.email, line_url: myContact.line_url, website_url: myContact.website_url }}
      giaApplicant={isNew ? myGiaApplicant : null}
    />
  );
}
