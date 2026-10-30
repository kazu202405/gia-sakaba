import { PersonScreen } from "@/components/guild/look/sns/screens";
import { PEOPLE } from "@/lib/guild/look/sns-mock";

// 見本の人は先に作っておく（開くのが速い）
export function generateStaticParams() {
  return PEOPLE.map((p) => ({ id: p.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PersonScreen id={id} />;
}
