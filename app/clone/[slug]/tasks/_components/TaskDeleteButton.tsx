"use client";

import { RowDeleteButton } from "../../_components/RowDeleteButton";
import { deleteTask } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  taskId: string;
  label: string;
}

export function TaskDeleteButton({ slug, tenantId, taskId, label }: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteTask(slug, tenantId, taskId)}
    />
  );
}
