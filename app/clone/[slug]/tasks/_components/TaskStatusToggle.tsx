"use client";

// 一覧上で「未着手 → 完了」をワンクリックで切り替えるためのチェックボックス。
// 完了 → 未着手 にも戻せる。それ以外のステータス変更（進行中・保留）は将来の編集UIで。

import { useTransition } from "react";
import { updateTaskStatus } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  taskId: string;
  status: string | null;
}

export function TaskStatusToggle({ slug, tenantId, taskId, status }: Props) {
  const [pending, startTransition] = useTransition();
  const isDone = status === "完了";

  const handleToggle = () => {
    startTransition(async () => {
      await updateTaskStatus(
        slug,
        tenantId,
        taskId,
        isDone ? "未着手" : "完了",
      );
    });
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleToggle();
      }}
      disabled={pending}
      aria-label={isDone ? "未着手に戻す" : "完了にする"}
      className={`inline-flex items-center justify-center w-4 h-4 rounded border transition-colors ${
        isDone
          ? "bg-[#3d6651] border-[#3d6651] text-white"
          : "bg-white border-gray-300 hover:border-[#3d6651]"
      } ${pending ? "opacity-50" : ""}`}
    >
      {isDone && (
        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M3 8 L7 12 L13 4" />
        </svg>
      )}
    </button>
  );
}
