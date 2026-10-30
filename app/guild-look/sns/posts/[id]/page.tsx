import { PostScreen } from "@/components/guild/look/sns/post-screens";
import { wantPosts } from "@/lib/guild/look/sns-mock";

// 見本の案件は先に作っておく。自分が投稿した案件は、画面の中の状態から出す
export function generateStaticParams() {
  return wantPosts().map((p) => ({ id: p.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostScreen id={id} />;
}
