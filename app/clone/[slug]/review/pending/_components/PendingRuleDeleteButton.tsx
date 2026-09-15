"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deletePendingRule } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  ruleId: string;
  label: string;
}

export function PendingRuleDeleteButton({
  slug,
  tenantId,
  ruleId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deletePendingRule(slug, tenantId, ruleId)}
    />
  );
}
