import { ShellC } from "@/components/guild/look/shell-c";
import { PixelIcon } from "@/components/guild/look/pixel-icon";
import { LookIntroButton } from "@/components/guild/look/look-intro-button";
import { getProfile, partyCount, questClearCount } from "@/lib/guild/mock-data";

// 見比べ用なので、ステータスは佐伯さんで固定
export default function LookCStatusPage() {
  const p = getProfile("p-saeki")!;

  const groups: { title: string; items: { label: string; value: string }[]; keywords?: string[] }[] = [
    {
      title: "しごと",
      items: [
        { label: "しごとの内容", value: p.bio },
        { label: "できること", value: p.can_help_with },
      ],
      keywords: p.keywords,
    },
    {
      title: "おもい",
      items: [
        { label: "つよみ", value: p.strengths },
        { label: "だいじにしていること", value: p.values_text },
        { label: "これから", value: p.vision },
      ],
    },
    {
      title: "つながり",
      items: [
        { label: "さがしているもの", value: p.looking_for },
        { label: "であいたい人", value: p.want_to_meet },
      ],
    },
  ];

  return (
    <ShellC active="/guild-look/c/status">
      <div className="space-y-10">
        <section className="c-window p-5 pt-9 sm:p-8 sm:pt-10">
          <span className="c-window-title">ステータス</span>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex size-28 shrink-0 items-center justify-center border-4 border-[#1b2a41] bg-[#1b2a41] shadow-[inset_0_0_0_3px_#fffdf6]">
              <PixelIcon icon={p.job_icon} size={72} color="#e8cf8e" accent="#fffdf6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl tracking-[0.15em]">{p.display_name}</h1>
              <p className="mt-2 text-[15px]">{p.headline}</p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                <dt className="text-[#8f7337]">しょくぎょう</dt>
                <dd>{p.job}</dd>
                <dt className="text-[#8f7337]">ぎょうしゅ</dt>
                <dd>{p.industry}</dd>
                <dt className="text-[#8f7337]">ちいき</dt>
                <dd>{p.region}</dd>
              </dl>
            </div>
          </div>

          {/* 人にレベルは付けない。数えるのは一緒に動いた実績だけ */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t-2 border-dashed border-[#1b2a41]/30 pt-5">
            <div>
              <p className="text-xs text-[#1b2a41]/60">クエストクリア</p>
              <p className="text-3xl">{questClearCount(p.id)}</p>
            </div>
            <div>
              <p className="text-xs text-[#1b2a41]/60">パーティ</p>
              <p className="text-3xl">{partyCount(p.id)}</p>
            </div>
          </div>

          <div className="mt-6">
            <LookIntroButton name={p.display_name} look="a" className="rpg-button w-full text-base sm:w-auto" />
            <p className="mt-2 text-xs leading-relaxed text-[#1b2a41]/60">
              れんらく先は、しょうかいが承諾されたときにだけ見えるようになります。
            </p>
          </div>
        </section>

        <div className="grid gap-10 md:grid-cols-3">
          {groups.map((g) => (
            <section key={g.title} className="c-window p-5 pt-8">
              <span className="c-window-title">{g.title}</span>
              <div className="space-y-3">
                {g.items
                  .filter((it) => it.value)
                  .map((it) => (
                    <div key={it.label}>
                      <p className="text-xs text-[#8f7337]">{it.label}</p>
                      <p className="mt-0.5 text-[15px] leading-relaxed">{it.value}</p>
                    </div>
                  ))}
                {g.keywords && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {g.keywords.map((k) => (
                      <span key={k} className="border-2 border-[#1b2a41] bg-[#f3ecd9] px-2 py-0.5 text-xs">
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
    </ShellC>
  );
}
