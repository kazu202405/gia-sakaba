"use client";

import { RowDeleteButton } from "../../../../_components/RowDeleteButton";
import { deletePersonNote } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  personId: string;
  noteId: string;
  label: string;
}

export function PersonNoteDeleteButton({
  slug,
  tenantId,
  personId,
  noteId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deletePersonNote(slug, tenantId, personId, noteId)}
    />
  );
}
