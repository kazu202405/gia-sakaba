import type { MetadataRoute } from "next";
import { SNS_BASE, SNS_PWA_ICON, SNS_PWA_NAME } from "@/lib/guild/look/sns-mock";

const manifest: MetadataRoute.Manifest = {
  id: SNS_BASE,
  name: SNS_PWA_NAME,
  short_name: "建設の酒場（モック）",
  start_url: SNS_BASE,
  scope: SNS_BASE,
  display: "standalone",
  icons: [
    { src: SNS_PWA_ICON + "-192.png", sizes: "192x192", type: "image/png" },
    { src: SNS_PWA_ICON + "-512.png", sizes: "512x512", type: "image/png" },
    { src: SNS_PWA_ICON + "-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function GET() {
  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json; charset=utf-8" },
  });
}
