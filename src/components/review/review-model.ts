// Pure review-queue logic shared by the review workspace and the review page.
// No React, no DB: safe for client components, server code, and unit tests.

import type { Confidence } from "@/lib/constants";
import { findEvidenceSpan } from "@/lib/grading/evidence";
import type {
  QueueSort,
  ReviewCriterion,
  ReviewFlag,
  ReviewItem,
  ReviewPayload,
} from "@/components/review/types";

export const MAX_COMMENT_CHARS = 2000;
export const MAX_FEEDBACK_CHARS = 4000;
export const MAX_RETURN_NOTE_CHARS = 2000;

// --- Flags ------------------------------------------------------------------

/** AiGrade.flags is a JSON string. Parse it defensively. */
export function parseFlags(json: string | null | undefined): ReviewFlag[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry): ReviewFlag[] => {
      if (!entry || typeof entry !== "object") return [];
      const { code, message, criterionId } = entry as Record<string, unknown>;
      if (typeof code !== "string") return [];
      return [
        {
          code,
          message: typeof message === "string" ? message : "",
          ...(typeof criterionId === "string" ? { criterionId } : {}),
        },
      ];
    });
  } catch {
    return [];
  }
}

export type FlagDisplay = { criterionLabel: string | null; message: string };

const INJECTION_MESSAGE =
  "Text in this paper is addressed to the grader. It was treated as paper content and did not affect the suggestion.";

/**
 * Teacher-facing wording for a validation flag. The validator's own message
 * is specific (it names the criterion), so it is used when present; the
 * per-code text below is the fallback. Prompt-injection flags always use one
 * fixed, reassuring sentence and never echo the injected text.
 */
export function describeFlag(flag: ReviewFlag, criteria: ReviewCriterion[]): FlagDisplay {
  if (flag.code === "POSSIBLE_PROMPT_INJECTION") {
    return { criterionLabel: null, message: INJECTION_MESSAGE };
  }
  if (flag.message.trim()) return { criterionLabel: null, message: flag.message.trim() };

  const index = flag.criterionId ? criteria.findIndex((c) => c.id === flag.criterionId) : -1;
  const criterion = index >= 0 ? criteria[index] : null;
  const criterionLabel = criterion ? `${index + 1}. ${criterion.title}` : null;

  switch (flag.code) {
    case "SCORE_OUT_OF_RANGE":
      return {
        criterionLabel,
        message: criterion
          ? `The AI score was outside 0–${criterion.maxPoints}, so it was discarded. Enter a score.`
          : "An AI score was out of range, so it was discarded. Enter a score.",
      };
    case "EVIDENCE_NOT_FOUND":
      return {
        criterionLabel,
        message: "The quoted evidence does not appear in the paper. Check the score against the text.",
      };
    case "MISSING_CRITERION":
      return { criterionLabel, message: "The AI skipped this criterion. Enter a score." };
    case "UNKNOWN_CRITERION":
      return {
        criterionLabel: null,
        message: "The AI returned a criterion that is not in this rubric. It was ignored.",
      };
    case "SHORT_PAPER":
      return {
        criterionLabel: null,
        message: "This paper is very short, so the suggestion has little to go on.",
      };
    default:
      return { criterionLabel, message: "The AI output needs a closer look before you publish." };
  }
}

export function hasFlags(item: ReviewItem): boolean {
  return (item.ai?.flags.length ?? 0) > 0;
}

// --- Queue ordering ---------------------------------------------------------

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/**
 * "confidence": flagged items first, then low, medium, high, then oldest.
 * "oldest": submission time only. Confidence is a sorting signal, nothing more.
 */
export function sortQueue(items: ReviewItem[], sort: QueueSort): ReviewItem[] {
  const time = (item: ReviewItem) => new Date(item.submittedAt).getTime();
  return [...items].sort((a, b) => {
    if (sort === "confidence") {
      const flagged = Number(!hasFlags(a)) - Number(!hasFlags(b));
      if (flagged !== 0) return flagged;
      // A paper with no AI record at all needs the most attention.
      const rank = (item: ReviewItem) => (item.ai ? CONFIDENCE_RANK[item.ai.confidence] : -1);
      const byConfidence = rank(a) - rank(b);
      if (byConfidence !== 0) return byConfidence;
    }
    return time(a) - time(b) || a.id.localeCompare(b.id);
  });
}

/** Which item to show after `removedId` leaves the queue: next, else previous. */
export function selectionAfterRemoval(orderedIds: string[], removedId: string): string | null {
  const index = orderedIds.indexOf(removedId);
  if (index === -1) return orderedIds.find((id) => id !== removedId) ?? null;
  return orderedIds[index + 1] ?? orderedIds[index - 1] ?? null;
}

// --- Drafts -----------------------------------------------------------------

export type CriterionDraft = {
  /** Raw input text. Never clamped: out-of-range values stay visible as errors. */
  raw: string;
  comment: string;
};

export type ItemDraft = {
  scores: Record<string, CriterionDraft>;
  feedback: string;
};

export function scoreToInput(value: number | null): string {
  return value === null ? "" : String(value);
}

/** The value the teacher works from: their draft, else the AI suggestion. */
export function workingScore(criterion: ReviewCriterion): number | null {
  return criterion.finalScore ?? criterion.aiScore;
}

export function workingComment(criterion: ReviewCriterion): string {
  return criterion.finalComment ?? criterion.aiJustification ?? "";
}

export function createDraft(item: ReviewItem): ItemDraft {
  return {
    scores: Object.fromEntries(
      item.criteria.map((c) => [
        c.id,
        { raw: scoreToInput(workingScore(c)), comment: workingComment(c) },
      ])
    ),
    feedback: item.teacherFeedback ?? "",
  };
}

export type ScoreCheck = { value: number | null; error: string | null };

/** Parse a score field. Blank is "missing", not an error. */
export function checkScore(raw: string, maxPoints: number): ScoreCheck {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, error: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { value: null, error: `Enter a number from 0 to ${maxPoints}.` };
  if (value < 0 || value > maxPoints) {
    return { value: null, error: `Enter a score from 0 to ${maxPoints}.` };
  }
  return { value, error: null };
}

function roundPoints(value: number): number {
  return Math.round(value * 100) / 100;
}

export type DraftSummary = {
  /** Sum of the valid scores entered so far; null when none are. */
  total: number | null;
  maxTotal: number;
  /** Sum of AI suggestions, or null if any criterion has no valid AI score. */
  aiTotal: number | null;
  missingIds: string[];
  invalidIds: string[];
  /** A comment or the overall note is over its length limit. */
  textTooLong: boolean;
  /** Safe to autosave (no invalid fields; blanks are allowed). */
  savable: boolean;
  /** Every criterion scored and every field valid. */
  ready: boolean;
  payload: ReviewPayload;
};

export function summarizeDraft(item: ReviewItem, draft: ItemDraft): DraftSummary {
  let total: number | null = null;
  let maxTotal = 0;
  let aiTotal: number | null = 0;
  const missingIds: string[] = [];
  const invalidIds: string[] = [];
  let textTooLong = draft.feedback.length > MAX_FEEDBACK_CHARS;
  const scores: ReviewPayload["scores"] = [];

  for (const criterion of item.criteria) {
    maxTotal += criterion.maxPoints;
    aiTotal = aiTotal === null || criterion.aiScore === null ? null : aiTotal + criterion.aiScore;

    const entry = draft.scores[criterion.id] ?? {
      raw: scoreToInput(workingScore(criterion)),
      comment: workingComment(criterion),
    };
    const check = checkScore(entry.raw, criterion.maxPoints);
    if (check.error) invalidIds.push(criterion.id);
    else if (check.value === null) missingIds.push(criterion.id);
    else total = (total ?? 0) + check.value;
    if (entry.comment.length > MAX_COMMENT_CHARS) textTooLong = true;

    scores.push({ criterionId: criterion.id, score: check.value, comment: entry.comment });
  }

  const savable = invalidIds.length === 0 && !textTooLong;
  return {
    total: total === null ? null : roundPoints(total),
    maxTotal,
    aiTotal: aiTotal === null ? null : roundPoints(aiTotal),
    missingIds,
    invalidIds,
    textTooLong,
    savable,
    ready: savable && missingIds.length === 0 && item.criteria.length > 0,
    payload: { scores, feedback: draft.feedback },
  };
}

/** One plain sentence on why a paper cannot be published yet. */
export function blockingReason(summary: DraftSummary): string | null {
  if (summary.invalidIds.length > 0) {
    return summary.invalidIds.length === 1
      ? "Fix the highlighted score before publishing."
      : `Fix the ${summary.invalidIds.length} highlighted scores before publishing.`;
  }
  if (summary.missingIds.length > 0) {
    return summary.missingIds.length === 1
      ? "One criterion still needs a score."
      : `${summary.missingIds.length} criteria still need a score.`;
  }
  if (summary.textTooLong) return "Shorten the feedback that is over the length limit.";
  if (summary.maxTotal === 0) return "This rubric has no criteria to score.";
  return null;
}

// --- Evidence highlighting --------------------------------------------------

export type EvidenceRef = { id: string; number: number; title: string };

export type PaperSegment =
  | { kind: "text"; text: string }
  | { kind: "mark"; text: string; markIndex: number; criteria: EvidenceRef[] };

export type EvidenceLayout = {
  segments: PaperSegment[];
  /** criterionId -> index of the mark that contains its quote. */
  markForCriterion: Record<string, number>;
};

/**
 * Split the paper into plain text and highlighted evidence. Only quotes the
 * server verified (evidenceFound) are highlighted, and each is re-located with
 * the same matcher. Overlapping quotes merge into one mark that carries every
 * criterion number, so no text is ever duplicated or dropped.
 */
export function layoutEvidence(content: string, criteria: ReviewCriterion[]): EvidenceLayout {
  const spans: { start: number; end: number; ref: EvidenceRef }[] = [];
  criteria.forEach((criterion, index) => {
    if (!criterion.evidenceFound || !criterion.aiEvidence) return;
    const span = findEvidenceSpan(content, criterion.aiEvidence);
    if (!span || span.end <= span.start) return;
    spans.push({ ...span, ref: { id: criterion.id, number: index + 1, title: criterion.title } });
  });
  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  const merged: { start: number; end: number; refs: EvidenceRef[] }[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start < last.end) {
      last.end = Math.max(last.end, span.end);
      last.refs.push(span.ref);
    } else {
      merged.push({ start: span.start, end: span.end, refs: [span.ref] });
    }
  }

  const segments: PaperSegment[] = [];
  const markForCriterion: Record<string, number> = {};
  let cursor = 0;
  merged.forEach((mark, markIndex) => {
    if (mark.start > cursor) segments.push({ kind: "text", text: content.slice(cursor, mark.start) });
    const refs = [...mark.refs].sort((a, b) => a.number - b.number);
    segments.push({ kind: "mark", text: content.slice(mark.start, mark.end), markIndex, criteria: refs });
    for (const ref of refs) markForCriterion[ref.id] = markIndex;
    cursor = mark.end;
  });
  if (cursor < content.length) segments.push({ kind: "text", text: content.slice(cursor) });

  return { segments, markForCriterion };
}

// --- DOM ids ----------------------------------------------------------------

export function markDomId(submissionId: string, markIndex: number): string {
  return `evidence-${submissionId}-${markIndex}`;
}

export function scoreInputId(submissionId: string, criterionId: string): string {
  return `score-${submissionId}-${criterionId}`;
}

export function criterionCardId(submissionId: string, criterionId: string): string {
  return `criterion-${submissionId}-${criterionId}`;
}
