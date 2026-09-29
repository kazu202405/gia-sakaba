import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse(JSON.stringify({
    id: "/guild",
    name: "GIAの酒場",
    short_name: "GIAの酒場",
    description: "仲間を知り、相談を持ち寄り、いっしょに動き出す場所。",
    start_url: "/guild",
    scope: "/guild",
    display: "standalone",
    background_color: "#0b0f1f",
    theme_color: "#1b2a41",
    icons: [
      { src: "/images/sakaba/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/sakaba/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/images/sakaba/app-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }), {
    headers: { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
