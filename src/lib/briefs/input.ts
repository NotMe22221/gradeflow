// Build the conference brief's input from a student's record. Pure: safe for
// unit tests. Only teacher-approved PublishedGrade data goes in.

import { cleanBriefText, clipBriefText } from "@/lib/briefs/validate";
import type { BriefInput } from "@/lib/briefs/types";
import { firstName } from "@/lib/format";
import { buildStudentProfile, type StudentProfile, type StudentRecord } from "@/lib/insights/profile";

export const BRIEF_INPUT_LIMITS = {
  /** Most recent approved grades sent to the model (and counted in the basis line). */
  maxGrades: 12,
  maxUpcoming: 5,
  feedbackMax: 800,
  commentMax: 500,
} as const;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function wholePercent(value: number | null): number | null {
  return value === null || !Number.isFinite(value) ? null : Math.round(value);
}

function clippedOrNull(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const cleaned = cleanBriefText(value);
  return cleaned ? clipBriefText(cleaned, max) : null;
}

/** Mean percent with one decimal, or null. */
export function basisAverage(percents: readonly number[]): number | null {
  if (percents.length === 0) return null;
  const average = percents.reduce((sum, value) => sum + value, 0) / percents.length;
  return Math.round(average * 10) / 10;
}

export function buildBriefInput(
  record: StudentRecord,
  now: Date = new Date(),
  profile: StudentProfile = buildStudentProfile(record, now)
): BriefInput {
  // profile.grades is newest first: keep the most recent ones, then present oldest first.
  const recent = profile.grades.slice(0, BRIEF_INPUT_LIMITS.maxGrades).reverse();

  const grades: BriefInput["grades"] = recent.map((grade) => ({
    assignment: grade.title,
    score: grade.totalScore,
    maxScore: grade.maxScore,
    percent: wholePercent(grade.percent),
    publishedOn: isoDay(grade.publishedAt),
    teacherFeedback: clippedOrNull(grade.feedback, BRIEF_INPUT_LIMITS.feedbackMax),
    criteria: grade.breakdown.map((item) => ({
      title: item.title,
      score: item.score,
      maxPoints: item.maxPoints,
      percent: wholePercent(item.maxPoints > 0 ? (item.score / item.maxPoints) * 100 : null),
      teacherComment: clippedOrNull(item.comment, BRIEF_INPUT_LIMITS.commentMax),
    })),
  }));

  const percents = recent.map((grade) => grade.percent).filter((value): value is number => value !== null);

  const upcoming = profile.openWork
    .filter((item) => item.state === "upcoming" || item.state === "not_submitted")
    .slice(0, BRIEF_INPUT_LIMITS.maxUpcoming)
    .map((item) => ({ assignment: item.title, dueOn: item.dueDate ? isoDay(item.dueDate) : null }));

  const round = (skills: StudentProfile["strengths"]) =>
    skills.map((skill) => ({ ...skill, percent: Math.round(skill.percent) }));

  return {
    student: { name: record.student.name, firstName: firstName(record.student.name) },
    class: { name: record.class.name, section: record.class.section, subject: record.class.subject },
    grades,
    strengths: round(profile.strengths),
    growthAreas: round(profile.growthAreas),
    upcoming,
    engagement: {
      currentStreakDays: profile.engagement.streak.current,
      longestStreakDays: profile.engagement.streak.longest,
      level: profile.engagement.level.level,
      totalXp: profile.engagement.level.xp,
    },
    basis: { publishedCount: grades.length, averagePercent: basisAverage(percents) },
  };
}
