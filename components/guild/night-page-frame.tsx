import { GuildSceneArt } from "@/components/guild/guild-scene-art";
import { storeThemeAttrs, type StoreConfig } from "@/lib/guild/stores";
import "@/components/guild/guild-theme.css";

// 酒場の外（ログインなしで開く /p /i /e など）の画面の外枠。夜の酒場の絵を敷き、窓を紺に反転する。
// 外側を .guild-scene、中身を main にすると、部品に直接書かれた色の入れ替え（guild-theme.css の .guild-scene main ...）も
// 酒場の中の画面と同じく効く。.guild-theme だけだと昔の明るい帳面になるので、新しい公開ページはこの枠を使うこと
// （見張り：lib/guild/night-frame-guard.test.ts）。
export function NightPageFrame({ children }: { children: React.ReactNode }) {
  return <div className="guild-theme guild-scene min-h-screen">
    <GuildSceneArt art="tavern" dim />
    <main className="relative min-h-screen px-4 py-8 pb-16 sm:px-6 sm:py-12">{children}</main>
  </div>;
}

// 店が決まる公開ページ（/p の共有URLなど）の外枠。酒場の見た目の店は NightPageFrame、
// 落ち着いた見た目の店（theme=plain）は、店の色（data-store）の白い地に、絵を敷かずに出す。
export function StorePageFrame({ config, children }: { config: StoreConfig; children: React.ReactNode }) {
  if (config.theme === "tavern") return <NightPageFrame>{children}</NightPageFrame>;
  return <div {...storeThemeAttrs(config)} className="guild-theme min-h-screen">
    <main className="relative min-h-screen px-4 py-8 pb-16 sm:px-6 sm:py-12">{children}</main>
  </div>;
}
