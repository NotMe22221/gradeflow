import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";
import type { GradebookCellState } from "@/lib/gradebook/types";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * What a cell shows. "missing" splits in two: past due with nothing turned in
 * reads "Missing" (never for a paper test that is simply not scanned yet);
 * otherwise the cell is blank.
 */
export type CellDisplayKey = Exclude<GradebookCellState, "missing"> | "missing" | "missing_past_due";

export type CellDisplay = {
  /** Visible text for workflow states; the accessible label for score and blank states. */
  label: string;
  /** How the label renders: a status chip, plain muted text, danger text, or (score / blank) nothing. */
  look: { kind: "chip"; variant: BadgeVariant } | { kind: "muted" } | { kind: "danger" } | { kind: "none" };
  /** Hover text on the cell. */
  hint: string;
  /** One-line explanation in the legend. */
  legend: string;
};

/**
 * How each gradebook cell looks, in Google Classroom's words. The cells and
 * the legend both read this map, so the legend cannot drift from the cells.
 * Only approved grades ever show a score: an AI draft is a "Needs review"
 * chip, never a number.
 */
export const CELL_DISPLAY: Record<CellDisplayKey, CellDisplay> = {
  published: {
    label: "Returned",
    look: { kind: "none" },
    hint: "Approved by you and returned to the student.",
    legend: "Approved and returned",
  },
  in_review: {
    label: "Needs review",
    look: { kind: "chip", variant: "warning" },
    hint: "An AI draft is waiting for your approval. It is not a grade and is not counted.",
    legend: "AI draft waiting for your approval; not counted",
  },
  ready: {
    label: "Turned in",
    look: { kind: "muted" },
    hint: "Turned in. Run the AI first pass from the assignment page.",
    legend: "AI first pass not run yet",
  },
  grading: {
    label: "Grading…",
    look: { kind: "muted" },
    hint: "The AI first pass is running.",
    legend: "AI first pass running",
  },
  returned: {
    label: "Sent back",
    look: { kind: "muted" },
    hint: "Sent back to the student for a revision.",
    legend: "Waiting on a revision",
  },
  missing_past_due: {
    label: "Missing",
    look: { kind: "danger" },
    hint: "Past due and nothing turned in.",
    legend: "Past due, nothing turned in",
  },
  missing: {
    label: "Not turned in",
    look: { kind: "none" },
    hint: "Nothing turned in yet.",
    legend: "Not turned in yet",
  },
};

/** Legend order. "grading" is left out: it lasts seconds and shows a live indicator. */
export const LEGEND_KEYS: readonly CellDisplayKey[] = [
  "published",
  "in_review",
  "ready",
  "returned",
  "missing_past_due",
  "missing",
];

/** The display key for a cell, given whether its assignment is past due and is a paper test. */
export function cellDisplayKey(
  state: GradebookCellState,
  context: { pastDue: boolean; isTest: boolean }
): CellDisplayKey {
  if (state !== "missing") return state;
  return context.pastDue && !context.isTest ? "missing_past_due" : "missing";
}
