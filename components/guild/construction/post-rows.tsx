import Link from "next/link";
import { MapPin } from "lucide-react";
import { Due, KindIcon } from "@/components/guild/look/sns/parts";
import { INDUSTRY_KIND, areaText } from "@/lib/guild/look/sns-mock";
import type { ConstructionConnection, ConstructionPost } from "@/lib/guild/construction-forms";
import type { Profile } from "@/lib/guild/types";

export function orderConstructionPosts(posts: ConstructionPost[], viewer: string, connections: ConstructionConnection[]) {
  const friends = new Set(connections.filter((link) => link.status === "connected").map((link) => link.friend_id));
  const closeness = (post: ConstructionPost) => post.author_id === viewer ? 0 : friends.has(post.author_id) ? 1 : 2;
  return [...posts].sort((a, b) => closeness(a) - closeness(b));
}

export function ConstructionPostRows({ posts, viewer, members, connections, base }: {
  posts: ConstructionPost[];
  viewer: string;
  members: Pick<Profile, "id" | "display_name" | "company_name">[];
  connections: ConstructionConnection[];
  base: string;
}) {
  const people = new Map(members.map((member) => [member.id, member]));
  const friends = new Set(connections.filter((link) => link.status === "connected").map((link) => link.friend_id));
  return posts.map((post) => {
    const author = people.get(post.author_id);
    const authorName = author?.display_name ?? "酒場の会員";
    const mine = viewer === post.author_id;
    const direct = friends.has(post.author_id);
    const kind = INDUSTRY_KIND[post.industry];
    return <Link key={post.id} href={base + "/posts/" + post.id} className="sn-want-row">
      <div className="sn-path">
        {direct && <><span className="sn-fc sn-fc--sm" data-kind="me" aria-hidden="true">私</span><i aria-hidden="true" /></>}
        <span className="sn-fc sn-fc--sm" data-kind={mine ? "me" : kind} aria-hidden="true">{mine ? "私" : Array.from(authorName.trim()).slice(0, 2).join("")}</span>
        {mine && <span className="sn-path-note">あなたの依頼</span>}
      </div>
      <Due deadline={post.deadline} />
      <p className="sn-want-w">{post.title}</p>
      <div className="sn-want-facts">
        <span><KindIcon kind={kind} />{post.industry}</span><span aria-hidden>·</span><span><MapPin aria-hidden />{areaText(post.areas, 2)}</span>
      </div>
      <p className="sn-want-sub">{mine ? "あなた" : authorName}{author?.company_name ? "・" + author.company_name : ""}　返信 {post.reply_count}件</p>
    </Link>;
  });
}

export function ConstructionEmptyPosts({ base, filtered, reset }: { base: string; filtered?: boolean; reset?: string }) {
  return <div className="sn-empty space-y-3">
    <p>{filtered ? "条件に合う案件はありません" : "まだ案件はありません"}</p>
    <Link className="sn-btn sn-btn--main sn-btn--small" href={filtered ? reset ?? base + "/posts" : base + "/posts/new"}>
      {filtered ? "絞り込みを解除" : "最初の依頼を出す"}
    </Link>
  </div>;
}
