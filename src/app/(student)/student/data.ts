import "server-only";

import type { InboxAssignment } from "@/components/student/inbox-model";
import { isAwaitingScan, isOverdue, studentStateFor } from "@/components/student/student-status";
import { parseAssignmentKind } from "@/lib/constants";
import { db } from "@/lib/db";
import { demoCoachingTip } from "@/lib/goals/coaching";
import { planGoal } from "@/lib/goals/plan";
import { loadSavedGoals } from "@/lib/goals/query";
import type { GoalClass, GoalPlanView } from "@/lib/goals/types";
import { buildGoalClass, buildPlanView } from "@/lib/goals/view";

export type DashboardClass = { id: string; name: string; section: string | null };

export type StudentDashboardData = {
  classes: DashboardClass[];
  inbox: InboxAssignment[];
  goalClasses: GoalClass[];
};

function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

/**
 * Everything the student dashboard shows, for the signed-in student only:
 * their classes (enrollments), assignments, their own submission status, and
 * teacher-approved PublishedGrade totals and breakdowns. No AI suggestion,
 * confidence, flag, or draft edit is ever selected.
 */
export async function loadStudentDashboard(studentId: string, now: Date): Promise<StudentDashboardData> {
  const enrollments = await db.enrollment.findMany({
    where: { studentId },
    orderBy: { class: { name: "asc" } },
    select: {
      class: {
        select: {
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
              criteria: { orderBy: { position: "asc" }, select: { id: true, title: true, maxPoints: true } },
              submissions: {
                where: { studentId },
                take: 1,
                select: {
                  status: true,
                  submittedAt: true,
                  publishedGrade: {
                    select: { totalScore: true, maxScore: true, breakdown: true, publishedAt: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const classes: DashboardClass[] = [];
  const inbox: InboxAssignment[] = [];
  const goalClasses: GoalClass[] = [];

  for (const { class: klass } of enrollments) {
    classes.push({ id: klass.id, name: klass.name, section: klass.section });

    for (const assignment of klass.assignments) {
      const submission = assignment.submissions[0] ?? null;
      const published = submission?.publishedGrade ?? null;
      const state = studentStateFor(submission?.status, published !== null);
      const kind = parseAssignmentKind(assignment.kind);
      inbox.push({
        id: assignment.id,
        title: assignment.title,
        classId: klass.id,
        className: klass.name,
        kind,
        dueDate: iso(assignment.dueDate),
        submittedAt: iso(submission?.submittedAt),
        publishedAt: iso(published?.publishedAt),
        // A paper test is never overdue: the student can't submit one.
        pastDue: isOverdue(kind, state, assignment.dueDate, now),
        awaitingScan: isAwaitingScan(kind, state, assignment.dueDate, now),
        state,
        score: published ? { total: published.totalScore, max: published.maxScore } : null,
        totalPoints: assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0),
        criteria: assignment.criteria,
      });
    }

    goalClasses.push(
      buildGoalClass(
        {
          id: klass.id,
          name: klass.name,
          section: klass.section,
          subject: klass.subject,
          assignments: klass.assignments.map((assignment) => {
            const submission = assignment.submissions[0] ?? null;
            return {
              id: assignment.id,
              title: assignment.title,
              kind: assignment.kind,
              dueDate: assignment.dueDate,
              criteria: assignment.criteria,
              submission: submission
                ? { status: submission.status, published: submission.publishedGrade }
                : null,
            };
          }),
        },
        now
      )
    );
  }

  return { classes, inbox, goalClasses };
}

/**
 * The student's saved goals, re-planned against their current approved
 * grades (so a newly published grade updates the numbers). The tip is the
 * built-in template: nothing here is AI output.
 */
export async function loadSavedPlans(studentId: string, goalClasses: GoalClass[]): Promise<GoalPlanView[]> {
  const saved = await loadSavedGoals(studentId);
  const plans: GoalPlanView[] = [];
  for (const goal of saved) {
    const goalClass = goalClasses.find((klass) => klass.id === goal.classId);
    if (!goalClass) continue;
    const plan = planGoal({
      targetPercent: goal.targetPercent,
      completed: goalClass.completed,
      remaining: goalClass.remaining,
    });
    plans.push(
      buildPlanView({
        goalClass,
        goalText: goal.rawText,
        target: { percent: goal.targetPercent, label: goal.targetLabel },
        plan,
        coachingTip: demoCoachingTip(goalClass.weakest, plan.status),
        tipSource: "template",
        savedAt: goal.updatedAt,
      })
    );
  }
  return plans;
}
