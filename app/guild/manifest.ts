import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/guild",
    name: "GIAの酒場",
    short_name: "GIAの酒場",
    description: "仲間を知り、相談を持ち寄り、いっしょに動き出す場所。",
    start_url: "/guild",
    scope: "/guild",
    display: "standalone",
    background_color: "#f8f4e8",
    theme_color: "#1b2a41",
    icons: [{ src: "/gia-logo.png", sizes: "500x500", type: "image/png", purpose: "any" }],
  };
}
