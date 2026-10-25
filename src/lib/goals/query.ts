import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { GoalClass } from "@/lib/goals/types";
import { buildGoalClass, type GoalClassSource } from "@/lib/goals/view";

/**
 * What the planner reads for one class: assignments, rubric points, and ONLY
 * this student's own submission status and teacher-approved PublishedGrade.
 * No AI suggestion, confidence, or draft edit is ever selected.
 */
export function goalClassSelect(studentId: string) {
  return {
    id: true,
    name: true,
    section: true,
    subject: true,
    assignments: {
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        kind: true,
        dueDate: true,
        criteria: { select: { maxPoints: true } },
        submissions: {
          where: { studentId },
          take: 1,
          select: {
            status: true,
            publishedGrade: { select: { totalScore: true, maxScore: true, breakdown: true } },
          },
        },
      },
    },
  } satisfies Prisma.ClassSelect;
}

type GoalClassRow = Prisma.ClassGetPayload<{ select: ReturnType<typeof goalClassSelect> }>;

export function toGoalClassSource(row: GoalClassRow): GoalClassSource {
  return {
    id: row.id,
    name: row.name,
    section: row.section,
    subject: row.subject,
    assignments: row.assignments.map((assignment) => {
      const submission = assignment.submissions[0] ?? null;
      return {
        id: assignment.id,
        title: assignment.title,
        kind: assignment.kind,
        dueDate: assignment.dueDate,
        criteria: assignment.criteria,
        submission: submission ? { status: submission.status, published: submission.publishedGrade } : null,
      };
    }),
  };
}

/** The signed-in student's classes (enrollments only), with their own approved grades. */
export async function loadGoalClasses(studentId: string, now: Date = new Date()): Promise<GoalClass[]> {
  const enrollments = await db.enrollment.findMany({
    where: { studentId },
    orderBy: { class: { name: "asc" } },
    select: { class: { select: goalClassSelect(studentId) } },
  });
  return enrollments.map((enrollment) => buildGoalClass(toGoalClassSource(enrollment.class), now));
}

/** This student's saved goals in classes they are still enrolled in, newest first. */
export async function loadSavedGoals(studentId: string) {
  return db.studentGoal.findMany({
    where: { studentId, class: { enrollments: { some: { studentId } } } },
    orderBy: { updatedAt: "desc" },
    select: { classId: true, rawText: true, targetPercent: true, targetLabel: true, updatedAt: true },
  });
}
