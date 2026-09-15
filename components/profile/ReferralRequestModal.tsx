"use client";

// 紹介依頼コピペモーダル。
// プロフィール詳細から呼び出され、主催者宛 LINE メッセージの雛形を編集 → コピー → LINE を開く動線を提供する。
// 依存追加なしの自前モーダル（背景オーバーレイ + ESC + body スクロール固定）。

import { useEffect, useRef, useState } from "react";
import { Copy, MessageCircle, X, Check } from "lucide-react";
import {
  buildReferralRequestText,
  HOST_LINE_URL,
} from "@/lib/referral-template";
import { uiToast } from "@/lib/ui-dialog";

export interface ReferralRequestModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** モーダルを閉じるハンドラ */
  onClose: () => void;
  /** 紹介してほしい相手の表示情報 */
  target: {
    name: string;
    /** photo_url が無い場合はイニシャル表示にフォールバック */
    photoUrl?: string | null;
    /** 役職または職種。両方ある場合は preferred を渡す */
    title?: string;
  };
}

export function ReferralRequestModal({
  open,
  onClose,
  target,
}: ReferralRequestModalProps) {
  // 開いている時だけ内部コンポーネントをマウントすることで、
  // 「相手が変わったら textarea の初期値を再生成する」ロジックを useState 初期値で済ませられる
  // （= useEffect 内 setState を回避）。
  if (!open) return null;
  return (
    <ReferralRequestModalInner
      onClose={onClose}
      target={target}
    />
  );
}

interface ReferralRequestModalInnerProps {
  onClose: () => void;
  target: ReferralRequestModalProps["target"];
}

function ReferralRequestModalInner({
  onClose,
  target,
}: ReferralRequestModalInnerProps) {
  // 文面（編集可能）。マウント時のみ初期化されるので open 切替で常に最新の相手情報が反映される
  const [text, setText] = useState(() =>
    buildReferralRequestText({
      targetName: target.name,
      targetTitle: target.title,
    })
  );
  // コピー成功トースト
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ESC で閉じる + body スクロール固定 + トースト timer のクリーンアップ
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [onClose]);

  // 文面をクリップボードにコピー。失敗時は alert で簡易通知
  const handleCopy = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      // クリップボード API が使えない環境向けのフォールバック
      uiToast("コピーできませんでした。お手数ですが手動でコピーしてください", "error");
      return false;
    }
  };

  // コピー後に LINE 公式アカウントを別タブで開く
  const handleCopyAndOpenLine = async () => {
    const ok = await handleCopy();
    if (ok) {
      window.open(HOST_LINE_URL, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="referral-modal-title"
    >
      {/* オーバーレイ：クリックで閉じる */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-amber-700 tracking-wider uppercase mb-1">
              Referral Request
            </p>
            <h2
              id="referral-modal-title"
              className="text-lg sm:text-xl font-bold text-gray-900 leading-snug"
              style={{ fontFamily: "'Noto Serif JP', serif" }}
            >
              {target.name}さんの紹介をお願いする
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 本文：相手情報 + 文面プレビュー */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 相手情報 */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100">
            {target.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={target.photoUrl}
                alt={target.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-700 font-bold text-base ring-2 ring-white shadow-sm flex-shrink-0">
                {target.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {target.name}
              </p>
              {target.title && (
                <p className="text-xs text-gray-500 truncate">{target.title}</p>
              )}
            </div>
          </div>

          {/* 文面エディタ */}
          <div>
            <label
              htmlFor="referral-text"
              className="block text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-2"
            >
              送信する文面（編集可）
            </label>
            <textarea
              id="referral-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="w-full text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-colors"
              spellCheck={false}
            />
            <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
              「紹介をお願いしたい理由」の部分はあなたの言葉で書き換えてください。
            </p>
          </div>
        </div>

        {/* フッターアクション */}
        <div className="border-t border-gray-100 p-4 sm:p-5">
          {/* コピー成功トースト（モーダル内） */}
          <div
            className={`mb-3 transition-all duration-200 ${
              copied
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-1 pointer-events-none h-0 mb-0"
            }`}
            aria-live="polite"
          >
            {copied && (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <Check className="w-4 h-4" />
                コピーしました
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <Copy className="w-4 h-4" />
              コピーする
            </button>
            <button
              type="button"
              onClick={handleCopyAndOpenLine}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              コピーして LINE を開く
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
