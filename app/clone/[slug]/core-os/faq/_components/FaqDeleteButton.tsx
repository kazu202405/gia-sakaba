"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteFaq } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  faqId: string;
  label: string;
}

export function FaqDeleteButton({ slug, tenantId, faqId, label }: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteFaq(slug, tenantId, faqId)}
    />
  );
}
