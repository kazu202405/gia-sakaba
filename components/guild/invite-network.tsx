import Link from "next/link";
import type { GuildInviteNetworkMember } from "@/lib/guild/server-data";
import { formatDate } from "@/lib/guild/labels";
import { Window } from "./cards";

function Branch({ person, childrenByInviter, path }: {
  person: GuildInviteNetworkMember;
  childrenByInviter: Map<string, GuildInviteNetworkMember[]>;
  path: Set<string>;
}) {
  const nextPath = new Set(path);
  nextPath.add(person.user_id);
  const children = (childrenByInviter.get(person.user_id) ?? []).filter((child) => !nextPath.has(child.user_id));
  return <li>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <Link href={`/guild/members/${person.user_id}`} className="underline underline-offset-4">{person.display_name}</Link>
      {person.role === "owner" && <span className="c-chip text-[10px]">オーナー</span>}
      {person.role === "master" && <span className="c-chip text-[10px]">マスター</span>}
      <span className="c-muted text-xs">{formatDate(person.joined_at)} 入会{person.suspended ? "・停止中" : ""}</span>
      {children.length > 0 && <span className="c-muted text-xs">→ {children.length}人を招待</span>}
    </div>
    {children.length > 0 && <ul className="ml-3 border-l-2 border-dashed border-[#1b2a41]/25 pl-4 sm:ml-5 sm:pl-5">
      {children.map((child) => <Branch key={child.user_id} person={child} childrenByInviter={childrenByInviter} path={nextPath} />)}
    </ul>}
  </li>;
}

export function InviteNetwork({ members }: { members: GuildInviteNetworkMember[] }) {
  const byId = new Map(members.map((person) => [person.user_id, person]));
  const childrenByInviter = new Map<string, GuildInviteNetworkMember[]>();
  const roots: GuildInviteNetworkMember[] = [];
  for (const person of members) {
    const parentId = person.invited_by_user_id;
    if (!parentId || parentId === person.user_id || !byId.has(parentId)) {
      roots.push(person);
    } else {
      const children = childrenByInviter.get(parentId) ?? [];
      children.push(person);
      childrenByInviter.set(parentId, children);
    }
  }
  return <Window title="招待のつながり" action={<span className="c-muted text-xs">入会 {members.length}人</span>}>
    <p className="c-muted mb-4 text-sm leading-relaxed">誰から招待され、そこから誰へ広がったかを表示します。これは酒場への入会経路で、仕事の紹介依頼とは別の記録です。</p>
    {members.length === 0 ? <p className="c-muted text-sm">入会した人はまだいません。</p> :
      <ul className="space-y-2">{roots.map((person) => <Branch key={person.user_id} person={person} childrenByInviter={childrenByInviter} path={new Set()} />)}</ul>}
  </Window>;
}
