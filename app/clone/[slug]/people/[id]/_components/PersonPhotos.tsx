"use client";

// 人物の画像ギャラリー（表示＋アイコン設定/削除）。
// アップロードはヘッダーの「画像を追加」ボタン（PersonPhotoUploadButton）が担う。
// props 駆動：操作後は router.refresh で server から再取得して反映。

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2, Check } from "lucide-react";
import { setPersonAvatar, deletePersonPhoto } from "../_photo_actions";

export interface PhotoItem {
  id: string;
  public_url: string;
  storage_path: string;
}

export function PersonPhotos({
  slug,
  tenantId,
  personId,
  initialPhotos,
  initialAvatar,
}: {
  slug: string;
  tenantId: string;
  personId: string;
  initialPhotos: PhotoItem[];
  initialAvatar: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const photos = initialPhotos.filter((p) => !removing.has(p.id));

  const makeAvatar = (url: string) => {
    setError(null);
    startTransition(async () => {
      const res = await setPersonAvatar(slug, tenantId, personId, url);
      if (!res.ok) setError(res.error ?? "設定に失敗しました");
      router.refresh();
    });
  };

  const remove = (p: PhotoItem) => {
    setError(null);
    setRemoving((prev) => new Set(prev).add(p.id)); // 即時非表示
    startTransition(async () => {
      const res = await deletePersonPhoto(
        slug,
        tenantId,
        personId,
        p.id,
        p.storage_path,
        p.public_url,
      );
      if (!res.ok) {
        setError(res.error ?? "削除に失敗しました");
        setRemoving((prev) => {
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] tracking-[0.2em] text-gray-500 uppercase">
        写真・名刺画像
      </h3>

      {error && <p className="text-[12px] text-[#8a4538]">{error}</p>}

      {photos.length === 0 ? (
        <p className="text-[12px] text-gray-400">
          右上の「画像を追加」から名刺や顔写真を登録できます。1枚を選んでアイコン（名前の左の〇）にできます。
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {photos.map((p) => {
            const isAvatar = initialAvatar === p.public_url;
            return (
              <div
                key={p.id}
                className={`group relative aspect-square rounded-md overflow-hidden border ${
                  isAvatar
                    ? "border-[#c08a3e] ring-2 ring-[#c08a3e]/30"
                    : "border-gray-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.public_url}
                  alt="人物画像"
                  className="w-full h-full object-cover"
                />
                {isAvatar && (
                  <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#c08a3e] text-white text-[10px] font-bold">
                    <Check className="w-2.5 h-2.5" />
                    アイコン
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1 bg-gradient-to-t from-black/55 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isAvatar ? (
                    <button
                      type="button"
                      onClick={() => makeAvatar(p.public_url)}
                      disabled={pending}
                      title="アイコンにする"
                      className="inline-flex items-center justify-center w-7 h-7 rounded bg-white/90 text-[#8a5a1c] hover:bg-white disabled:opacity-40"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    disabled={pending}
                    title="削除"
                    className="inline-flex items-center justify-center w-7 h-7 rounded bg-white/90 text-[#8a4538] hover:bg-white disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
