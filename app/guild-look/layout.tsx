import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "@/components/guild/guild-theme.css";
import "@/components/guild/look/look.css";

// 見た目の見比べ用（A・B・C）。検索に出さない
export const metadata: Metadata = {
  title: { absolute: "GIAの酒場 見た目の見比べ" },
  robots: { index: false, follow: false },
};

// 日本語のドット文字（--font-pixel-jp）は app/layout.tsx で読み込んでいる。英字のドット文字はB案だけで使う
const pixelEn = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel-en" });

export default function GuildLookLayout({ children }: { children: React.ReactNode }) {
  return <div className={pixelEn.variable}>{children}</div>;
}
