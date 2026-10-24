// メンバーのステータス画面：その人の名刺の表と裏（会員だけが見られる）。押すと大きく開く。

import { StoreLink } from "@/components/guild/store-link";
import type { BusinessCard } from "@/lib/guild/business-card";
import { currentStore } from "@/lib/guild/current-store";
import { Window } from "./cards";

export async function BusinessCardView({ card, urls, isMe, footnote }: { card: BusinessCard | null; urls: Record<string, string>; isMe: boolean; footnote?: string }) {
  const store = await currentStore();
  footnote ??= store.w("card.footnote");
  const sides = ([["front", "表"], ["back", "裏"]] as const)
    .map(([side, label]) => ({ label, path: card?.[side] ?? null }))
    .filter((item) => item.path);
  if (sides.length === 0) {
    if (!isMe) return null;
    return <Window title="名刺">
      <p className="c-muted text-sm">名刺はまだ登録されていません。<StoreLink to="/me/status" className="ml-2 underline underline-offset-4">▶ 名刺を登録する</StoreLink></p>
    </Window>;
  }
  return <Window title="名刺">
    <div className="grid gap-4 sm:grid-cols-2">
      {sides.map(({ label, path }) => {
        const url = path ? urls[path] : undefined;
        return <div key={label}>
          <p className="c-label text-base">{label}</p>
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="c-card mt-1 block aspect-[91/55] overflow-hidden" aria-label={`名刺の${label}を大きく見る`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 期限つきの署名URLの画像なので next/image を通さない */}
              <img src={url} alt={`名刺の${label}`} className="h-full w-full object-contain" />
            </a>
          ) : <p className="c-card mt-1 flex aspect-[91/55] items-center justify-center text-xs">画像を読み込めませんでした</p>}
        </div>;
      })}
    </div>
    <p className="c-muted mt-3 text-xs">{footnote}</p>
  </Window>;
}
