// Class heatmap: where a class is losing points, per rubric criterion or test
// question, built ONLY from teacher-approved PublishedGrade snapshots.
// Pure: safe for client components, server code, and unit tests. The database
// query lives in ./query.ts (server only).
//
// The source type has no place for AI suggestions or draft edits, so an
// unapproved score can never reach the heatmap or the "most missed" ranking.

import { parseBreakdown, type BreakdownItem } from "@/lib/grades/breakdown";

/** A criterion needs at least this many graded students to be ranked as "most missed". */
export const MOST_MISSED_MIN_SAMPLE = 2;
/** How many criteria the "most missed" ranking keeps. */
export const MOST_MISSED_LIMIT = 5;

export type HeatmapStudent = { id: string; name: string; email: string };

export type HeatmapClass = { id: string; name: string; section: string | null };

/** What the query layer hands the builder. Scores come only from PublishedGrade. */
export type HeatmapSource = {
  class: HeatmapClass;
  /** In display order (oldest first). */
  assignments: {
    id: string;
    title: string;
    criteria: { id: string; title: string; maxPoints: number; position: number }[];
  }[];
  /** Enrolled students. */
  students: HeatmapStudent[];
  /** PublishedGrade rows for this class (teacher-approved snapshots). */
  grades: {
    assignmentId: string;
    studentId: string;
    totalScore: number;
    maxScore: number;
    /** PublishedGrade.breakdown, raw JSON or already parsed. */
    breakdown: string | BreakdownItem[] | null;
  }[];
};

export type HeatmapColumn = {
  /** `${assignmentId}:${criterionId}`, unique across the heatmap. */
  key: string;
  assignmentId: string;
  assignmentTitle: string;
  criterionId: string;
  title: string;
  maxPoints: number;
  /** Mean percent earned across graded students; null when nobody is graded. */
  average: number | null;
  /** How many enrolled students have an approved score for this criterion. */
  sampleSize: number;
};

export type HeatmapGroup = {
  assignmentId: string;
  title: string;
  columns: HeatmapColumn[];
  /** Mean of the approved totals (percent) for this assignment. */
  average: number | null;
  /** Enrolled students with an approved grade for this assignment. */
  gradedCount: number;
};

export type HeatmapRow = {
  student: HeatmapStudent;
  /** One value per column, aligned with ClassHeatmap.columns. null = no approved grade. */
  cells: (number | null)[];
  /** Mean percent of this student's approved totals across the shown assignments. */
  average: number | null;
  gradedCount: number;
};

export type MostMissedItem = {
  key: string;
  classId: string;
  className: string;
  assignmentId: string;
  assignmentTitle: string;
  criterionId: string;
  title: string;
  maxPoints: number;
  average: number;
  sampleSize: number;
};

export type ClassHeatmap = {
  class: HeatmapClass;
  /** Assignments with at least one approved grade from an enrolled student. */
  groups: HeatmapGroup[];
  /** Every column of every group, flattened in display order. */
  columns: HeatmapColumn[];
  /** Enrolled students, sorted by name. */
  rows: HeatmapRow[];
  mostMissed: MostMissedItem[];
  /** Assignments left out because nothing is approved for them yet. */
  hiddenAssignmentCount: number;
  /** Approved grades shown in the heatmap. */
  publishedCount: number;
  /** Mean of the students' averages; null when nothing is approved. */
  classAverage: number | null;
};

export function percentOf(score: number, max: number): number | null {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return null;
  return Math.min(100, Math.max(0, (score / max) * 100));
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function compareStudents(a: HeatmapStudent, b: HeatmapStudent): number {
  return a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.email.localeCompare(b.email);
}

function breakdownOf(raw: HeatmapSource["grades"][number]["breakdown"]): BreakdownItem[] {
  return Array.isArray(raw) ? raw : parseBreakdown(raw);
}

type ColumnDraft = { criterionId: string; title: string; maxPoints: number };

/**
 * Build the class heatmap. Rows are enrolled students; columns are the rubric
 * criteria (or test questions) of every assignment that has at least one
 * approved grade. A cell is the percent of that criterion's points the
 * student earned in the approved snapshot, or null without an approved grade.
 */
export function buildHeatmap(
  source: HeatmapSource,
  options: { minSample?: number; limit?: number } = {}
): ClassHeatmap {
  const enrolled = new Set(source.students.map((student) => student.id));

  // One approved grade per (student, assignment); grades of students no longer
  // enrolled are ignored, so every number below matches a visible row.
  const gradeByKey = new Map<string, { totalScore: number; maxScore: number; items: Map<string, BreakdownItem> }>();
  const gradesByAssignment = new Map<string, BreakdownItem[][]>();
  for (const grade of source.grades) {
    if (!enrolled.has(grade.studentId)) continue;
    const items = breakdownOf(grade.breakdown);
    gradeByKey.set(`${grade.studentId}:${grade.assignmentId}`, {
      totalScore: grade.totalScore,
      maxScore: grade.maxScore,
      items: new Map(items.map((item) => [item.criterionId, item])),
    });
    const list = gradesByAssignment.get(grade.assignmentId) ?? [];
    list.push(items);
    gradesByAssignment.set(grade.assignmentId, list);
  }

  const students = [...source.students].sort(compareStudents);

  const groups: HeatmapGroup[] = [];
  let hiddenAssignmentCount = 0;
  for (const assignment of source.assignments) {
    const graded = gradesByAssignment.get(assignment.id);
    if (!graded || graded.length === 0) {
      hiddenAssignmentCount++;
      continue;
    }

    // Rubric order first; a criterion that only exists in an approved snapshot
    // (the rubric changed after approval) is appended with its snapshot label.
    const drafts: ColumnDraft[] = [...assignment.criteria]
      .sort((a, b) => a.position - b.position)
      .map((criterion) => ({ criterionId: criterion.id, title: criterion.title, maxPoints: criterion.maxPoints }));
    const known = new Set(drafts.map((draft) => draft.criterionId));
    for (const items of graded) {
      for (const item of items) {
        if (known.has(item.criterionId)) continue;
        known.add(item.criterionId);
        drafts.push({ criterionId: item.criterionId, title: item.title, maxPoints: item.maxPoints });
      }
    }
    if (drafts.length === 0) {
      hiddenAssignmentCount++;
      continue;
    }

    const totals: number[] = [];
    for (const student of students) {
      const grade = gradeByKey.get(`${student.id}:${assignment.id}`);
      const percent = grade ? percentOf(grade.totalScore, grade.maxScore) : null;
      if (percent !== null) totals.push(percent);
    }

    const columns = drafts.map((draft): HeatmapColumn => {
      const values: number[] = [];
      for (const student of students) {
        const item = gradeByKey.get(`${student.id}:${assignment.id}`)?.items.get(draft.criterionId);
        const percent = item ? percentOf(item.score, item.maxPoints) : null;
        if (percent !== null) values.push(percent);
      }
      return {
        key: `${assignment.id}:${draft.criterionId}`,
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        criterionId: draft.criterionId,
        title: draft.title,
        maxPoints: draft.maxPoints,
        average: mean(values),
        sampleSize: values.length,
      };
    });

    groups.push({
      assignmentId: assignment.id,
      title: assignment.title,
      columns,
      average: mean(totals),
      gradedCount: graded.length,
    });
  }

  const columns = groups.flatMap((group) => group.columns);

  let publishedCount = 0;
  const rows: HeatmapRow[] = students.map((student) => {
    const totals: number[] = [];
    for (const group of groups) {
      const grade = gradeByKey.get(`${student.id}:${group.assignmentId}`);
      if (!grade) continue;
      publishedCount++;
      const percent = percentOf(grade.totalScore, grade.maxScore);
      if (percent !== null) totals.push(percent);
    }
    const cells = columns.map((column) => {
      const item = gradeByKey.get(`${student.id}:${column.assignmentId}`)?.items.get(column.criterionId);
      return item ? percentOf(item.score, item.maxPoints) : null;
    });
    return { student, cells, average: mean(totals), gradedCount: totals.length };
  });

  const studentAverages = rows.map((row) => row.average).filter((value): value is number => value !== null);

  return {
    class: source.class,
    groups,
    columns,
    rows,
    mostMissed: rankMostMissed(
      columns.map((column) => ({ ...column, classId: source.class.id, className: source.class.name })),
      options
    ),
    hiddenAssignmentCount,
    publishedCount,
    classAverage: mean(studentAverages),
  };
}

/**
 * The criteria with the lowest class average, among those with at least
 * `minSample` graded students. Ties go to the larger sample, then to display
 * order, so the ranking is stable.
 */
export function rankMostMissed(
  columns: readonly (HeatmapColumn & { classId: string; className: string })[],
  { minSample = MOST_MISSED_MIN_SAMPLE, limit = MOST_MISSED_LIMIT }: { minSample?: number; limit?: number } = {}
): MostMissedItem[] {
  return columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.average !== null && column.sampleSize >= Math.max(1, minSample))
    .sort(
      (a, b) =>
        (a.column.average as number) - (b.column.average as number) ||
        b.column.sampleSize - a.column.sampleSize ||
        a.index - b.index
    )
    .slice(0, Math.max(0, limit))
    .map(({ column }) => ({
      key: column.key,
      classId: column.classId,
      className: column.className,
      assignmentId: column.assignmentId,
      assignmentTitle: column.assignmentTitle,
      criterionId: column.criterionId,
      title: column.title,
      maxPoints: column.maxPoints,
      average: column.average as number,
      sampleSize: column.sampleSize,
    }));
}

// --- Color scale ---------------------------------------------------------------

/**
 * Sequential bands for the heatmap, low to high. The band is chosen from the
 * ROUNDED percent so a cell that reads "50%" is always in the 50% band.
 * The percent is always printed in the cell: color is never the only signal.
 */
export const HEAT_BANDS = [
  { key: "lowest", min: 0, label: "Below 50%" },
  { key: "low", min: 50, label: "50–64%" },
  { key: "mid", min: 65, label: "65–79%" },
  { key: "high", min: 80, label: "80–89%" },
  { key: "highest", min: 90, label: "90–100%" },
] as const;

export type HeatBand = (typeof HEAT_BANDS)[number]["key"] | "empty";

export function roundPercent(percent: number): number {
  return Math.round(Math.min(100, Math.max(0, percent)));
}

export function heatBand(percent: number | null | undefined): HeatBand {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) return "empty";
  const rounded = roundPercent(percent);
  let band: HeatBand = HEAT_BANDS[0].key;
  for (const candidate of HEAT_BANDS) {
    if (rounded >= candidate.min) band = candidate.key;
  }
  return band;
}

/** "50%", or "–" for an empty cell. */
export function formatHeatPercent(percent: number | null | undefined): string {
  return percent === null || percent === undefined || !Number.isFinite(percent) ? "–" : `${roundPercent(percent)}%`;
}

/** Screen-reader label for one cell, e.g. "Ava Quillon, Q5 Vocabulary in context: 50%". */
export function heatCellLabel(studentName: string, criterionTitle: string, percent: number | null): string {
  const value = percent === null ? "no approved grade" : formatHeatPercent(percent);
  return `${studentName}, ${criterionTitle}: ${value}`;
}

export type AverageBandCount = { key: Exclude<HeatBand, "empty">; label: string; count: number };

/**
 * How many students' averages fall in each heat band (low to high, every band
 * listed even when empty), plus how many students have no approved grade yet.
 * Uses heatBand(), so a student whose average reads "80%" counts as 80–89%.
 */
export function averageDistribution(rows: readonly Pick<HeatmapRow, "average">[]): {
  bands: AverageBandCount[];
  graded: number;
  ungraded: number;
} {
  const counts = new Map<HeatBand, number>();
  let ungraded = 0;
  for (const row of rows) {
    const band = heatBand(row.average);
    if (band === "empty") ungraded++;
    else counts.set(band, (counts.get(band) ?? 0) + 1);
  }
  const bands = HEAT_BANDS.map((band) => ({ key: band.key, label: band.label, count: counts.get(band.key) ?? 0 }));
  return { bands, graded: rows.length - ungraded, ungraded };
}
