import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";
import type { GradebookCellState } from "@/lib/gradebook/types";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export type CellDisplay = {
  /** Badge text for workflow states; the accessible label for score and dash states. */
  label: string;
  /** Badge style for workflow states; null for states shown as a score or a dash. */
  variant: BadgeVariant | null;
  /** Hover text on the cell. */
  hint: string;
  /** One-line explanation in the gradebook legend. */
  legend: string;
};

/**
 * How each gradebook cell state looks. GradebookCellView and GradebookLegend
 * both read this map, so the legend cannot drift from the cells.
 */
export const CELL_DISPLAY: Record<GradebookCellState, CellDisplay> = {
  published: {
    label: "Published",
    variant: null,
    hint: "Published with your approval.",
    legend: "Published with your approval",
  },
  in_review: {
    label: "In review",
    variant: "warning",
    hint: "AI draft waiting for your approval. Not counted until you publish it.",
    legend: "Waiting for your approval",
  },
  ready: {
    label: "Ready for AI",
    variant: "secondary",
    hint: "Submitted. Run the AI first pass from the assignment page.",
    legend: "Submitted, no AI pass yet",
  },
  grading: {
    label: "Grading",
    variant: "secondary",
    hint: "The AI first pass is running.",
    legend: "AI first pass running",
  },
  returned: {
    label: "Sent back",
    variant: "outline",
    hint: "Sent back to the student with a note.",
    legend: "Returned with a note",
  },
  missing: {
    label: "No submission yet",
    variant: null,
    hint: "No submission yet.",
    legend: "No submission",
  },
};

/** Legend order. "grading" is left out: it lasts seconds and shows a live indicator. */
export const LEGEND_STATES: readonly GradebookCellState[] = ["published", "in_review", "ready", "returned", "missing"];
