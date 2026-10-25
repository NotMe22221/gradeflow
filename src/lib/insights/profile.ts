// Student profile model for the teacher's student page and the conference
// brief. Pure: safe for client components, server code, and unit tests. The
// database loader lives in ./student.ts (server only).
//
// Scores come ONLY from PublishedGrade snapshots (teacher-approved). The
// record type has no place for AI suggestions or draft edits. Submission
// status is used for workflow counts only (in review, missing).

import { computeStreak, levelFor, type LevelProgress, type StreakInfo } from "@/lib/gamification/rules";
import { cellStateFor, type GradebookCellState } from "@/lib/gradebook/types";
import type { BreakdownItem } from "@/lib/grades/breakdown";
import { mean, percentOf } from "@/lib/insights/heatmap";

export type StudentRecord = {
  class: { id: string; name: string; section: string | null; subject: string | null };
  student: { id: string; name: string; email: string };
  /** The class's assignments, oldest first. */
  assignments: { id: string; title: string; dueDate: Date | null; maxScore: number }[];
  /** This student's submissions in this class. */
  submissions: {
    id: string;
    assignmentId: string;
    status: string;
    updatedAt: Date;
    published: {
      totalScore: number;
      maxScore: number;
      breakdown: BreakdownItem[];
      feedback: string | null;
      publishedAt: Date;
    } | null;
  }[];
  /** StudyActivity rows (engagement only; never part of a grade). */
  activity: { createdAt: Date; xp: number }[];
};

export type PublishedGradeSummary = {
  submissionId: string;
  assignmentId: string;
  title: string;
  totalScore: number;
  maxScore: number;
  percent: number | null;
  publishedAt: Date;
  feedback: string | null;
  breakdown: BreakdownItem[];
};

export type OpenWorkState = "in_review" | "returned" | "missing" | "upcoming" | "not_submitted";

export type OpenWorkItem = {
  assignmentId: string;
  title: string;
  dueDate: Date | null;
  state: OpenWorkState;
  submissionId: string | null;
};

export type SkillInsight = {
  /** Criterion or question title, as the rubric names it. */
  title: string;
  /** Mean percent earned on it across the approved grades. */
  percent: number;
  /** Assignment titles it was scored on, in order. */
  assignments: string[];
};

export type StudentProfile = {
  stats: {
    /** Mean percent of approved totals (each assignment weighted equally). */
    averagePercent: number | null;
    publishedCount: number;
    /** Submitted and waiting on the teacher (AI pass, review, or approval). */
    inReviewCount: number;
    /** No submission and the due date has passed. */
    missingCount: number;
    returnedCount: number;
  };
  /** Newest first. */
  grades: PublishedGradeSummary[];
  /** Everything that is not published yet, most urgent first. */
  openWork: OpenWorkItem[];
  strengths: SkillInsight[];
  growthAreas: SkillInsight[];
  engagement: { streak: StreakInfo; level: LevelProgress };
};

/** A criterion averaging at least this much is a strength. */
export const STRENGTH_MIN_PERCENT = 80;
/** Growth areas are criteria averaging below this. */
export const GROWTH_MAX_PERCENT = 80;
export const SKILL_LIST_LIMIT = 3;

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Per-criterion percentages across the student's approved grades, merged by
 * criterion title (so "Textual evidence" on two essays is one skill).
 * Strengths: the highest averages at or above STRENGTH_MIN_PERCENT.
 * Growth areas: the lowest averages below GROWTH_MAX_PERCENT. Disjoint by
 * construction.
 */
export function computeSkills(
  grades: readonly Pick<PublishedGradeSummary, "title" | "breakdown">[],
  limit = SKILL_LIST_LIMIT
): { strengths: SkillInsight[]; growthAreas: SkillInsight[] } {
  const groups = new Map<string, { title: string; values: number[]; assignments: string[]; order: number }>();
  let order = 0;
  for (const grade of grades) {
    for (const item of grade.breakdown) {
      const percent = percentOf(item.score, item.maxPoints);
      if (percent === null) continue;
      const key = normalizeTitle(item.title);
      if (!key) continue;
      const group = groups.get(key) ?? { title: item.title.trim(), values: [], assignments: [], order: order++ };
      group.values.push(percent);
      if (!group.assignments.includes(grade.title)) group.assignments.push(grade.title);
      groups.set(key, group);
    }
  }

  const skills = [...groups.values()].map((group) => ({
    title: group.title,
    percent: mean(group.values) as number,
    assignments: group.assignments,
    order: group.order,
  }));

  const strengths = skills
    .filter((skill) => skill.percent >= STRENGTH_MIN_PERCENT)
    .sort((a, b) => b.percent - a.percent || a.order - b.order)
    .slice(0, limit);
  const growthAreas = skills
    .filter((skill) => skill.percent < GROWTH_MAX_PERCENT)
    .sort((a, b) => a.percent - b.percent || a.order - b.order)
    .slice(0, limit);

  const strip = ({ order: _order, ...skill }: SkillInsight & { order: number }): SkillInsight => skill;
  return { strengths: strengths.map(strip), growthAreas: growthAreas.map(strip) };
}

const OPEN_WORK_ORDER: Record<OpenWorkState, number> = {
  missing: 0,
  returned: 1,
  in_review: 2,
  upcoming: 3,
  not_submitted: 4,
};

function openStateFor(state: GradebookCellState, dueDate: Date | null, now: Date): OpenWorkState | null {
  switch (state) {
    case "published":
      return null;
    case "returned":
      return "returned";
    case "missing":
      if (!dueDate) return "not_submitted";
      return dueDate.getTime() < now.getTime() ? "missing" : "upcoming";
    default:
      // in_review, ready (no AI pass yet), grading: submitted, waiting on the teacher.
      return "in_review";
  }
}

export function buildStudentProfile(record: StudentRecord, now: Date = new Date()): StudentProfile {
  const submissionByAssignment = new Map(record.submissions.map((submission) => [submission.assignmentId, submission]));

  const grades: PublishedGradeSummary[] = [];
  const openWork: OpenWorkItem[] = [];

  for (const assignment of record.assignments) {
    const submission = submissionByAssignment.get(assignment.id);
    const published = submission?.published ?? null;
    if (submission && published) {
      grades.push({
        submissionId: submission.id,
        assignmentId: assignment.id,
        title: assignment.title,
        totalScore: published.totalScore,
        maxScore: published.maxScore,
        percent: percentOf(published.totalScore, published.maxScore),
        publishedAt: published.publishedAt,
        feedback: published.feedback?.trim() || null,
        breakdown: published.breakdown,
      });
      continue;
    }
    const state = cellStateFor(submission?.status ?? null, false, submission?.updatedAt, now.getTime());
    const open = openStateFor(state, assignment.dueDate, now);
    if (open) {
      openWork.push({
        assignmentId: assignment.id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        state: open,
        submissionId: submission?.id ?? null,
      });
    }
  }

  // Skills list assignments in class order (oldest first), so compute them before sorting newest first.
  const { strengths, growthAreas } = computeSkills(grades);
  grades.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime() || a.title.localeCompare(b.title));
  openWork.sort(
    (a, b) =>
      OPEN_WORK_ORDER[a.state] - OPEN_WORK_ORDER[b.state] ||
      (a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
      a.title.localeCompare(b.title)
  );

  const percents = grades.map((grade) => grade.percent).filter((value): value is number => value !== null);
  const totalXp = record.activity.reduce((sum, row) => sum + (Number.isFinite(row.xp) ? row.xp : 0), 0);

  return {
    stats: {
      averagePercent: mean(percents),
      publishedCount: grades.length,
      inReviewCount: openWork.filter((item) => item.state === "in_review").length,
      missingCount: openWork.filter((item) => item.state === "missing").length,
      returnedCount: openWork.filter((item) => item.state === "returned").length,
    },
    grades,
    openWork,
    strengths,
    growthAreas,
    engagement: {
      streak: computeStreak(
        record.activity.map((row) => row.createdAt),
        now
      ),
      level: levelFor(totalXp),
    },
  };
}
