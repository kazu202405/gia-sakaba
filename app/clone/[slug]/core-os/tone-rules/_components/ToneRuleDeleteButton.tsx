"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteToneRule } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  ruleId: string;
  label: string;
}

export function ToneRuleDeleteButton({
  slug,
  tenantId,
  ruleId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteToneRule(slug, tenantId, ruleId)}
    />
  );
}
