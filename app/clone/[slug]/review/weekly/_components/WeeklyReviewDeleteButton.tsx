"use client";

import { RowDeleteButton } from "../../../_components/RowDeleteButton";
import { deleteWeeklyReview } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  reviewId: string;
  label: string;
}

export function WeeklyReviewDeleteButton({
  slug,
  tenantId,
  reviewId,
  label,
}: Props) {
  return (
    <RowDeleteButton
      itemName={label}
      onConfirm={() => deleteWeeklyReview(slug, tenantId, reviewId)}
    />
  );
}
