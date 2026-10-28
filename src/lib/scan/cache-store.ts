import "server-only";

import { db } from "@/lib/db";
import type { PhotoReadCacheStore } from "@/lib/scan/cache";

/**
 * Saved photo reads in Postgres: the AiGradeCache table, under the "scan:"
 * and "answer-key:" keys (src/lib/scan/cache.ts parses what comes back).
 */
export const databasePhotoReadCache: PhotoReadCacheStore = {
  async get(key) {
    const row = await db.aiGradeCache.findUnique({ where: { key }, select: { result: true } });
    return row?.result ?? null;
  },
  async set(key, parts, json) {
    // Two scans of the same photos can finish together; the first one wins.
    await db.aiGradeCache.upsert({
      where: { key },
      create: { key, ...parts, result: json },
      update: {},
    });
  },
};
