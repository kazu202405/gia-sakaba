import type { Metadata } from "next";
import { GuildShell } from "@/components/guild/guild-shell";
import "@/components/guild/guild-theme.css";

// 見本（mock）の間は検索に出さない
export const metadata: Metadata = {
  // absolute にしないと、親（app/layout.tsx）の「| GIA」が後ろに付く
  title: { absolute: "GIAの酒場（見本）", template: "%s | GIAの酒場" },
  robots: { index: false, follow: false },
};

export default function GuildLayout({ children }: { children: React.ReactNode }) {
  return <GuildShell>{children}</GuildShell>;
}
