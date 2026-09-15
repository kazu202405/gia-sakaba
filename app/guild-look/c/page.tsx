import Link from "next/link";
import { ShellC } from "@/components/guild/look/shell-c";
import { PixelIcon } from "@/components/guild/look/pixel-icon";
import { closedStatuses, introStatusLabel, questCategoryLabel } from "@/lib/guild/labels";
import { ME_ID, getProfile, introRequests, profiles, quests } from "@/lib/guild/mock-data";

export default function LookCHomePage() {
  const me = getProfile(ME_ID)!;
  const offers = introRequests.filter((r) => r.target_id === ME_ID && r.status === "proposed");
  const myActive = introRequests.filter((r) => r.requester_id === ME_ID && !closedStatuses.includes(r.status));
  const newQuests = quests.filter((q) => q.status === "open").slice(0, 3);
  const newMembers = profiles.filter((p) => p.id !== ME_ID).slice(-4).reverse();

  return (
    <ShellC active="/guild-look/c">
      <div className="space-y-10">
        {/* うけつけのメッセージ窓 */}
        <section className="c-window p-5 pt-8 sm:p-7 sm:pt-9">
          <span className="c-window-title">うけつけ</span>
          <p className="text-[17px] leading-loose">
            おかえりなさい、<span className="inline-block">{me.display_name}さん。</span>
            <br />
            しょうかいの打診が <span className="text-2xl text-[#b3261e]">{offers.length}</span>けん
            <span className="inline-block">とどいています。</span>
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Link href="/guild/requests" className="rpg-button text-sm">
              ▶ 見にいく
            </Link>
            <span className="rpg-blink text-[#1b2a41]" aria-hidden>
              ▼
            </span>
          </div>
        </section>

        <div className="grid gap-10 md:grid-cols-2">
          <section className="c-window p-5 pt-8">
            <span className="c-window-title">しょうかい いらい</span>
            <ul className="space-y-1">
              {myActive.map((r) => {
                const t = getProfile(r.target_id);
                return (
                  <li key={r.id}>
                    <Link href="/guild/requests" className="rpg-cursor-row flex items-center justify-between gap-3 py-1.5 text-[15px]">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="rpg-cursor text-[#b3261e]">▶</span>
                        <span className="truncate">{t?.display_name}さん</span>
                      </span>
                      <span className="shrink-0 text-xs text-[#1b2a41]/60">{introStatusLabel[r.status].requester}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="c-window p-5 pt-8">
            <span className="c-window-title">クエスト けいじばん</span>
            <ul className="space-y-3">
              {newQuests.map((q) => (
                <li key={q.id}>
                  <Link href={`/guild/quests/${q.id}`} className="rpg-cursor-row block">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="rpg-cursor text-[#b3261e]">▶</span>
                      <span className="text-[#8f7337]">{questCategoryLabel[q.category]}</span>
                      {q.is_urgent && <span className="bg-red-600 px-1.5 text-white">急ぎ</span>}
                    </span>
                    <span className="mt-0.5 block pl-4 text-[15px] leading-snug">{q.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="c-window p-5 pt-8">
          <span className="c-window-title">さかばに来た なかま</span>
          <ul className="grid gap-4 sm:grid-cols-2">
            {newMembers.map((p) => (
              <li key={p.id}>
                <Link href="/guild-look/c/status" className="rpg-cursor-row flex items-center gap-2">
                  <span className="rpg-cursor text-[#b3261e]">▶</span>
                  <span className="flex size-14 shrink-0 items-center justify-center border-3 border-[#1b2a41] bg-[#1b2a41]">
                    <PixelIcon icon={p.job_icon} size={36} color="#e8cf8e" accent="#fffdf6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base tracking-wider">{p.display_name}</span>
                    <span className="block text-xs text-[#1b2a41]/60">
                      {p.job}・{p.region}
                    </span>
                    <span className="block truncate text-xs">{p.headline}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ShellC>
  );
}
