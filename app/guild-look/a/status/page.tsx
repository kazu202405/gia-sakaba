import { ShellA } from "@/components/guild/look/shell-a";
import { PixelIcon } from "@/components/guild/look/pixel-icon";
import { LookIntroButton } from "@/components/guild/look/look-intro-button";
import { groupLabel } from "@/lib/guild/labels";
import { getProfile, partyCount, questClearCount } from "@/lib/guild/mock-data";
import type { VisibleGroup } from "@/lib/guild/types";
import { cn } from "@/lib/utils";

const PX = "font-[family-name:var(--font-pixel-jp)]";

// 見比べ用なので、ステータスは佐伯さんで固定
export default function LookAStatusPage() {
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
    <ShellA active="/guild-look/a/status">
      <div className="space-y-10">
        <section className="rpg-window p-5 pt-8 sm:p-8 sm:pt-9">
          <span className={cn(PX, "rpg-window-title")}>ステータス</span>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex size-28 shrink-0 items-center justify-center border-4 border-[#f4f1e8] bg-[#050a18]">
              <PixelIcon icon={p.job_icon} size={72} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className={cn(PX, "text-3xl tracking-widest")}>{p.display_name}</h1>
              <p className="mt-2 text-sm text-[#f4f1e8]/85">{p.headline}</p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className={cn(PX, "text-[#c8a55a]")}>職業</dt>
                <dd>{p.job}</dd>
                <dt className={cn(PX, "text-[#c8a55a]")}>業種</dt>
                <dd>{p.industry}</dd>
                <dt className={cn(PX, "text-[#c8a55a]")}>地域</dt>
                <dd>{p.region}</dd>
              </dl>
            </div>
          </div>

          {/* 人にレベルは付けない。数えるのは一緒に動いた実績だけ */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t-2 border-dashed border-[#f4f1e8]/30 pt-5">
            <div>
              <p className={cn(PX, "text-xs text-[#f4f1e8]/70")}>クエストクリア</p>
              <p className={cn(PX, "text-3xl")}>{questClearCount(p.id)}</p>
            </div>
            <div>
              <p className={cn(PX, "text-xs text-[#f4f1e8]/70")}>パーティ</p>
              <p className={cn(PX, "text-3xl")}>{partyCount(p.id)}</p>
            </div>
          </div>

          <div className="mt-6">
            <LookIntroButton name={p.display_name} look="a" className={cn(PX, "rpg-button w-full text-base sm:w-auto")} />
            <p className="mt-2 text-xs text-[#f4f1e8]/60">連絡先は、紹介が承諾されたときにだけ見えるようになります。</p>
          </div>
        </section>

        <div className="grid gap-10 md:grid-cols-3">
          {groups.map((g) => (
            <section key={g.key} className="rpg-window p-5 pt-7">
              <span className={cn(PX, "rpg-window-title")}>{groupLabel[g.key].title}</span>
              <div className="space-y-3">
                {g.items
                  .filter((it) => it.value)
                  .map((it) => (
                    <div key={it.label}>
                      <p className={cn(PX, "text-xs text-[#c8a55a]")}>{it.label}</p>
                      <p className="mt-0.5 text-sm leading-relaxed">{it.value}</p>
                    </div>
                  ))}
                {g.key === "work" && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.keywords.map((k) => (
                      <span key={k} className="border border-[#f4f1e8]/40 px-2 py-0.5 text-[11px]">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </ShellA>
  );
}
