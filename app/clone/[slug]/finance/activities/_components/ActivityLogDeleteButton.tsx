"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteActivityLog } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  activityId: string;
  label: string;
}

export function ActivityLogDeleteButton({
  slug,
  tenantId,
  activityId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteActivityLog(slug, tenantId, activityId)}
    />
  );
}
