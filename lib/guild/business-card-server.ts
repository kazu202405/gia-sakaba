// 名刺の署名URLをサーバーで作る（見る人の権限で作るので、見られない画像のURLは作られない）。

import type { SupabaseClient } from "@supabase/supabase-js";
import { BUSINESS_CARD_BUCKET, BUSINESS_CARD_URL_TTL } from "./business-card";

/** 保存場所の名前 → 署名URL。作れなかったものは入らない */
export async function signBusinessCards(supabase: SupabaseClient, paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const wanted = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (wanted.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUSINESS_CARD_BUCKET).createSignedUrls(wanted, BUSINESS_CARD_URL_TTL);
  if (error || !data) return {};
  const urls: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl && !item.error) urls[item.path] = item.signedUrl;
  return urls;
}
