"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteKnowledgeCandidate } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  candidateId: string;
  label: string;
}

export function KnowledgeCandidateDeleteButton({
  slug,
  tenantId,
  candidateId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteKnowledgeCandidate(slug, tenantId, candidateId)}
    />
  );
}
