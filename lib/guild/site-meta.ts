import type { Metadata } from "next";
import { guildPath } from "./store-path";
import { DEFAULT_STORE_SLUG, STORES, type StoreConfig } from "./stores";

// 酒場のURLを LINE などで送ったときの見え方（タイトル・説明・画像）。
// app/layout.tsx は GIA本体のHPの文言なので、酒場の画面はここで上書きする（トップと /guild の両方が使う）。
export const GUILD_SITE_URL = "https://guild.gia2018.com";
export const GUILD_SHARE_TITLE = STORES[DEFAULT_STORE_SLUG].name;
export const GUILD_SHARE_DESCRIPTION = STORES[DEFAULT_STORE_SLUG].description;
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

/** 店ごとの、URLを送ったときの見え方。画像は共通（店ごとの画像は未作成） */
export function storeShareMetadata(store: StoreConfig): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      locale: "ja_JP",
      siteName: store.name,
      title: store.name,
      description: store.description,
      url: `${GUILD_SITE_URL}${guildPath(store.slug)}`,
      images: [{ ...GUILD_SHARE_IMAGE, alt: store.name }],
    },
    twitter: { card: "summary_large_image", title: store.name, description: store.description, images: [GUILD_SHARE_IMAGE.url] },
  };
}
