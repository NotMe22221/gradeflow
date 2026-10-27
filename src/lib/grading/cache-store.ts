import "server-only";

import { db } from "@/lib/db";
import { parseCachedGrade, type GradeCacheStore } from "@/lib/grading/cache";

/** Saved first passes in Postgres (the AiGradeCache table). */
export const databaseGradeCache: GradeCacheStore = {
  async get(key) {
    const row = await db.aiGradeCache.findUnique({ where: { key }, select: { result: true } });
    return row ? parseCachedGrade(row.result) : null;
  },
  async set(key, parts, value) {
    // Two runs of the same paper can finish together; the first one wins.
    await db.aiGradeCache.upsert({
      where: { key },
      create: { key, ...parts, result: JSON.stringify(value) },
      update: {},
    });
  },
};
