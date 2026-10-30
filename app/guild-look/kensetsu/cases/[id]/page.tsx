import { CaseScreen } from "@/components/guild/look/kensetsu/member-screens";
import { SEED_REFERRALS } from "@/lib/guild/look/kensetsu-mock";

// 見本の案件は先に作っておく（開くのが速い）
export function generateStaticParams() {
  return SEED_REFERRALS.map((r) => ({ id: r.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseScreen id={id} />;
}
