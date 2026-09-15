import type { MetadataRoute } from "next";

// 酒場は見本（mock）の間、検索に出さない。
// 公開するときに allow を /guild に変え、酒場用の sitemap を用意する。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
  };
}
