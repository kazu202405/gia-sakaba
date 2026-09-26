// 名刺の表裏（0107）。画像は鍵付きの保存場所に置き、見るときは期限つきのURL（署名URL）を作る。
// 見られるのは同じギルドの在籍中の会員だけ（DBと保存場所の決まりで守る）。

export const BUSINESS_CARD_BUCKET = "sakaba-business-cards";
/** 署名URLの有効期限（秒）。画面を開いている間だけ使えればよい */
export const BUSINESS_CARD_URL_TTL = 60 * 60;
/** 元の画像の上限（縮める前）。縮めたあとは数百KBになる */
export const BUSINESS_CARD_SOURCE_LIMIT = 20 * 1024 * 1024;

export type BusinessCardSide = "front" | "back";

export type BusinessCard = {
  front: string | null;
  back: string | null;
  agreed_at?: string | null;
};

/** 保存場所の名前「<本人のid>/<front|back>-<時刻>.jpg」 */
export function businessCardPath(userId: string, side: BusinessCardSide, now = Date.now()): string {
  return `${userId}/${side}-${now}.jpg`;
}

/** 画像を長い辺1600pxまでに縮めて JPEG にする（ブラウザだけで使う） */
export async function shrinkBusinessCardImage(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas is not available");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("image could not be encoded");
  return blob;
}
