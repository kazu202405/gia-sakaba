import { CompanyScreen } from "@/components/guild/look/sns/screens";
import { COMPANIES } from "@/lib/guild/look/sns-mock";

// 見本の会社は先に作っておく（開くのが速い）
export function generateStaticParams() {
  return COMPANIES.map((c) => ({ id: c.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompanyScreen id={id} />;
}
