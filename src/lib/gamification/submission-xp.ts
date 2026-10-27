import "server-only";

import { isPastDue } from "@/components/student/student-status";
import { db } from "@/lib/db";
import { insertAwards } from "@/lib/gamification/award";
import { submissionXpAwards, type XpAward } from "@/lib/gamification/rules";

const SUBMISSION_KINDS = ["SUBMIT", "ON_TIME", "RESUBMIT"];

/**
 * Award XP after a successful student submission: SUBMIT (+ ON_TIME when the
 * due day has not ended) for a first submission, RESUBMIT for a resubmission
 * after a send-back. A submission never earns the same kind twice: kinds it
 * already has are skipped, and each award is stored under a key made from
 * the kind and the submission (see award.ts), so even two requests at the
 * same moment store it once. No transaction: one INSERT ... ON CONFLICT DO
 * NOTHING, so unrelated students submitting together never conflict.
 * Returns what was awarded. Engagement only: XP never touches the grade.
 */
export async function awardSubmissionXp(input: {
  studentId: string;
  submissionId: string;
  resubmission: boolean;
  dueDate: Date | null;
  /** The viewer's validated zone (viewerTimeZone()), so the bonus matches the "Due today" / Missing they saw. */
  timeZone?: string;
  now?: Date;
}): Promise<{ total: number; awards: XpAward[] }> {
  const now = input.now ?? new Date();
  // The shared past-due rule in the viewer's zone. safeTimeZone() accepts only
  // real IANA zones, so a forged cookie can stretch "on time" by at most the
  // spread of real zones (about a day); XP is engagement only.
  const onTime = input.dueDate !== null && !isPastDue(input.dueDate, now, input.timeZone);

  // A plain read, outside any transaction: it finds kinds earned before the
  // keyed inserts existed. Newer rows are caught by their key on insert.
  const existing = await db.studyActivity.findMany({
    where: { studentId: input.studentId, refId: input.submissionId, kind: { in: SUBMISSION_KINDS } },
    select: { kind: true },
  });
  const awards = submissionXpAwards({
    resubmission: input.resubmission,
    onTime,
    alreadyAwarded: new Set(existing.map((row) => row.kind)),
  });
  const granted = await insertAwards(db, {
    studentId: input.studentId,
    awards: awards.map((award) => ({ ...award, refId: input.submissionId })),
    now,
  });
  return { total: granted.reduce((sum, award) => sum + award.xp, 0), awards: granted };
}
