"use client";

// タスク一覧の 1 行を「クリック / タップで詳細（編集ダイアログ）」にできるラッパー。
// children には grid の左から「Status toggle / タスク名 / 状態 / 優先 / 期限 / 目的」の 6 セルを渡す。
// 削除ボタンは TaskRow 側でグリッドの最終セルとして描画。stopPropagation 済みなので
// 行クリックは発火しない。Status toggle も内部で stopPropagation しているため安全。

import { useState } from "react";
import { TaskEditDialog } from "./TaskEditDialog";
import { TaskDeleteButton } from "./TaskDeleteButton";
import type { TaskInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  taskId: string;
  initial: TaskInput;
  /** 削除モーダルで「○○ を削除します」と表示する 1 行ラベル */
  deleteLabel: string;
  /** グリッドのテンプレ（page.tsx のヘッダーと揃える） */
  gridCols: string;
  /** Status toggle ＋ タスク名 / 状態 / 優先 / 期限 / 目的 の 6 セル */
  children: React.ReactNode;
}

export function TaskRow({
  slug, tenantId, taskId, initial,
  deleteLabel, gridCols, children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`md:grid ${gridCols} gap-4 px-5 py-3.5 hover:bg-gray-50/60 active:bg-gray-100/70 transition-colors cursor-pointer focus:outline-none focus-visible:bg-gray-50/60 focus-visible:ring-1 focus-visible:ring-[#1c3550]/30`}
      >
        {children}
        <div className="flex items-center justify-end mt-1 md:mt-0">
          <TaskDeleteButton
            slug={slug}
            tenantId={tenantId}
            taskId={taskId}
            label={deleteLabel}
          />
        </div>
      </div>

      <TaskEditDialog
        slug={slug}
        tenantId={tenantId}
        taskId={taskId}
        initial={initial}
        controlledOpen={open}
        onControlledClose={() => setOpen(false)}
      />
    </>
  );
}
