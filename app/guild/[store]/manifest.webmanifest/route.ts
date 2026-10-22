import { manifestResponse } from "@/lib/guild/manifest";
import { findStore } from "@/lib/guild/stores";

// 店ごとの manifest。ログイン前にも取得されるので、中身は店の公開情報（名前・開始位置・アイコン）だけ
export async function GET(_request: Request, { params }: { params: Promise<{ store: string }> }) {
  const config = findStore((await params).store);
  if (!config) return new Response("Not Found", { status: 404 });
  return manifestResponse(config);
}
