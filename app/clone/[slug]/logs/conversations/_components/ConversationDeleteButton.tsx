"use client";

// 会話ログ削除ボタン。共通 RowDeleteButton の薄い wrapper。

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteConversation } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  conversationId: string;
  label: string;
}

export function ConversationDeleteButton({
  slug,
  tenantId,
  conversationId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteConversation(slug, tenantId, conversationId)}
    />
  );
}
