"use client";

// 参加者招待モーダル。
// 主催者がイベント単位で招待リンクを発行し、コピー or LINE 共有する。
// mock 段階では実際のリンク発行や DB 永続化はせず、code = eventId のリンクを生成する。

import { useEffect, useMemo, useState } from "react";
import { X, Link2, Copy, Check, MessageCircle, Info } from "lucide-react";
import { buildInviteUrl } from "@/lib/invitations";
import { uiToast } from "@/lib/ui-dialog";

interface InviteModalProps {
  eventId: string;
  eventTitle?: string;
  open: boolean;
  onClose: () => void;
}

export default function InviteModal({
  eventId,
  eventTitle,
  open,
  onClose,
}: InviteModalProps) {
  const [copied, setCopied] = useState(false);

  // クライアント側でしか window が無いので、レンダー時に毎回 origin を解決する。
  // useEffect + setState 経路にすると `react-hooks/set-state-in-effect` で警告になるため
  // useMemo で派生させる（モーダル内のみで使う一時値）。
  const inviteUrl = useMemo(() => {
    if (!open) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${buildInviteUrl(eventId)}`;
  }, [open, eventId]);

  // 開いている間は body のスクロールを止める
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // ESC で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // copied のリセット
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        // fallback: 古い execCommand 経路
        const textarea = document.createElement("textarea");
        textarea.value = inviteUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
    } catch {
      // ブラウザ標準ダイアログは「異常が起きた」と読まれるので使わない
      uiToast("コピーできませんでした。手動でコピーしてください", "error");
    }
  };

  const handleLineShare = () => {
    const text = `${eventTitle ?? "イベント"}にご招待します ${inviteUrl}`;
    const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(text)}`;
    window.open(lineUrl, "_blank", "noopener,noreferrer");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* モーダル本体 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2
            id="invite-modal-title"
            className="text-base font-bold text-gray-900 flex items-center gap-1.5"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            <Link2 className="w-4 h-4 text-amber-500" />
            参加者を招待する
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* イベント名 */}
          {eventTitle && (
            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[11px] font-medium text-amber-700 mb-0.5">
                招待先のイベント
              </p>
              <p
                className="text-sm font-bold text-gray-900"
                style={{ fontFamily: "'Noto Serif JP', serif" }}
              >
                {eventTitle}
              </p>
            </div>
          )}

          {/* 招待 URL */}
          <div>
            <label
              htmlFor="invite-url"
              className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2"
            >
              招待リンク
            </label>
            <div className="flex items-stretch gap-2">
              <input
                id="invite-url"
                type="text"
                value={inviteUrl}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center justify-center gap-1 px-3 rounded-xl text-xs font-bold transition-colors ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    コピー済み
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    コピー
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 共有手段 */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleLineShare}
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#06C755] text-white text-sm font-bold hover:bg-[#05b34c] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              LINE で送る
            </button>
          </div>

          {/* 補助テキスト */}
          <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              このリンクから登録した方は、まず「承認待ち」に入ります。
              <br />
              主催者の承認後に本登録となります。
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
