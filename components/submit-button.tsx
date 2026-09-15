"use client";

// サーバーアクション送信用のボタン。押下中（pending）は自動でスピナー＋無効化し、
// スマホで「タップが効いたか分からない」を解消する。<form action={serverAction}> の中で使う。

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function SubmitButton({
  children,
  className,
  pendingText = "処理中…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
