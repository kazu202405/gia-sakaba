"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteDecisionPrinciple } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  principleId: string;
  label: string;
}

export function DecisionPrincipleDeleteButton({
  slug,
  tenantId,
  principleId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteDecisionPrinciple(slug, tenantId, principleId)}
    />
  );
}
