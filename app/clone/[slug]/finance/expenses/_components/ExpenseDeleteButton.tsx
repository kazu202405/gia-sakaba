"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteExpense } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  expenseId: string;
  label: string;
}

export function ExpenseDeleteButton({
  slug,
  tenantId,
  expenseId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteExpense(slug, tenantId, expenseId)}
    />
  );
}
