import Link from "next/link";
import { ConstructionField, ConstructionFields, ConstructionPanel } from "@/components/guild/construction/fields";
import { areaText, categoryLabel, POST_CATEGORIES, PREFECTURES } from "@/lib/guild/look/sns-mock";
import type { ConstructionPost } from "@/lib/guild/construction-forms";
import { constructionContext, constructionRows } from "@/lib/guild/construction-server";

type Filters = { category?: string | string[]; prefecture?: string | string[] };

export default async function ConstructionPostsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { store } = await constructionContext();
  const params = await searchParams;
  const category = POST_CATEGORIES.find(({ key }) => key === params.category)?.key;
  const prefecture = PREFECTURES.find((area) => area === params.prefecture);
  const filtered = Boolean(category || prefecture);
  const posts = await constructionRows<ConstructionPost>("sakaba_construction_list_posts", {
    p_category: category ?? null, p_prefecture: prefecture ?? null,
  });

  return (
    <ConstructionPanel title="案件">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">{posts.length}件{posts.length === 50 && "（最新50件）"}</p>
        {posts.length > 0 && <Link className="c-button-main px-4 py-2" href={store.path("/posts/new")}>依頼を出す</Link>}
      </div>
      <details className="border-y py-3" open={filtered || undefined}>
        <summary className="cursor-pointer py-1 font-bold">絞り込み{filtered && "（" + [category && categoryLabel(category), prefecture].filter(Boolean).join("・") + "）"}</summary>
        <form action={store.path("/posts")} className="mt-3 space-y-3">
          <ConstructionFields>
            <ConstructionField label="カテゴリー"><select name="category" defaultValue={category ?? ""}><option value="">すべて</option>{POST_CATEGORIES.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}</select></ConstructionField>
            <ConstructionField label="都道府県"><select name="prefecture" defaultValue={prefecture ?? ""}><option value="">すべて</option>{PREFECTURES.map((area) => <option key={area}>{area}</option>)}</select></ConstructionField>
          </ConstructionFields>
          <button className="c-button-main px-4 py-2" type="submit">絞り込む</button>
        </form>
      </details>
      {posts.length ? (
        <ul className="divide-y">
          {posts.map((post) => (
            <li key={post.id} className="py-4">
              <Link className="font-bold underline-offset-4 hover:underline" href={store.path("/posts/" + post.id)}>{post.title}</Link>
              <p className="mt-1 text-sm c-muted">{post.industry} · {areaText(post.areas, 2)} · 返信 {post.reply_count}件</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-3 py-6">
          <p>{filtered ? "条件に合う案件はありません" : "まだ案件はありません"}</p>
          <Link className="c-button-main inline-flex px-4 py-2" href={store.path(filtered ? "/posts" : "/posts/new")}>
            {filtered ? "絞り込みを解除" : "最初の依頼を出す"}
          </Link>
        </div>
      )}
    </ConstructionPanel>
  );
}
