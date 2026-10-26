import { TrackingScreen } from "@/components/guild/look/kensetsu/request-screens";
import { SEED_REFERRALS } from "@/lib/guild/look/kensetsu-mock";

// 見本の相談は先に作っておく（開くのが速い）。画面で新しく出した相談は、その場で作られる
export function generateStaticParams() {
  return SEED_REFERRALS.map((r) => ({ id: r.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrackingScreen id={id} />;
}
