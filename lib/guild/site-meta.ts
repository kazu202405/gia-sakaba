import type { Metadata } from "next";

// 酒場のURLを LINE などで送ったときの見え方（タイトル・説明・画像）。
// app/layout.tsx は GIA本体のHPの文言なので、酒場の画面はここで上書きする（トップと /guild の両方が使う）。
export const GUILD_SITE_URL = "https://guild.gia2018.com";
export const GUILD_SHARE_TITLE = "GIAの酒場";
export const GUILD_SHARE_DESCRIPTION = "仕事の話が、次の一歩になる場所。仲間・クエスト・プロジェクトをひとつの酒場に。";
const GUILD_SHARE_IMAGE = { url: "/images/sakaba/og-guild.png", width: 1200, height: 630, alt: "GIAの酒場" };

export const guildShareMetadata: Pick<Metadata, "openGraph" | "twitter"> = {
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: GUILD_SHARE_TITLE,
    title: GUILD_SHARE_TITLE,
    description: GUILD_SHARE_DESCRIPTION,
    url: `${GUILD_SITE_URL}/`,
    images: [GUILD_SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: GUILD_SHARE_TITLE,
    description: GUILD_SHARE_DESCRIPTION,
    images: [GUILD_SHARE_IMAGE.url],
  },
};
