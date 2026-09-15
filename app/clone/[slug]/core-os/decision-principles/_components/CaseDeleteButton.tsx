"use client";

// 判断事例の削除ボタン（小サイズ）。RowDeleteButton 共通実装の薄い wrapper。

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteDecisionCase } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  caseId: string;
  label: string;
}

export function CaseDeleteButton({ slug, tenantId, caseId, label }: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteDecisionCase(slug, tenantId, caseId)}
    />
  );
}
