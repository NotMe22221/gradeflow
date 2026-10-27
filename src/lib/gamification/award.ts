import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { activityIdFor } from "@/lib/gamification/activity-id";
import {
  dayBounds,
  dayKey,
  ONCE_PER_DAY,
  ONCE_PER_SUBMISSION,
  xpOnceKey,
  type ActivityKind,
  type XpAward,
} from "@/lib/gamification/rules";

type Client = Prisma.TransactionClient | typeof db;

export type AwardInput = { kind: ActivityKind; xp: number; refId?: string | null };

/*
 * How XP stays "once" without a read-then-write transaction.
 *
 * Once-per-day kinds (STUDY_SESSION, GOAL_SET) and once-per-submission kinds
 * (SUBMIT, ON_TIME, RESUBMIT, GRADE_PUBLISHED) are stored under a primary key
 * derived from what makes them the same award (xpOnceKey() in rules.ts), and
 * inserted with ON CONFLICT DO NOTHING. A second copy of the same award,
 * even from a request running at the same moment, hits the key and is
 * skipped by the database itself.
 *
 * The earlier design read "already earned today?" inside a SERIALIZABLE
 * transaction. On Postgres those predicate reads lock whole index pages, so
 * unrelated students awarding XP at the same moment aborted each other. An
 * insert keyed like this takes no predicate locks: unrelated awards never
 * conflict, and XP needs no transaction of its own.
 *
 * Rows written before these keys existed have random ids, so
 * unearnedAwards() still checks the student's existing rows first. That is a
 * plain read outside any transaction: older rows never change, and every
 * newer row carries its key, so the check plus the keyed insert together
 * give exactly the old "once" rules.
 */

/**
 * Step 1, before any transaction: the awards the student has not earned yet.
 * Uses the shared client on purpose, never a transaction (it must not take
 * SERIALIZABLE predicate locks, and a transaction holding one pooled
 * connection must not wait for a second one).
 */
export async function unearnedAwards(input: {
  studentId: string;
  awards: AwardInput[];
  now: Date;
}): Promise<AwardInput[]> {
  const { start, end } = dayBounds(input.now);
  const today = dayKey(input.now);
  const conditions: Prisma.StudyActivityWhereInput[] = [];
  for (const award of input.awards) {
    if (ONCE_PER_DAY.includes(award.kind)) {
      conditions.push({ kind: award.kind, createdAt: { gte: start, lt: end } });
    } else if (ONCE_PER_SUBMISSION.includes(award.kind) && award.refId) {
      conditions.push({ kind: award.kind, refId: award.refId });
    }
  }
  if (conditions.length === 0) return input.awards;

  const earned = await db.studyActivity.findMany({
    where: { studentId: input.studentId, OR: conditions },
    select: { kind: true, refId: true, createdAt: true },
  });
  const alreadyEarned = (award: AwardInput) =>
    earned.some((row) => {
      if (row.kind !== award.kind) return false;
      if (ONCE_PER_DAY.includes(award.kind)) return dayKey(row.createdAt) === today;
      return Boolean(award.refId) && row.refId === award.refId;
    });
  return input.awards.filter((award) => !alreadyEarned(award));
}

/**
 * Step 2: store the awards in one INSERT ... ON CONFLICT DO NOTHING, inside
 * the caller's transaction or on its own. Awards whose once key is already
 * stored are skipped. Returns what was actually stored, in input order.
 * XP is engagement only: it never touches grades.
 */
export async function insertAwards(
  client: Client,
  input: { studentId: string; awards: AwardInput[]; now: Date }
): Promise<XpAward[]> {
  const rows = input.awards
    .filter((award) => award.xp > 0)
    .map((award) => {
      const key = xpOnceKey({ studentId: input.studentId, kind: award.kind, refId: award.refId, now: input.now });
      return { award, id: key ? activityIdFor(key) : null };
    });
  if (rows.length === 0) return [];
  const created = await client.studyActivity.createManyAndReturn({
    data: rows.map(({ award, id }) => ({
      // No once rule: a fresh cuid, so the row is always stored.
      ...(id ? { id } : {}),
      studentId: input.studentId,
      kind: award.kind,
      xp: award.xp,
      refId: award.refId ?? null,
      createdAt: input.now,
    })),
    skipDuplicates: true,
    select: { id: true },
  });
  const stored = new Set(created.map((row) => row.id));
  return rows
    .filter(({ id }) => id === null || stored.has(id))
    .map(({ award }) => ({ kind: award.kind, xp: award.xp }));
}

/**
 * Record one XP-earning action for a student, on its own (no transaction).
 * Once-per-day kinds are skipped when already earned today, and
 * once-per-submission kinds when already earned for that submission.
 * Returns the XP awarded (0 when skipped).
 *
 * "Today" is the server's calendar day (dayKey in rules.ts), the same day the
 * streak and "Study session logged today" use.
 */
export async function awardXp(input: {
  studentId: string;
  kind: ActivityKind;
  xp: number;
  refId?: string | null;
  now?: Date;
}): Promise<number> {
  const now = input.now ?? new Date();
  if (input.xp <= 0) return 0;
  const award: AwardInput = { kind: input.kind, xp: input.xp, refId: input.refId ?? null };
  const pending = await unearnedAwards({ studentId: input.studentId, awards: [award], now });
  const stored = await insertAwards(db, { studentId: input.studentId, awards: pending, now });
  return stored.reduce((sum, row) => sum + row.xp, 0);
}
