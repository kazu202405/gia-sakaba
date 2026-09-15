"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteNgRule } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  ruleId: string;
  label: string;
}

export function NgRuleDeleteButton({
  slug,
  tenantId,
  ruleId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteNgRule(slug, tenantId, ruleId)}
    />
  );
}
