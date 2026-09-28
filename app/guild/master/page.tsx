import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/guild/cards";
import { LiveGatheringApprovals } from "@/components/guild/live-gathering-approvals";
import { LiveMasterInvites } from "@/components/guild/live-master-invites";
import { LivePreparedInvites } from "@/components/guild/live-prepared-invites";
import { InviteNetwork } from "@/components/guild/invite-network";
import { listMealWishes } from "@/lib/guild/meal-wishes-server";
import { listMealAvailability } from "@/lib/guild/meal-availability-server";
import { formatScheduleShort, toJstInputValue } from "@/lib/guild/gathering-schedule";
import { getGuildContext, listGuildInviteNetwork, listGuildMasterInvites, listPendingGatheringApplications, listPreparedInvites } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "管理者" };

export default async function MasterPage() {
  const context = await getGuildContext();
  if (context.membership.role !== "owner" && context.membership.role !== "master") notFound();
  const preparedEnabled = process.env.SAKABA_PREJOIN_ENABLED === "true";
  const [pendingGatherings, invites, network, preparedInvites] = await Promise.all([
    listPendingGatheringApplications(), listGuildMasterInvites(), listGuildInviteNetwork(),
    preparedEnabled ? listPreparedInvites() : Promise.resolve([]),
  ]);
  const diningEnabled = process.env.SAKABA_880_ENABLED === "true";
  const mealWishes = diningEnabled ? await listMealWishes(context.guild.id) : [];
  const availability = diningEnabled && process.env.SAKABA_AVAILABILITY_ENABLED === "true"
    ? await listMealAvailability(context.guild.id) : [];
  const memberNames = new Map(network.map((person) => [person.user_id, person.display_name]));
  const mealUserIds = [...new Set([...mealWishes.map((wish) => wish.user_id), ...availability.map((slot) => slot.user_id)])];
  const preparedIds = new Set(preparedInvites.map((invite) => invite.id));
  return (
    <div className="space-y-9">
      <PageTitle
        title="管理者"
        lead="限定の集まり、メンバーの招待、酒場への参加のつながりを管理します。"
      />
      <nav aria-label="管理項目" className="c-window p-4 pt-7 sm:p-5 sm:pt-8">
        <span className="c-window-title">管理コマンド</span>
        <ul className="grid gap-x-8 text-sm sm:grid-cols-2">
          <li className="border-b border-[#1b2a41]/20">
            <a href="#master-gatherings-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              限定の集まり
            </a>
          </li>
          {diningEnabled && <li className="border-b border-[#1b2a41]/20">
            <a href="#master-meal-wishes-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              会食の希望
            </a>
          </li>}
          <li className="border-b border-[#1b2a41]/20">
            <a href="#master-invites-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              招待リンク
            </a>
          </li>
          {preparedEnabled && <li className="border-b border-[#1b2a41]/20">
            <a href="#master-prepared-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              メンバーの仮登録
            </a>
          </li>}
          <li className="border-b border-[#1b2a41]/20">
            <a href="#master-network-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              招待のつながり
            </a>
          </li>
          <li className="border-b border-[#1b2a41]/20">
            <Link href="/guild/join?preview=1" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              入会フォームを見る
            </Link>
          </li>
        </ul>
      </nav>
      <section aria-labelledby="master-gatherings-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="master-gatherings-title" className="text-xl tracking-wider">限定の集まり</h2>
          <Link href="/guild/master/gathering/new" className="rpg-button inline-flex h-11 items-center px-5 text-sm">▶ 集まりを開く</Link>
        </div>
        <LiveGatheringApprovals initial={pendingGatherings} />
      </section>
      {diningEnabled && <section aria-labelledby="master-meal-wishes-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-meal-wishes-title" className="text-xl tracking-wider">会食の希望{process.env.SAKABA_AVAILABILITY_ENABLED === "true" ? "・空き日時" : ""}</h2>
        <p className="c-muted text-sm">会食プラン相当の利用者から届いた内容です。ほかの会員には見えません。会食の開催・成立を約束するものではありません。</p>
        {mealUserIds.length === 0 ? <p className="c-card p-5 text-sm">まだ希望は届いていません。</p> : <div className="grid gap-4 md:grid-cols-2">
          {mealUserIds.map((userId) => {
            const wish = mealWishes.find((item) => item.user_id === userId);
            const slots = availability.filter((item) => item.user_id === userId);
            return <article key={userId} className="c-card min-w-0 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><Link href={`/guild/members/${userId}`} className="underline underline-offset-4">{memberNames.get(userId) ?? "メンバー"}</Link>{wish && <time className="c-muted text-xs" dateTime={wish.updated_at}>{new Date(wish.updated_at).toLocaleDateString("ja-JP")}</time>}</div>
              {wish ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{wish.wish_text}</p> : <p className="c-muted mt-3 text-xs">希望文は未登録です。</p>}
              {process.env.SAKABA_AVAILABILITY_ENABLED === "true" && <div className="c-dashed-top mt-4 pt-3">
                <p className="c-muted mb-2 text-xs">空き日時</p>
                {slots.length === 0 ? <p className="c-muted text-xs">未登録</p> : <ul className="space-y-2 text-xs">{slots.map((slot) => <li key={slot.id}><span className="tabular-nums">{formatScheduleShort(slot.starts_at)} ～ {toJstInputValue(slot.ends_at).slice(11)}</span>{slot.note && <span className="c-muted ml-2 break-words">{slot.note}</span>}</li>)}</ul>}
              </div>}
            </article>;
          })}
        </div>}
      </section>}
      <section aria-labelledby="master-invites-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-invites-title" className="text-xl tracking-wider">招待リンク</h2>
        <LiveMasterInvites initial={invites.filter((invite) => !preparedIds.has(invite.id))} excludedIds={[...preparedIds]} />
      </section>
      {preparedEnabled && <section aria-labelledby="master-prepared-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-prepared-title" className="text-xl tracking-wider">メンバーの仮登録</h2>
        <LivePreparedInvites initial={preparedInvites} />
      </section>}
      <section aria-labelledby="master-network-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-network-title" className="text-xl tracking-wider">招待のつながり</h2>
        <InviteNetwork members={network} />
      </section>
    </div>
  );
}
