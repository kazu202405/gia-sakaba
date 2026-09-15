"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteDecisionLog } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  decisionId: string;
  label: string;
}

export function DecisionLogDeleteButton({
  slug,
  tenantId,
  decisionId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteDecisionLog(slug, tenantId, decisionId)}
    />
  );
}
