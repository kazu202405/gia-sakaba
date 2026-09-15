import Link from "next/link";
import { ShellA } from "@/components/guild/look/shell-a";
import { PixelIcon } from "@/components/guild/look/pixel-icon";
import { closedStatuses, introStatusLabel, questCategoryLabel } from "@/lib/guild/labels";
import { ME_ID, getProfile, introRequests, profiles, quests } from "@/lib/guild/mock-data";
import { cn } from "@/lib/utils";

const PX = "font-[family-name:var(--font-pixel-jp)]";

export default function LookAHomePage() {
  const me = getProfile(ME_ID)!;
  const offers = introRequests.filter((r) => r.target_id === ME_ID && r.status === "proposed");
  const myActive = introRequests.filter((r) => r.requester_id === ME_ID && !closedStatuses.includes(r.status));
  const newQuests = quests.filter((q) => q.status === "open").slice(0, 3);
  const newMembers = profiles.filter((p) => p.id !== ME_ID).slice(-4).reverse();

  return (
    <ShellA active="/guild-look/a">
      <div className="space-y-10">
        {/* 受付のメッセージ窓 */}
        <section className="rpg-window p-5 pt-7 sm:p-7 sm:pt-8">
          <span className={cn(PX, "rpg-window-title")}>受付</span>
          <p className="text-[17px] leading-loose">
            おかえりなさい、<span className="inline-block">{me.display_name}さん。</span>
            <br />
            紹介の打診が <span className={cn(PX, "text-xl text-[#c8a55a]")}>{offers.length}</span> 件 届いています。
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Link href="/guild/requests" className={cn(PX, "rpg-button text-sm")}>
              ▶ 見にいく
            </Link>
            <span className="rpg-blink text-[#c8a55a]" aria-hidden>
              ▼
            </span>
          </div>
        </section>

        <div className="grid gap-10 md:grid-cols-2">
          <section className="rpg-window p-5 pt-7">
            <span className={cn(PX, "rpg-window-title")}>紹介依頼</span>
            <ul className="space-y-1">
              {myActive.map((r) => {
                const t = getProfile(r.target_id);
                return (
                  <li key={r.id} className="rpg-cursor-row flex items-center justify-between gap-3 py-1.5 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="rpg-cursor text-[#c8a55a]">▶</span>
                      <span className="truncate">{t?.display_name}さん</span>
                    </span>
                    <span className="shrink-0 text-xs text-[#f4f1e8]/60">{introStatusLabel[r.status].requester}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rpg-window p-5 pt-7">
            <span className={cn(PX, "rpg-window-title")}>クエスト掲示板</span>
            <ul className="space-y-3">
              {newQuests.map((q) => (
                <li key={q.id}>
                  <Link href={`/guild/quests/${q.id}`} className="rpg-cursor-row block">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <span className="rpg-cursor text-[#c8a55a]">▶</span>
                      <span className={cn(PX, "text-[#c8a55a]")}>{questCategoryLabel[q.category]}</span>
                      {q.is_urgent && <span className={cn(PX, "bg-red-600 px-1.5 text-white")}>急ぎ</span>}
                    </span>
                    <span className="mt-0.5 block pl-4 text-sm leading-snug">{q.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="rpg-window p-5 pt-7">
          <span className={cn(PX, "rpg-window-title")}>酒場に来た仲間</span>
          <ul className="grid gap-4 sm:grid-cols-2">
            {newMembers.map((p) => (
              <li key={p.id}>
                <Link href="/guild-look/a/status" className="rpg-cursor-row flex items-center gap-3">
                  <span className="flex size-14 shrink-0 items-center justify-center border-2 border-[#f4f1e8] bg-[#050a18]">
                    <PixelIcon icon={p.job_icon} size={36} />
                  </span>
                  <span className="min-w-0">
                    <span className={cn(PX, "block text-[15px] tracking-wider")}>
                      {p.display_name}
                    </span>
                    <span className="block text-xs text-[#f4f1e8]/60">
                      {p.job}・{p.region}
                    </span>
                    <span className="block truncate text-xs text-[#f4f1e8]/80">{p.headline}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ShellA>
  );
}
