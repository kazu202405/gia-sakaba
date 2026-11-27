import Link from "next/link";
import { Plus } from "lucide-react";
import { ConstructionPostFilters } from "@/components/guild/construction/forms";
import { ConstructionEmptyPosts, ConstructionPostRows, orderConstructionPosts } from "@/components/guild/construction/post-rows";
import { POST_CATEGORIES, PREFECTURES } from "@/lib/guild/look/sns-mock";
import type { ConstructionConnection, ConstructionPost } from "@/lib/guild/construction-forms";
import { constructionContext, constructionRows } from "@/lib/guild/construction-server";
import { listGuildMembers } from "@/lib/guild/server-data";

type Filters = { category?: string | string[]; prefecture?: string | string[] };

export default async function ConstructionPostsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { store, userId } = await constructionContext();
  const params = await searchParams;
  const category = POST_CATEGORIES.find(({ key }) => key === params.category)?.key;
  const prefecture = PREFECTURES.find((area) => area === params.prefecture);
  const filtered = Boolean(category || prefecture);
  const [posts, members, connections] = await Promise.all([
    constructionRows<ConstructionPost>("sakaba_construction_list_posts", { p_category: category ?? null, p_prefecture: prefecture ?? null }),
    listGuildMembers(),
    constructionRows<ConstructionConnection>("sakaba_construction_list_my_connections"),
  ]);
  return <div className="sn-page sn-page--filters">
    <aside className="sn-page-side">
      <div className="sn-band sn-sec">
        <div className="sn-sec-h"><h2>探しています</h2></div>
        <Link href={store.path("/posts/new")} className="sn-btn sn-btn--main sn-btn--wide"><Plus aria-hidden />依頼する</Link>
        <ConstructionPostFilters href={store.path("/posts")} category={category} prefecture={prefecture} count={posts.length} />
      </div>
    </aside>
    <div className="sn-page-main">
      {posts.length ? <div><ConstructionPostRows posts={orderConstructionPosts(posts, userId, connections)} viewer={userId}
        members={members} connections={connections} base={store.path()} /></div>
        : <ConstructionEmptyPosts base={store.path()} filtered={filtered} />}
    </div>
  </div>;
}
