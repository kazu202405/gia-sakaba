import { MasterDetailScreen } from "@/components/guild/look/kensetsu/master-screens";
import { SEED_REFERRALS } from "@/lib/guild/look/kensetsu-mock";

export function generateStaticParams() {
  return SEED_REFERRALS.map((r) => ({ id: r.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MasterDetailScreen id={id} />;
}
