// 名刺の署名URLをサーバーで作る（見る人の権限で作るので、見られない画像のURLは作られない）。

import type { SupabaseClient } from "@supabase/supabase-js";
import { BUSINESS_CARD_BUCKET, BUSINESS_CARD_URL_TTL } from "./business-card";
import { WORK_PHOTO_BUCKET } from "./store-profile";

/** 保存場所の名前 → 署名URL。作れなかったものは入らない */
export async function signBusinessCards(supabase: SupabaseClient, paths: (string | null | undefined)[], ttlSeconds: number = BUSINESS_CARD_URL_TTL): Promise<Record<string, string>> {
  return signStorageObjects(supabase, BUSINESS_CARD_BUCKET, paths, ttlSeconds);
}

/** 伝えたいことの写真の署名URL（見る人の権限で作るので、その店の会員でなければ作られない） */
export async function signWorkPhotos(supabase: SupabaseClient, paths: (string | null | undefined)[], ttlSeconds: number = BUSINESS_CARD_URL_TTL): Promise<Record<string, string>> {
  return signStorageObjects(supabase, WORK_PHOTO_BUCKET, paths, ttlSeconds);
}

async function signStorageObjects(supabase: SupabaseClient, bucket: string, paths: (string | null | undefined)[], ttlSeconds: number): Promise<Record<string, string>> {
  const wanted = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (wanted.length === 0) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(wanted, ttlSeconds);
  if (error || !data) return {};
  const urls: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl && !item.error) urls[item.path] = item.signedUrl;
  return urls;
}
