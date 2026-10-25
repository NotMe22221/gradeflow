import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { dayKey, ONCE_PER_DAY, type ActivityKind } from "@/lib/gamification/rules";

type Client = Prisma.TransactionClient | typeof db;

/**
 * Record one XP-earning action for a student. Once-per-day kinds are skipped
 * when already earned today. Returns the XP awarded (0 when skipped).
 * XP is engagement only: it never touches grades.
 */
export async function awardXp(
  client: Client,
  input: { studentId: string; kind: ActivityKind; xp: number; refId?: string | null; now?: Date }
): Promise<number> {
  const now = input.now ?? new Date();
  if (input.xp <= 0) return 0;
  if (ONCE_PER_DAY.includes(input.kind)) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const existing = await client.studyActivity.findFirst({
      where: { studentId: input.studentId, kind: input.kind, createdAt: { gte: start } },
      select: { createdAt: true },
    });
    if (existing && dayKey(existing.createdAt) === dayKey(now)) return 0;
  }
  await client.studyActivity.create({
    data: { studentId: input.studentId, kind: input.kind, xp: input.xp, refId: input.refId ?? null, createdAt: now },
  });
  return input.xp;
}
