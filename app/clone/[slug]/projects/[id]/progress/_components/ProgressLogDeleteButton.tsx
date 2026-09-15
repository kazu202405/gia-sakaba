"use client";

import { RowDeleteButton } from "../../../../_components/RowDeleteButton";
import { deleteProgressLog } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  projectId: string;
  logId: string;
  label: string;
}

export function ProgressLogDeleteButton({
  slug,
  tenantId,
  projectId,
  logId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteProgressLog(slug, tenantId, projectId, logId)}
    />
  );
}
