import "server-only";

import { transaction, db } from "@/lib/db";
import { HOUR_MS, startOfUtcDay, type UsageStore } from "@/lib/ai/usage";

/**
 * The usage ledger in Postgres (the AiCall table). Shared by every server
 * instance, so the caps hold on a serverless host where in-memory counters
 * would not. A reservation reads the counts and inserts its row in one
 * SERIALIZABLE transaction (lib/db.ts), so two concurrent calls can't both
 * take the last slot under a cap: Postgres aborts one, and its retry sees the
 * other's row.
 */
export const databaseUsageStore: UsageStore = {
  async reserve(subject, call, now, decide) {
    const hourAgo = new Date(now.getTime() - HOUR_MS);
    const dayStart = startOfUtcDay(now);
    return transaction(async (tx) => {
      const session = await tx.aiCall.aggregate({
        where: { sessionKey: subject.sessionKey, createdAt: { gt: hourAgo } },
        _count: { _all: true },
        _min: { createdAt: true },
      });
      const ip = await tx.aiCall.aggregate({
        where: { ipKey: subject.ipKey, createdAt: { gt: hourAgo } },
        _count: { _all: true },
        _min: { createdAt: true },
      });
      const day = await tx.aiCall.aggregate({
        where: { createdAt: { gte: dayStart } },
        _count: { _all: true },
        _sum: { costMicroUsd: true },
      });

      const decision = decide({
        sessionCalls: session._count._all,
        sessionOldest: session._min.createdAt,
        ipCalls: ip._count._all,
        ipOldest: ip._min.createdAt,
        dayCalls: day._count._all,
        daySpendMicroUsd: day._sum.costMicroUsd ?? 0,
      });
      if (!decision.ok) return decision;

      const row = await tx.aiCall.create({
        data: {
          provider: call.provider,
          feature: call.feature,
          model: call.model,
          userId: subject.userId,
          sessionKey: subject.sessionKey,
          ipKey: subject.ipKey,
          costMicroUsd: call.reserveMicroUsd,
          createdAt: now,
        },
        select: { id: true },
      });
      return { ok: true as const, id: row.id };
    });
  },

  async settle(id, settlement, now) {
    await db.aiCall.update({
      where: { id },
      data: {
        status: settlement.status,
        model: settlement.model,
        costMicroUsd: settlement.costMicroUsd,
        inputTokens: settlement.usage?.inputTokens ?? null,
        outputTokens: settlement.usage?.outputTokens ?? null,
        settledAt: now,
      },
    });
  },
};
