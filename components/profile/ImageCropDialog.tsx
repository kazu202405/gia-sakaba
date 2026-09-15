"use client";

// 画像クロップモーダル（FB/LINE風）。
// 画像を選んだ後、ズーム/ドラッグで〇の中に収めて「確定」すると、
// 512x512 の正方形 JPEG（Blob）を onConfirm で返す。
// 保存（Supabase Storage 等）は呼び出し側の既存処理に委ねる。
//
// 表示は〇マスク（cropShape="round"）だが、出力は正方形 JPEG。
// アバターは表示側で rounded-full にしているため、丸PNGを作る必要はない。

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, X } from "lucide-react";
import "react-easy-crop/react-easy-crop.css";

interface ImageCropDialogProps {
  open: boolean;
  /** 選択した画像の object URL。null の間は表示しない。 */
  src: string | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = src;
  });
}

// croppedAreaPixels を 512x512 の正方形 JPEG に描画して Blob を返す。
async function getCroppedBlob(src: string, area: Area): Promise<Blob> {
  const image = await loadImage(src);
  const OUT = 512;
  const canvas = document.createElement("canvas");
  canvas.width = OUT;
  canvas.height = OUT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas を初期化できませんでした");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUT, OUT);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("画像の生成に失敗しました")),
      "image/jpeg",
      0.9,
    );
  });
}

export function ImageCropDialog({
  open,
  src,
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  if (!open || !src) return null;

  const handleConfirm = async () => {
    if (!areaPixels) return;
    setProcessing(true);
    setError(null);
    try {
      const blob = await getCroppedBlob(src, areaPixels);
      onConfirm(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像の処理に失敗しました");
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="写真を調整"
    >
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">写真を調整</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="閉じる"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* クロップ領域 */}
        <div className="relative w-full h-72 bg-gray-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={0}
            aspect={1}
            minZoom={1}
            maxZoom={3}
            zoomSpeed={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{}}
          />
        </div>

        {/* ズームスライダー */}
        <div className="px-5 py-4 flex items-center gap-3">
          <span className="text-[11px] text-gray-500 flex-shrink-0">ズーム</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-[var(--gia-navy)]"
            aria-label="ズーム"
          />
        </div>

        {error && (
          <p className="px-5 -mt-2 mb-2 text-[11px] text-red-600">{error}</p>
        )}

        {/* アクション */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing || !areaPixels}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--gia-navy)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                処理中…
              </>
            ) : (
              "確定する"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
