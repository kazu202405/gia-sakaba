"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteMonthlyReview } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  reviewId: string;
  label: string;
}

export function MonthlyReviewDeleteButton({
  slug,
  tenantId,
  reviewId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteMonthlyReview(slug, tenantId, reviewId)}
    />
  );
}
