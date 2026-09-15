import { ShellB } from "@/components/guild/look/shell-b";
import { PixelIcon } from "@/components/guild/look/pixel-icon";
import { LookIntroButton } from "@/components/guild/look/look-intro-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/8bit/card";
import { Badge } from "@/components/ui/8bit/badge";
import { groupLabel } from "@/lib/guild/labels";
import { getProfile, partyCount, questClearCount } from "@/lib/guild/mock-data";
import type { VisibleGroup } from "@/lib/guild/types";

// 見比べ用なので、ステータスは佐伯さんで固定
export default function LookBStatusPage() {
  const p = getProfile("p-saeki")!;

  const groups: { key: VisibleGroup; items: { label: string; value: string }[] }[] = [
    {
      key: "work",
      items: [
        { label: "仕事内容", value: p.bio },
        { label: "できること", value: p.can_help_with },
      ],
    },
    {
      key: "values",
      items: [
        { label: "強み", value: p.strengths },
        { label: "大事にしていること", value: p.values_text },
        { label: "これから", value: p.vision },
      ],
    },
    {
      key: "connect",
      items: [
        { label: "探しているもの", value: p.looking_for },
        { label: "出会いたい人", value: p.want_to_meet },
      ],
    },
  ];

  return (
    <ShellB active="/guild-look/b/status">
      <div className="space-y-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-[#2b5f3a]">ステータス</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex size-28 shrink-0 items-center justify-center border-6 border-neutral-900 bg-[#2b5f3a]">
                <PixelIcon icon={p.job_icon} size={72} color="#ffe08a" accent="#ffffff" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl tracking-widest">{p.display_name}</h1>
                <p className="mt-2 text-sm">{p.headline}</p>
                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                  <dt className="text-[#2b5f3a]">しょくぎょう</dt>
                  <dd>{p.job}</dd>
                  <dt className="text-[#2b5f3a]">ぎょうしゅ</dt>
                  <dd>{p.industry}</dd>
                  <dt className="text-[#2b5f3a]">ちいき</dt>
                  <dd>{p.region}</dd>
                </dl>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t-4 border-dashed border-neutral-900/30 pt-5">
              <div>
                <p className="text-[10px] text-neutral-500">クエストクリア</p>
                <p className="text-2xl">{questClearCount(p.id)}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500">パーティ</p>
                <p className="text-2xl">{partyCount(p.id)}</p>
              </div>
            </div>

            <div className="mt-6">
              {/* 左右のドット枠が外にはみ出すので、その分だけ内側に寄せる */}
              <div className="px-1.5">
                <LookIntroButton name={p.display_name} look="b" className="w-full sm:w-auto" />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
                連絡先は、紹介が承諾されたときにだけ見えるようになります。
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-10 md:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.key}>
              <CardHeader>
                <CardTitle className="text-xs">{groupLabel[g.key].title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {g.items
                  .filter((it) => it.value)
                  .map((it) => (
                    <div key={it.label}>
                      <p className="text-[10px] text-[#2b5f3a]">{it.label}</p>
                      <p className="mt-1 text-sm leading-relaxed">{it.value}</p>
                    </div>
                  ))}
                {g.key === "work" && (
                  <div className="flex flex-wrap gap-4 pt-1 pl-1.5">
                    {p.keywords.map((k) => (
                      <Badge key={k} variant="outline" className="text-[10px]">
                        {k}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ShellB>
  );
}
