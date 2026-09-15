"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteRevenue } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  revenueId: string;
  label: string;
}

export function RevenueDeleteButton({
  slug,
  tenantId,
  revenueId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteRevenue(slug, tenantId, revenueId)}
    />
  );
}
