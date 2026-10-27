// The demo dataset in the shape the seed inserts: every submission with its
// final content, whether it was typed (TEXT) or scanned (SCAN). Pure: no
// database access.

import type { Confidence, SubmissionSource } from "../../src/lib/constants";
import { gradeWithDemoHeuristics } from "../../src/lib/grading/mock";
import type { ValidatedGrading } from "../../src/lib/grading/types";
import { validateGrading } from "../../src/lib/grading/validate";
import { sum, type DaysAgoAt } from "./helpers";
import { PUBLISHED_HISTORY, type HistoryScore, type PublishedHistoryEntry } from "./history";
import { PAPERS } from "./papers";
import type { StudentKey } from "./people";
import { QUIZ_RESULTS, quizTranscription, type QuizResult } from "./quizzes";
import { ASSIGNMENTS, type AssignmentKey, type SeedAssignment } from "./rubrics";
import { DRAFTED_SUBMISSIONS, PENDING_SUBMISSIONS } from "./submissions";

/** Accounts, classes, and enrollments date from the start of the term. */
export const TERM_START: DaysAgoAt = { daysAgo: 40, hour: 8, minute: 0 };

export function assignmentByKey(key: AssignmentKey): SeedAssignment {
  const assignment = ASSIGNMENTS.find((candidate) => candidate.key === key);
  if (!assignment) throw new Error(`Unknown assignment "${key}".`);
  return assignment;
}

/** "assignmentKey/studentKey": one submission per student per assignment. */
export function submissionKey(assignmentKey: AssignmentKey, studentKey: StudentKey): string {
  return `${assignmentKey}/${studentKey}`;
}

/** A typed paper waiting for the AI first pass (status SUBMITTED, no AiGrade). */
export type SeedPending = {
  assignmentKey: AssignmentKey;
  studentKey: StudentKey;
  content: string;
  fileName: string | null;
  submittedAt: DaysAgoAt;
};

/** A typed paper the AI first pass drafted, waiting in To review (status NEEDS_REVIEW). */
export type SeedDraft = SeedPending & {
  /** When the teacher ran the AI first pass. */
  aiGradedAt: DaysAgoAt;
};

/** A past teacher approval: AI draft, teacher's final values, published snapshot. */
export type SeedPublished = {
  assignmentKey: AssignmentKey;
  studentKey: StudentKey;
  source: SubmissionSource;
  /** The paper, or for a scanned test the transcription of the photos. */
  content: string;
  fileName: string | null;
  submittedAt: DaysAgoAt;
  aiGradedAt: DaysAgoAt;
  approvedAt: DaysAgoAt;
  confidence: Confidence;
  overallComment: string;
  feedback: string;
  /** Keyed by SeedCriterion.key; must cover every criterion of the rubric. */
  scores: Record<string, HistoryScore>;
  /** Essay history: the teacher's review changed at least one score on every paper. */
  requireAdjustment: boolean;
  /**
   * True for typed essays: the AI side is the demo grader's real, validated
   * draft of the paper (demoDraft). The seed builds that draft again with the
   * database's criterion ids, which pick the justification's wording and
   * label the flags; the scores, quotes, confidence, and overall comment do
   * not depend on them. False for scanned quizzes, whose drafts are written
   * out in quizzes.ts.
   */
  demoDrafted: boolean;
};

export const PENDING: SeedPending[] = PENDING_SUBMISSIONS.map((submission) => ({
  assignmentKey: submission.assignmentKey,
  studentKey: submission.studentKey,
  content: PAPERS[submission.paperKey],
  fileName: submission.fileName,
  submittedAt: submission.submittedAt,
}));

export const DRAFTS: SeedDraft[] = DRAFTED_SUBMISSIONS.map((submission) => ({
  assignmentKey: submission.assignmentKey,
  studentKey: submission.studentKey,
  content: PAPERS[submission.paperKey],
  fileName: submission.fileName,
  submittedAt: submission.submittedAt,
  aiGradedAt: submission.aiGradedAt,
}));

/** A typed paper the demo grader drafts: the assignment it answers and its text. */
export type DemoDraftable = Pick<SeedPending, "assignmentKey" | "content">;

/**
 * A typed paper's AI draft, computed rather than written by hand: what the
 * demo grader returns for this paper and rubric, validated exactly as
 * runAiFirstPass validates an essay (validateGrading: quotes checked against
 * the paper, relevance and injection flags). Deterministic. Used for the
 * drafts waiting in To review and for the AI side of the approved essays.
 * `criterionIds` maps each rubric criterion key to the id the draft should
 * use: the database id in the seed, the key itself in the dataset checks.
 */
export function demoDraft(record: DemoDraftable, criterionIds: (key: string) => string = (key) => key): ValidatedGrading {
  const assignment = assignmentByKey(record.assignmentKey);
  const input = {
    assignmentTitle: assignment.title,
    instructions: assignment.instructions,
    criteria: assignment.criteria.map((criterion) => ({
      id: criterionIds(criterion.key),
      title: criterion.title,
      description: criterion.description,
      maxPoints: criterion.maxPoints,
    })),
    paper: record.content,
  };
  return validateGrading(gradeWithDemoHeuristics(input), input);
}

/** Quiz answers keyed by question (criterion) key, in question order. */
function quizScores(result: QuizResult): Record<string, HistoryScore> {
  const criteria = assignmentByKey(result.assignmentKey).criteria;
  const scores: Record<string, HistoryScore> = {};
  result.answers.forEach((entry, index) => {
    // An answer without a matching question is reported by the validation.
    const key = criteria[index]?.key ?? `unmatched-answer-${index + 1}`;
    scores[key] = {
      aiScore: entry.aiScore,
      aiJustification: entry.aiJustification,
      aiEvidence: entry.text,
      finalScore: entry.finalScore ?? entry.aiScore,
      finalComment: entry.finalComment,
    };
  });
  return scores;
}

/**
 * A past approval of a typed essay: the demo grader's draft of the paper
 * (demoDraft) next to what the teacher approved (history.ts). A criterion the
 * draft left unscored, or one the rubric does not have, gets a NaN AI score
 * and no quote, which the dataset checks report.
 */
function publishedEssay(entry: PublishedHistoryEntry): SeedPublished {
  const content = PAPERS[entry.paperKey];
  const draft = demoDraft({ assignmentKey: entry.assignmentKey, content });
  const scores: Record<string, HistoryScore> = {};
  for (const [key, teacher] of Object.entries(entry.scores)) {
    const ai = draft.criteria.find((criterion) => criterion.criterionId === key);
    scores[key] = {
      aiScore: ai?.aiScore ?? Number.NaN,
      aiJustification: ai?.justification ?? "",
      aiEvidence: ai?.evidence ?? "",
      ...teacher,
    };
  }
  return {
    assignmentKey: entry.assignmentKey,
    studentKey: entry.studentKey,
    source: "TEXT",
    content,
    fileName: entry.fileName,
    submittedAt: entry.submittedAt,
    aiGradedAt: entry.aiGradedAt,
    approvedAt: entry.approvedAt,
    confidence: draft.confidence,
    overallComment: draft.overallComment,
    feedback: entry.feedback,
    scores,
    requireAdjustment: true,
    demoDrafted: true,
  };
}

export const PUBLISHED: SeedPublished[] = [
  ...PUBLISHED_HISTORY.map(publishedEssay),
  ...QUIZ_RESULTS.map(
    (result): SeedPublished => ({
      assignmentKey: result.assignmentKey,
      studentKey: result.studentKey,
      source: "SCAN",
      content: quizTranscription(result),
      // The camera grader labels a scan by its photo count; history keeps no photos.
      fileName: null,
      // The scan request stores the submission and the AI draft together.
      submittedAt: result.scannedAt,
      aiGradedAt: result.scannedAt,
      approvedAt: result.approvedAt,
      confidence: result.confidence,
      overallComment: result.overallComment,
      feedback: result.feedback,
      scores: quizScores(result),
      requireAdjustment: false,
      demoDrafted: false,
    })
  ),
];

/** Approved totals of a published record, in rubric order. */
export function publishedTotals(record: SeedPublished): { total: number; aiTotal: number; max: number } {
  const criteria = assignmentByKey(record.assignmentKey).criteria;
  return {
    total: sum(criteria.map((criterion) => record.scores[criterion.key]?.finalScore ?? 0)),
    aiTotal: sum(criteria.map((criterion) => record.scores[criterion.key]?.aiScore ?? 0)),
    max: sum(criteria.map((criterion) => criterion.maxPoints)),
  };
}
