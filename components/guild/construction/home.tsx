import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import { ConstructionEmptyPosts, ConstructionPostRows, orderConstructionPosts } from "./post-rows";
import type { ConstructionConnection, ConstructionIntro, ConstructionPost } from "@/lib/guild/construction-forms";
import { constructionContext, constructionRows } from "@/lib/guild/construction-server";
import { REGION_NAMES, regionOf } from "@/lib/guild/look/sns-mock";
import { listGuildMembers } from "@/lib/guild/server-data";
import { ConstructionHomeRegion } from "./forms";

export async function ConstructionHome({ region }: { region?: string }) {
  const { store, userId } = await constructionContext();
  const selected = REGION_NAMES.find((item) => item === region);
  const [members, posts, connections, intros] = await Promise.all([
    listGuildMembers(),
    constructionRows<ConstructionPost>("sakaba_construction_list_posts"),
    constructionRows<ConstructionConnection>("sakaba_construction_list_my_connections"),
    constructionRows<ConstructionIntro>("sakaba_construction_list_intros"),
  ]);
  const base = store.path();
  const names = new Map(members.map((member) => [member.id, member.display_name]));
  const name = (id: string) => names.get(id) ?? "会員";
  const selectedPosts = selected ? posts.filter((post) => post.areas.some((area) => regionOf(area) === selected)) : posts;
  const sorted = orderConstructionPosts(selectedPosts, userId, connections);
  const awaiting = intros.filter((intro) =>
    (intro.introducer_id === userId && intro.status === "requested") || (intro.target_id === userId && intro.status === "asking_target"));
  return <div className="sn-page">
    <div className="sn-page-main">
      <div className="sn-band sn-sec">
        <form role="search" className="sn-home-search" action={store.path("/search")}>
          <label className="sn-search"><Search aria-hidden /><span className="sr-only">人・会社を探す</span><input type="search" name="q" enterKeyHint="search" maxLength={100} placeholder="人・会社を探す（業種・地域・名前）" /></label>
          <button type="submit" className="sn-search-go">探す</button>
        </form>
      </div>
      {awaiting.map((intro) => {
        const from = name(intro.status === "asking_target" ? intro.introducer_id : intro.requester_id);
        return <div key={intro.id} className="sn-ask">
          <span className="sn-fc" aria-hidden="true">{Array.from(from).slice(0, 2).join("")}</span>
          <p><b>{from}さんから、紹介のおねがい</b><small>{intro.status === "asking_target" ? "あなたを紹介したいそうです" : "紹介依頼が届いています"}</small></p>
          <Link className="sn-ask-go" href={store.path("/network#introductions")}>中身を見る</Link>
        </div>;
      })}
      <section>
        <div className="sn-sec"><div className="sn-sec-h">
          <h2>探しています</h2>
          <div className="sn-feed-tools"><MapPin size={14} aria-hidden /><ConstructionHomeRegion base={base} value={selected ?? ""} /><span>近い順</span></div>
        </div></div>
        {sorted.length ? <ConstructionPostRows posts={sorted} viewer={userId} members={members} connections={connections} base={base} />
          : <ConstructionEmptyPosts base={base} filtered={Boolean(selected)} reset={base} />}
      </section>
    </div>
    <aside className="sn-page-side">
      <p className="sn-stats"><span><b>{connections.filter((link) => link.status === "connected").length}</b>人の知り合い</span></p>
    </aside>
  </div>;
}
