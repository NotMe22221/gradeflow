// Gradebook data shapes plus the pure builder that turns database rows into
// them. Pure: safe to import from unit tests and from the CSV exporter (no
// "server-only", no database access).
//
// Scores come ONLY from PublishedGrade (teacher-approved snapshots). The
// builder's input type has no place for AI suggestions or draft edits, so
// they cannot leak into the gradebook or an export.

import { isStaleGradingClaim } from "@/lib/constants";

export type GradebookCellState =
  | "published" // teacher approved; score is set
  | "in_review" // AI draft waiting in the review queue (or mid-approval)
  | "ready" // submitted, AI first pass not run yet (or it failed, or its run was abandoned, and can be retried)
  | "grading" // AI first pass running
  | "returned" // sent back to the student with a note
  | "missing"; // no submission yet

export type GradebookAssignment = {
  id: string;
  title: string;
  /** Sum of the rubric's max points. */
  maxScore: number;
  dueDate: Date | null;
};

export type GradebookCell = {
  assignmentId: string;
  state: GradebookCellState;
  /** The published total. Non-null only when state is "published". */
  score: number | null;
  /** The published snapshot's max for published cells, the rubric max otherwise. */
  maxScore: number;
  /** The student's submission, when there is one (used for review links). */
  submissionId: string | null;
};

/** A class in the gradebook switcher. */
export type GradebookClassOption = { id: string; name: string; section: string | null };

export type GradebookStudent = { id: string; name: string; email: string };

export type GradebookRow = {
  student: GradebookStudent;
  /** One cell per assignment, in the same order as GradebookData.assignments. */
  cells: GradebookCell[];
  /** Mean percent across this student's published grades; null if none. */
  averagePercent: number | null;
};

export type GradebookData = {
  class: { id: string; name: string; section: string | null };
  /**
   * In the order the query returns them: oldest due date first, undated last,
   * ties by creation. The CSV export uses this order; the Grades view shows it
   * reversed (gradebookColumnOrder).
   */
  assignments: GradebookAssignment[];
  /** Enrolled students, sorted by name. */
  rows: GradebookRow[];
  /** Mean percent of published grades per assignment id; null if none. */
  assignmentAverages: Record<string, number | null>;
  /** Mean of the students' averages; null if nothing is published. */
  classAverage: number | null;
};

/** What the query layer hands the builder. Only PublishedGrade totals carry scores. */
export type GradebookSource = {
  class: { id: string; name: string; section: string | null };
  assignments: {
    id: string;
    title: string;
    dueDate: Date | null;
    criteria: { maxPoints: number }[];
  }[];
  students: GradebookStudent[];
  submissions: {
    id: string;
    assignmentId: string;
    studentId: string;
    status: string;
    /** Last status change; lets a stale GRADING claim show as "ready" (see isStaleGradingClaim). */
    updatedAt?: Date;
    publishedGrade: { totalScore: number; maxScore: number } | null;
  }[];
};

/**
 * Map a submission to its gradebook state. A PublishedGrade row is the only
 * thing that makes a cell "published", whatever the status string says. A
 * GRADING claim abandoned mid-grade is "ready", matching the assignment page,
 * which offers Retry for it.
 */
export function cellStateFor(
  status: string | null,
  hasPublishedGrade: boolean,
  updatedAt?: Date | null,
  now: number = Date.now()
): GradebookCellState {
  if (hasPublishedGrade) return "published";
  if (status !== null && updatedAt && isStaleGradingClaim(status, updatedAt, now)) return "ready";
  switch (status) {
    case null:
      return "missing";
    case "SUBMITTED":
    case "GRADING_FAILED":
      return "ready";
    case "GRADING":
      return "grading";
    case "RETURNED":
      return "returned";
    // NEEDS_REVIEW, APPROVED (transient, inside the publish transaction), and
    // a PUBLISHED status without a PublishedGrade row all wait on the teacher.
    default:
      return "in_review";
  }
}

export function percentOf(score: number, max: number): number | null {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return null;
  return (score / max) * 100;
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Indexes into GradebookData.assignments (and each row's cells) in the order
 * the Grades view shows its columns: newest first, like Google Classroom, so a
 * just-created assignment is the first column instead of hiding behind the
 * horizontal scroll. That is the reverse of the export order: undated work
 * leads, then the latest due date.
 */
export function gradebookColumnOrder(data: Pick<GradebookData, "assignments">): number[] {
  return data.assignments.map((_, index) => index).reverse();
}

function compareNames(a: GradebookStudent, b: GradebookStudent): number {
  return a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.email.localeCompare(b.email);
}

/**
 * Build the gradebook grid. Averages weight every assignment equally (mean of
 * percents) and only ever include published grades.
 */
export function buildGradebook(source: GradebookSource, now: number = Date.now()): GradebookData {
  const assignments: GradebookAssignment[] = source.assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    maxScore: assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0),
    dueDate: assignment.dueDate,
  }));

  const submissionByKey = new Map(
    source.submissions.map((submission) => [`${submission.studentId}:${submission.assignmentId}`, submission])
  );
  const percentsByAssignment = new Map<string, number[]>(assignments.map((a) => [a.id, []]));

  const rows: GradebookRow[] = [...source.students].sort(compareNames).map((student) => {
    const studentPercents: number[] = [];
    const cells = assignments.map((assignment): GradebookCell => {
      const submission = submissionByKey.get(`${student.id}:${assignment.id}`);
      const published = submission?.publishedGrade ?? null;
      const state = cellStateFor(submission?.status ?? null, published !== null, submission?.updatedAt, now);

      if (published) {
        const percent = percentOf(published.totalScore, published.maxScore);
        if (percent !== null) {
          studentPercents.push(percent);
          percentsByAssignment.get(assignment.id)?.push(percent);
        }
        return {
          assignmentId: assignment.id,
          state,
          score: published.totalScore,
          maxScore: published.maxScore,
          submissionId: submission?.id ?? null,
        };
      }

      return {
        assignmentId: assignment.id,
        state,
        score: null,
        maxScore: assignment.maxScore,
        submissionId: submission?.id ?? null,
      };
    });

    return { student, cells, averagePercent: mean(studentPercents) };
  });

  const assignmentAverages: Record<string, number | null> = {};
  for (const assignment of assignments) {
    assignmentAverages[assignment.id] = mean(percentsByAssignment.get(assignment.id) ?? []);
  }

  const studentAverages = rows
    .map((row) => row.averagePercent)
    .filter((value): value is number => value !== null);

  return {
    class: source.class,
    assignments,
    rows,
    assignmentAverages,
    classAverage: mean(studentAverages),
  };
}
