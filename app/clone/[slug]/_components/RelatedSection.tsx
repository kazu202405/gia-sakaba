"use client";

// 詳細ページの「関連XX」セクション（汎用）。
// 既存リンクのカード列 + LinkPickerDialog（追加）+ 各カードの ✕（解除）。
// unlink は紐付けを外すだけで実体は消さないため confirm 無しで即実行。

import Link from "next/link";
import { useTransition } from "react";
import { X, Loader2 } from "lucide-react";
import {
  EditorialCard,
} from "@/app/admin/_components/EditorialChrome";
import { LinkPickerDialog, type PickerCandidate } from "./LinkPickerDialog";

export interface RelatedItem {
  id: string;
  label: string;
  sublabel?: string | null;
  /** 詳細ページへのリンク先（未指定なら静的表示） */
  href?: string | null;
}

interface Props {
  /** セクション見出し例：「関連案件」 */
  title: string;
  /** ピッカーのモーダルタイトル */
  pickerTitle: string;
  /** ピッカーのトリガーボタン文言 */
  triggerLabel: string;
  /** 候補なし時の文言 */
  pickerEmptyMessage?: string;
  /** 既存リンクの一覧 */
  items: RelatedItem[];
  /** 紐付け候補（既存ぶんを除外したリスト） */
  candidates: PickerCandidate[];
  /** 紐付け実行 */
  onLink: (candidateId: string) => Promise<{ ok: boolean; error?: string }>;
  /** 紐付け解除 */
  onUnlink: (itemId: string) => Promise<{ ok: boolean; error?: string }>;
}

function UnlinkButton({
  itemLabel,
  onUnlink,
}: {
  itemLabel: string;
  onUnlink: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await onUnlink();
    });
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={`${itemLabel} の紐付けを解除`}
      title="紐付けを解除"
      className="inline-flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-[#8a4538] hover:bg-[#f3e9e6] disabled:opacity-40 transition-colors"
    >
      {pending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <X className="w-3 h-3" />
      )}
    </button>
  );
}

export function RelatedSection({
  title,
  pickerTitle,
  triggerLabel,
  pickerEmptyMessage,
  items,
  candidates,
  onLink,
  onUnlink,
}: Props) {
  return (
    <EditorialCard className="p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
          {title}
          {items.length > 0 && (
            <span className="ml-2 text-[11px] text-gray-400 tabular-nums tracking-normal">
              {items.length}
            </span>
          )}
        </h3>
        <LinkPickerDialog
          triggerLabel={triggerLabel}
          title={pickerTitle}
          candidates={candidates}
          emptyMessage={pickerEmptyMessage}
          onSelect={onLink}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-[12px] text-gray-400">まだ紐付けがありません</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-center justify-between gap-2 px-3 py-2 rounded border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-sm text-[#1c3550] hover:underline leading-snug block truncate"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <p className="text-sm text-[#1c3550] leading-snug truncate">
                    {item.label}
                  </p>
                )}
                {item.sublabel && (
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                    {item.sublabel}
                  </p>
                )}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <UnlinkButton
                  itemLabel={item.label}
                  onUnlink={() => onUnlink(item.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </EditorialCard>
  );
}
