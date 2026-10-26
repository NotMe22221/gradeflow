import "server-only";

import { isPastDue } from "@/components/student/student-status";
import { db } from "@/lib/db";
import { awardXp } from "@/lib/gamification/award";
import { submissionXpAwards, type XpAward } from "@/lib/gamification/rules";

const SUBMISSION_KINDS = ["SUBMIT", "ON_TIME", "RESUBMIT"];

/**
 * Award XP after a successful student submission: SUBMIT (+ ON_TIME when the
 * due day has not ended) for a first submission, RESUBMIT for a resubmission
 * after a send-back. Existing rows for this submission (refId + kind) are
 * checked inside the same transaction, so the same kind is never awarded twice.
 * Returns what was awarded. Engagement only: XP never touches the grade.
 */
export async function awardSubmissionXp(input: {
  studentId: string;
  submissionId: string;
  resubmission: boolean;
  dueDate: Date | null;
  now?: Date;
}): Promise<{ total: number; awards: XpAward[] }> {
  const now = input.now ?? new Date();
  // The server's calendar day on purpose (no viewer time zone): XP rules use
  // one day boundary for everyone, and the viewer's zone comes from a cookie.
  const onTime = input.dueDate !== null && !isPastDue(input.dueDate, now);

  return db.$transaction(async (tx) => {
    const existing = await tx.studyActivity.findMany({
      where: { studentId: input.studentId, refId: input.submissionId, kind: { in: SUBMISSION_KINDS } },
      select: { kind: true },
    });
    const awards = submissionXpAwards({
      resubmission: input.resubmission,
      onTime,
      alreadyAwarded: new Set(existing.map((row) => row.kind)),
    });
    const granted: XpAward[] = [];
    for (const award of awards) {
      const xp = await awardXp(tx, {
        studentId: input.studentId,
        kind: award.kind,
        xp: award.xp,
        refId: input.submissionId,
        now,
      });
      if (xp > 0) granted.push({ kind: award.kind, xp });
    }
    return { total: granted.reduce((sum, award) => sum + award.xp, 0), awards: granted };
  });
}
