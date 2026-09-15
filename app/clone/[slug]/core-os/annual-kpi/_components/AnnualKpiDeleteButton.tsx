"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteAnnualKpi } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  kpiId: string;
  label: string;
}

export function AnnualKpiDeleteButton({
  slug,
  tenantId,
  kpiId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteAnnualKpi(slug, tenantId, kpiId)}
    />
  );
}
