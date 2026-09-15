import type { Metadata } from "next";
import Link from "next/link";
import { MemberRow, MoreLink, QuestRow, Window } from "@/components/guild/cards";
import { closedStatuses, introStatusLabel } from "@/lib/guild/labels";
import { ME_ID, getProfile, guild, introRequests, profiles, quests } from "@/lib/guild/mock-data";

// 親レイアウトの「| GIA」を付けない
export const metadata: Metadata = { title: { absolute: "GIAの酒場（見本）" } };

export default function GuildHomePage() {
  const me = getProfile(ME_ID)!;
  const myActive = introRequests.filter((r) => r.requester_id === ME_ID && !closedStatuses.includes(r.status));
  const offers = introRequests.filter((r) => r.target_id === ME_ID && r.status === "proposed");
  const newQuests = quests
    .filter((q) => q.status === "open")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);
  const newMembers = [...profiles]
    .filter((p) => p.id !== ME_ID)
    .sort((a, b) => b.joined_at.localeCompare(a.joined_at))
    .slice(0, 4);

  return (
    <div className="space-y-11">
      {/* うけつけのメッセージ窓 */}
      <Window title="うけつけ">
        <p className="text-[17px] leading-loose">
          おかえりなさい、<span className="inline-block">{me.display_name}さん。</span>
          <br />
          {offers.length > 0 ? (
            <>
              しょうかいの打診が <span className="text-2xl">{offers.length}</span>けん
              <span className="inline-block">とどいています。</span>
            </>
          ) : (
            <>いまは あたらしい しらせは ありません。</>
          )}
        </p>
        <p className="c-muted mt-1 text-sm">
          {guild.name}には いま {profiles.length}人の {guild.terms.member}が います。
        </p>
        {offers.length > 0 && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <Link href="/guild/requests" className="rpg-button text-sm">
              ▶ 見にいく
            </Link>
            <span className="rpg-blink" aria-hidden>
              ▼
            </span>
          </div>
        )}
      </Window>

      <div className="grid gap-11 md:grid-cols-2">
        <Window title="しょうかい いらい" action={<MoreLink href="/guild/requests" />}>
          {myActive.length === 0 ? (
            <p className="c-muted text-sm">すすんでいる いらいは ありません。</p>
          ) : (
            <ul className="space-y-1">
              {myActive.map((r) => {
                const t = getProfile(r.target_id);
                return (
                  <li key={r.id}>
                    <Link href="/guild/requests" className="rpg-cursor-row flex items-center justify-between gap-3 py-1.5 text-[15px]">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="rpg-cursor">▶</span>
                        <span className="truncate">{t?.display_name}さん</span>
                      </span>
                      <span className="c-muted shrink-0 text-xs">{introStatusLabel[r.status].requester}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Window>

        <Window title={`${guild.terms.quest} けいじばん`} action={<MoreLink href="/guild/quests" />}>
          <ul className="space-y-3">
            {newQuests.map((q) => (
              <li key={q.id}>
                <QuestRow quest={q} />
              </li>
            ))}
          </ul>
        </Window>
      </div>

      <Window title={`さかばに来た ${guild.terms.member}`} action={<MoreLink href="/guild/members" />}>
        <ul className="grid gap-4 sm:grid-cols-2">
          {newMembers.map((p) => (
            <li key={p.id}>
              <MemberRow profile={p} />
            </li>
          ))}
        </ul>
      </Window>
    </div>
  );
}
