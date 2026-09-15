"use client";

// ヘッダー（詳細を編集・削除の隣）に置く「画像を追加」ボタン。
// 画像を選ぶと FB/LINE 風のクロップモーダル（ImageCropDialog）で〇に収めて確定 →
// 512x512 JPEG を Storage に直接アップロード → DB 記録 → router.refresh で再描画。
// 複数選択時は 1 枚ずつ順にクロップする（キュー方式）。

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropDialog } from "@/components/profile/ImageCropDialog";
import { addPersonPhoto } from "../_photo_actions";

const BUCKET = "ai-clone-people";

export function PersonPhotoUploadButton({
  slug,
  tenantId,
  personId,
}: {
  slug: string;
  tenantId: string;
  personId: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  // クロップ待ちの残りファイル（先頭が cropSrc として表示中）。
  const queueRef = useRef<File[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 次の1枚のクロップを開始。無ければ終了して再描画。
  const showNext = () => {
    const next = queueRef.current.shift();
    if (!next) {
      setCropSrc(null);
      router.refresh();
      return;
    }
    setCropSrc(URL.createObjectURL(next));
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;
    setError(null);
    queueRef.current = files;
    showNext();
  };

  // クロップした正方形 JPEG を 1 枚アップロード＋DB記録。
  const uploadOne = async (blob: Blob) => {
    const supabase = createClient();
    const rand =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const path = `${tenantId}/${personId}/${rand}.jpg`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        cacheControl: "3600",
        contentType: "image/jpeg",
      });
    if (upErr) {
      setError(`アップロードに失敗しました：${upErr.message}`);
      return;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const res = await addPersonPhoto(slug, tenantId, personId, path, pub.publicUrl);
    if (!res.ok) setError(res.error ?? "記録に失敗しました");
  };

  const handleCropConfirm = async (blob: Blob) => {
    const currentUrl = cropSrc;
    setUploading(true);
    await uploadOne(blob);
    setUploading(false);
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    showNext();
  };

  // この1枚はスキップして次へ（残りが無ければ終了）。
  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    showNext();
  };

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 transition-colors"
      >
        {uploading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ImagePlus className="w-3 h-3" />
        )}
        {uploading ? "アップロード中…" : "画像を追加"}
      </button>
      {error && <span className="mt-1 text-[11px] text-[#8a4538]">{error}</span>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onPick}
        className="hidden"
      />
      {/* 〇に収めて確定（複数選択時は key で1枚ごとに状態リセット） */}
      <ImageCropDialog
        key={cropSrc ?? "none"}
        open={!!cropSrc}
        src={cropSrc}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
