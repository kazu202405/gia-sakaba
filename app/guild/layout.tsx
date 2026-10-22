import type { Metadata } from "next";
import { GUILD_SHARE_DESCRIPTION, GUILD_SITE_URL, guildShareMetadata } from "@/lib/guild/site-meta";
import "@/components/guild/guild-theme.css";
import { outsideStorePath } from "@/lib/guild/store-path";

export const metadata: Metadata = {
  // absolute にしないと、親（app/layout.tsx）の「| GIA」が後ろに付く
  title: { absolute: "GIAの酒場", template: "%s | GIAの酒場" },
  // 無いと親（app/layout.tsx）のGIA本体HPの説明・画像が、送ったURLの見え方に出る
  metadataBase: new URL(GUILD_SITE_URL),
  description: GUILD_SHARE_DESCRIPTION,
  ...guildShareMetadata,
  manifest: outsideStorePath("manifest.webmanifest"),
  icons: {
    icon: [
      { url: "/images/sakaba/guild-icon-20260929-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/sakaba/guild-icon-20260929-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/images/sakaba/guild-icon-20260929-192.png"],
    apple: [{ url: "/images/sakaba/guild-icon-20260929-apple-touch.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "GIAの酒場", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

// 店に属する画面の外枠（ナビ・ログイン判定）は app/guild/[store]/layout.tsx。ここは店に属さない画面
// （ログイン・パスワード再設定・入会・アンケート）も含めた /guild 全体の、既定（GIAの酒場）の題名と見え方だけを持つ。
export default function GuildRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
