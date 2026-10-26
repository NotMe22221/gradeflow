// Serializable shapes passed from the Classwork page (server) to its client
// list. Dates are formatted on the server so the client never re-renders a
// different day. Pure types: safe to import anywhere.

import type { StatusSummary } from "@/components/classes/status-summary";

export type ClassworkItem = {
  id: string;
  title: string;
  /** Handwritten tests are graded from photos with the Paper Scanner. */
  isTest: boolean;
  /** "Due Oct 29", or null when there is no due date. */
  dueLabel: string | null;
  /** "Posted Oct 20" */
  postedLabel: string;
  /** The first few lines of the prompt or directions. */
  excerpt: string;
  totalPoints: number;
  criteriaCount: number;
  summary: StatusSummary;
};
