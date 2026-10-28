// Client-side draft state for the rubric builder. Pure helpers shared by
// RubricBuilder and its child components.

import type { AssignmentKind } from "@/lib/constants";
import { RUBRIC_LIMITS } from "@/lib/validation/assignment";
import type { FieldErrors } from "@/lib/validation/form";

/** A criterion as typed into the form; maxPoints stays a string until submit. */
export type CriterionDraft = { key: string; title: string; description: string; maxPoints: string };

export type CriterionField = "title" | "description" | "maxPoints";

export function parsePoints(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

/** The points value if it is valid, otherwise 0 (for running totals). */
export function validPoints(value: string): number {
  const points = parsePoints(value);
  return Number.isInteger(points) && points >= RUBRIC_LIMITS.minPoints && points <= RUBRIC_LIMITS.maxPoints
    ? points
    : 0;
}

/** DOM id of the error message for a field path ("criteria.2.title" -> "criteria-2-title-error"). */
export function errorId(key: string): string {
  return `${key.replaceAll(".", "-")}-error`;
}

/** aria-invalid / aria-describedby for a field path. */
export function fieldA11y(errors: FieldErrors, key: string) {
  return {
    "aria-invalid": errors[key] ? (true as const) : undefined,
    "aria-describedby": errors[key] ? errorId(key) : undefined,
  };
}

/** True when a criterion has no typed content yet. */
export function isBlankCriterion(criterion: CriterionDraft): boolean {
  return criterion.title.trim() === "" && criterion.description.trim() === "";
}

/**
 * Wording that changes with the assignment kind. For a TEST, criteria read as questions.
 * Placeholders are short and start with "e.g.", so an empty form never looks filled in
 * or looks like a template was already applied.
 */
export type BuilderCopy = {
  /** "criterion" | "question" */
  noun: string;
  nounPlural: string;
  /** Capitalized noun for item headings ("Criterion 2", "Question 2"). */
  itemLabel: string;
  sectionTitle: string;
  sectionDescription: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  pointsLabel: string;
  /** Points a newly added item starts with. */
  defaultPoints: string;
  addLabel: string;
  assignmentTitlePlaceholder: string;
  instructionsLabel: string;
  instructionsHint: string;
  instructionsPlaceholder: string;
};

export const BUILDER_COPY: Record<AssignmentKind, BuilderCopy> = {
  ESSAY: {
    noun: "criterion",
    nounPlural: "criteria",
    itemLabel: "Criterion",
    sectionTitle: "Rubric",
    sectionDescription:
      "For each criterion, the AI suggests a score, a one to two sentence justification, and a quote from the paper as evidence.",
    titleLabel: "Title",
    titlePlaceholder: "e.g. Use of evidence",
    descriptionLabel: "What full credit looks like",
    descriptionPlaceholder: "e.g. Supports every claim with specific evidence…",
    pointsLabel: "Max points",
    defaultPoints: "5",
    addLabel: "Add criterion",
    assignmentTitlePlaceholder: "e.g. Persuasive essay on homework",
    instructionsLabel: "Prompt and instructions",
    instructionsHint: "The AI reads this alongside the rubric. Include any length or source requirements.",
    instructionsPlaceholder: "e.g. Write a 350 to 500 word essay that…",
  },
  TEST: {
    noun: "question",
    nounPlural: "questions",
    itemLabel: "Question",
    sectionTitle: "Questions and answer key",
    sectionDescription:
      "The AI reads each student's handwritten answers from a photo and scores them against this key. You approve every grade.",
    titleLabel: "Question",
    titlePlaceholder: "e.g. Q1. Define a watershed",
    descriptionLabel: "Answer key (what earns full credit)",
    descriptionPlaceholder: "e.g. All the land that drains into one river or lake",
    pointsLabel: "Points",
    defaultPoints: "2",
    addLabel: "Add question",
    assignmentTitlePlaceholder: "e.g. Unit 4 quiz",
    instructionsLabel: "Directions",
    instructionsHint: "The directions printed on the test. The AI reads them alongside the answer key.",
    instructionsPlaceholder: "e.g. Answer each question in one or two complete sentences.",
  },
};

/** Directions filled in after an answer-key import when the teacher has not written any. */
export const DEFAULT_TEST_DIRECTIONS = "Answer each question in the space provided. Write clearly in pen or dark pencil.";
