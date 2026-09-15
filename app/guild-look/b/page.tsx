import Link from "next/link";
import { ShellB } from "@/components/guild/look/shell-b";
import { PixelIcon } from "@/components/guild/look/pixel-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/8bit/card";
import { Badge } from "@/components/ui/8bit/badge";
import { Button } from "@/components/ui/8bit/button";
import { closedStatuses, introStatusLabel, questCategoryLabel } from "@/lib/guild/labels";
import { ME_ID, getProfile, introRequests, profiles, quests } from "@/lib/guild/mock-data";

export default function LookBHomePage() {
  const me = getProfile(ME_ID)!;
  const offers = introRequests.filter((r) => r.target_id === ME_ID && r.status === "proposed");
  const myActive = introRequests.filter((r) => r.requester_id === ME_ID && !closedStatuses.includes(r.status));
  const newQuests = quests.filter((q) => q.status === "open").slice(0, 3);
  const newMembers = profiles.filter((p) => p.id !== ME_ID).slice(-4).reverse();

  return (
    <ShellB active="/guild-look/b">
      <div className="space-y-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-[#2b5f3a]">うけつけ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-base leading-loose">
              おかえりなさい、<span className="inline-block">{me.display_name}さん。</span>
              <br />
              紹介の打診が {offers.length}件 届いています。
            </p>
            <Button asChild className="text-xs">
              <Link href="/guild/requests">▶ 見にいく</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-10 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs">紹介依頼</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {myActive.map((r) => {
                  const t = getProfile(r.target_id);
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">{t?.display_name}さん</span>
                      <span className="shrink-0 text-[11px] text-neutral-500">{introStatusLabel[r.status].requester}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xs">クエスト</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {newQuests.map((q) => (
                  <li key={q.id}>
                    <Link href={`/guild/quests/${q.id}`} className="block hover:underline">
                      <span className="flex flex-wrap items-center gap-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {questCategoryLabel[q.category]}
                        </Badge>
                        {q.is_urgent && (
                          <Badge variant="destructive" className="text-[10px]">
                            急ぎ
                          </Badge>
                        )}
                      </span>
                      <span className="mt-2 block text-sm leading-snug">{q.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs">あたらしい仲間</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-5 sm:grid-cols-2">
              {newMembers.map((p) => (
                <li key={p.id}>
                  <Link href="/guild-look/b/status" className="flex items-center gap-3 hover:underline">
                    <span className="flex size-14 shrink-0 items-center justify-center border-4 border-neutral-900 bg-[#2b5f3a]">
                      <PixelIcon icon={p.job_icon} size={36} color="#ffe08a" accent="#ffffff" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm">{p.display_name}</span>
                      <span className="block text-[11px] text-neutral-500">
                        {p.job}・{p.region}
                      </span>
                      <span className="block truncate text-[11px]">{p.headline}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </ShellB>
  );
}
