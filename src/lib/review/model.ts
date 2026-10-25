// Pure review-queue logic shared by the review workspace, the review server
// logic, and unit tests. No React, no DB: safe for client components, server
// code, and tests.

import type { AssignmentKind, Confidence } from "@/lib/constants";
import { findEvidenceSpan, findTestEvidenceSpan } from "@/lib/grading/evidence";
import { detectPromptInjection, splitSentences } from "@/lib/grading/injection";
import { SCORE_STEP, isOnScoreStep } from "@/lib/review/scores";
import type {
  PreviousReturn,
  QueueSort,
  ReviewCriterion,
  ReviewItem,
  ReviewPayload,
} from "@/lib/review/types";

export const MAX_COMMENT_CHARS = 2000;
export const MAX_FEEDBACK_CHARS = 4000;
export const MAX_RETURN_NOTE_CHARS = 2000;

// --- Flags ------------------------------------------------------------------

export function hasFlags(item: ReviewItem): boolean {
  return (item.ai?.flags.length ?? 0) > 0;
}

export function hasInjectionFlag(item: ReviewItem): boolean {
  return item.ai?.flags.some((flag) => flag.code === "POSSIBLE_PROMPT_INJECTION") ?? false;
}

/**
 * The grader-directed sentences to mark in the paper. Only papers whose AI
 * pass raised the injection flag are scanned, so the paper view and the flag
 * banner always agree.
 */
export function flaggedSnippets(item: ReviewItem): string[] {
  return hasInjectionFlag(item) ? detectPromptInjection(item.content).snippets : [];
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

// --- Assignment labels --------------------------------------------------------

/** Shared openings shorter than this are left alone. */
const MIN_SHARED_PREFIX = 16;
/** Keep at least this much of a title after dropping its shared opening. */
const MIN_LABEL_TAIL = 12;

function sharedPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Labels that keep assignments apart in narrow places (the filter trigger and
 * the queue list), keyed by assignment id. When titles share a long opening,
 * such as "Persuasive Essay: Should Our School ...", each keeps its
 * distinctive end after an ellipsis ("…Adopt a Four-Day Week?"). Identical
 * titles from different classes get the class name. Other titles are
 * unchanged. Show the full title next to the label (dropdown, tooltip).
 */
export function assignmentLabels(
  assignments: { id: string; title: string; className: string }[]
): Map<string, string> {
  const unique = new Map<string, { id: string; title: string; className: string }>();
  for (const assignment of assignments) {
    if (!unique.has(assignment.id)) unique.set(assignment.id, assignment);
  }
  const list = [...unique.values()];

  const labels = new Map<string, string>();
  for (const assignment of list) {
    const { title } = assignment;
    let shared = 0;
    let duplicate = false;
    for (const other of list) {
      if (other.id === assignment.id) continue;
      if (other.title === title) duplicate = true;
      else shared = Math.max(shared, sharedPrefixLength(title, other.title));
    }

    let label = title;
    if (shared >= MIN_SHARED_PREFIX) {
      // Cut at a word boundary inside the shared opening, then step back a
      // word at a time until enough of the title is left to read on its own.
      let cut = title.lastIndexOf(" ", shared);
      while (cut > 0 && title.length - cut - 1 < MIN_LABEL_TAIL) cut = title.lastIndexOf(" ", cut - 1);
      if (cut >= MIN_SHARED_PREFIX) label = `…${title.slice(cut + 1).trim()}`;
    }
    labels.set(assignment.id, duplicate ? `${label} · ${assignment.className}` : label);
  }
  return labels;
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

/** True once the teacher has saved a draft for this criterion. */
export function hasTeacherDraft(criterion: ReviewCriterion): boolean {
  // A draft save always writes a string comment; the AI pass writes null.
  return criterion.finalComment !== null;
}

/**
 * The value the teacher works from: their saved draft, else the AI
 * suggestion. A score the teacher cleared stays blank (finalScore is null
 * with a saved draft), so the AI value never silently comes back.
 */
export function workingScore(criterion: ReviewCriterion): number | null {
  return hasTeacherDraft(criterion) ? criterion.finalScore : criterion.aiScore;
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
  if (!isOnScoreStep(value)) {
    const lower = Math.floor(value / SCORE_STEP) * SCORE_STEP;
    const upper = Math.min(lower + SCORE_STEP, maxPoints);
    return { value: null, error: `Use whole or half points, like ${lower} or ${upper}.` };
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

/**
 * One plain sentence on why a paper cannot be published yet. A handwritten
 * test is scored by question, an essay by rubric criterion.
 */
export function blockingReason(summary: DraftSummary, kind: AssignmentKind = "ESSAY"): string | null {
  const test = kind === "TEST";
  if (summary.invalidIds.length > 0) {
    return summary.invalidIds.length === 1
      ? "Fix the highlighted score before publishing."
      : `Fix the ${summary.invalidIds.length} highlighted scores before publishing.`;
  }
  if (summary.missingIds.length > 0) {
    const count = summary.missingIds.length;
    if (count === 1) return test ? "One question still needs a score." : "One criterion still needs a score.";
    return `${count} ${test ? "questions" : "criteria"} still need a score.`;
  }
  if (summary.textTooLong) return "Shorten the feedback that is over the length limit.";
  if (summary.maxTotal === 0) return test ? "This test has no questions to score." : "This rubric has no criteria to score.";
  return null;
}

// --- Paper layout: evidence and flagged text --------------------------------

export type EvidenceRef = { id: string; number: number; title: string };

export type InlineSegment =
  | { kind: "text"; text: string }
  | { kind: "mark"; text: string; markIndex: number; criteria: EvidenceRef[] };

export type PaperSegment =
  | InlineSegment
  /** Text addressed to the grader. Evidence marks inside it stay nested. */
  | { kind: "flagged"; flagIndex: number; children: InlineSegment[] };

export type EvidenceLayout = {
  segments: PaperSegment[];
  /** criterionId -> index of the mark that contains its quote. */
  markForCriterion: Record<string, number>;
  /** How many grader-directed passages are marked. */
  flaggedCount: number;
};

type Range = { start: number; end: number };

/** Sort and merge overlapping or touching ranges. */
function mergeRanges(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Range[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

/** Join ranges separated only by spaces on the same line, e.g. two flagged sentences. */
function joinSameLine(content: string, ranges: Range[]): Range[] {
  const joined: Range[] = [];
  for (const range of ranges) {
    const last = joined[joined.length - 1];
    if (last && /^[ \t]*$/.test(content.slice(last.end, range.start))) last.end = Math.max(last.end, range.end);
    else joined.push({ ...range });
  }
  return joined;
}

const MAX_OCCURRENCES = 10;

/**
 * Every place a flagged snippet appears. Snippets are whitespace-flattened
 * and may be cut with "…", so the evidence matcher finds them; very short
 * ones (under the matcher's minimum) fall back to an exact search. A cut
 * snippet is extended to the end of its sentence.
 */
function findSnippetRanges(content: string, snippet: string): Range[] {
  const truncated = snippet.endsWith("…");
  const exact = snippet.replace(/…$/, "").trim();
  if (!exact) return [];
  const sentences = truncated ? splitSentences(content) : [];

  const ranges: Range[] = [];
  let from = 0;
  while (ranges.length < MAX_OCCURRENCES && from < content.length) {
    const rest = content.slice(from);
    let span = findEvidenceSpan(rest, snippet);
    if (!span) {
      const index = rest.indexOf(exact);
      span = index === -1 ? null : { start: index, end: index + exact.length };
    }
    if (!span || span.end <= span.start) break;
    const range = { start: from + span.start, end: from + span.end };
    if (truncated) {
      const sentence = sentences.find((s) => s.start <= range.start && range.start < s.end);
      if (sentence && sentence.end > range.end) range.end = sentence.end;
    }
    ranges.push(range);
    from = range.end;
  }
  return ranges;
}

/**
 * Split the paper into plain text, highlighted evidence, and flagged
 * (grader-directed) passages. Only quotes the server verified (evidenceFound)
 * are highlighted, and each is re-located with the matcher the scan validator
 * uses: a verbatim quote, or a short answer that fills a whole answer line of
 * a transcription ("O horizon" on "Q2. O horizon"). Essays are verified with
 * the verbatim matcher alone, so the fallback never widens what they show. Overlapping
 * quotes merge into one mark that carries every criterion number. A flagged
 * passage grows to contain any mark it overlaps, so marks nest inside it and
 * no text is ever duplicated or dropped. Everything stays plain text.
 */
export function layoutEvidence(
  content: string,
  criteria: ReviewCriterion[],
  flagged: string[] = []
): EvidenceLayout {
  const spans: { start: number; end: number; ref: EvidenceRef }[] = [];
  criteria.forEach((criterion, index) => {
    if (!criterion.evidenceFound || !criterion.aiEvidence) return;
    const span = findTestEvidenceSpan(content, criterion.aiEvidence);
    if (!span || span.end <= span.start) return;
    spans.push({ ...span, ref: { id: criterion.id, number: index + 1, title: criterion.title } });
  });
  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  const marks: { start: number; end: number; refs: EvidenceRef[] }[] = [];
  for (const span of spans) {
    const last = marks[marks.length - 1];
    if (last && span.start < last.end) {
      last.end = Math.max(last.end, span.end);
      last.refs.push(span.ref);
    } else {
      marks.push({ start: span.start, end: span.end, refs: [span.ref] });
    }
  }

  let regions = mergeRanges(flagged.flatMap((snippet) => findSnippetRanges(content, snippet)));
  // Grow each flagged region over any mark it partly covers, until stable.
  for (let changed = true; changed; ) {
    changed = false;
    for (const region of regions) {
      for (const mark of marks) {
        if (mark.start >= region.end || region.start >= mark.end) continue;
        if (mark.start < region.start || mark.end > region.end) {
          region.start = Math.min(region.start, mark.start);
          region.end = Math.max(region.end, mark.end);
          changed = true;
        }
      }
    }
    if (changed) regions = mergeRanges(regions);
  }
  regions = joinSameLine(content, regions);

  const markForCriterion: Record<string, number> = {};
  let nextMark = 0;
  // Text and marks in [from, to). Marks never straddle `to` by construction.
  const inline = (from: number, to: number): InlineSegment[] => {
    const out: InlineSegment[] = [];
    let cursor = from;
    while (nextMark < marks.length && marks[nextMark].start < to) {
      const mark = marks[nextMark];
      if (mark.start > cursor) out.push({ kind: "text", text: content.slice(cursor, mark.start) });
      const refs = [...mark.refs].sort((a, b) => a.number - b.number);
      out.push({ kind: "mark", text: content.slice(mark.start, mark.end), markIndex: nextMark, criteria: refs });
      for (const ref of refs) markForCriterion[ref.id] = nextMark;
      cursor = mark.end;
      nextMark++;
    }
    if (cursor < to) out.push({ kind: "text", text: content.slice(cursor, to) });
    return out;
  };

  const segments: PaperSegment[] = [];
  let cursor = 0;
  regions.forEach((region, flagIndex) => {
    segments.push(...inline(cursor, region.start));
    segments.push({ kind: "flagged", flagIndex, children: inline(region.start, region.end) });
    cursor = region.end;
  });
  segments.push(...inline(cursor, content.length));

  return { segments, markForCriterion, flaggedCount: regions.length };
}

/**
 * True when an evidence quote stops mid-sentence (the grader clipped a long
 * run-on sentence), so the card can show a visual ellipsis. Display only:
 * the stored quote stays verbatim.
 */
export function quoteIsClipped(quote: string): boolean {
  return !/[.!?…]["'”’)]*$/.test(quote.trim());
}

// --- Resubmissions ----------------------------------------------------------

/**
 * The teacher's earlier send-back, when the student has resubmitted since.
 * Resubmitting keeps returnNote and returnedAt, so only a submission newer
 * than the send-back counts.
 */
export function previousReturn(row: {
  submittedAt: Date;
  returnedAt: Date | null;
  returnNote: string | null;
}): PreviousReturn | null {
  if (!row.returnedAt || row.submittedAt.getTime() <= row.returnedAt.getTime()) return null;
  return { note: row.returnNote?.trim() ?? "", at: row.returnedAt.toISOString() };
}

// --- DOM ids ----------------------------------------------------------------

export function markDomId(submissionId: string, markIndex: number): string {
  return `evidence-${submissionId}-${markIndex}`;
}

export function flaggedDomId(submissionId: string, flagIndex: number): string {
  return `flagged-${submissionId}-${flagIndex}`;
}

export function scoreInputId(submissionId: string, criterionId: string): string {
  return `score-${submissionId}-${criterionId}`;
}

export function criterionCardId(submissionId: string, criterionId: string): string {
  return `criterion-${submissionId}-${criterionId}`;
}
