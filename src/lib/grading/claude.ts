import "server-only";

import { getAnthropic } from "@/lib/ai/anthropic";
import { requestUsageGuard } from "@/lib/ai/guard";
import type { AiFeature } from "@/lib/ai/usage";
import { databaseGradeCache } from "@/lib/grading/cache-store";
import { ClaudeGrader, parseEffort } from "@/lib/grading/claude-grader";
import { claudeModel } from "@/lib/grading/config";

/**
 * The Claude grader for one request: the shared client, the configured model
 * and effort (the same resolution getGraderInfo() shows in the UI), the
 * usage caps, and the saved-result cache. The try-it sandbox passes its own
 * session token, its feature tag, and no shared cache, so a visitor's pasted
 * text is kept only in the sandbox, which expires.
 */
export function createClaudeGrader({
  sessionToken,
  feature,
  useCache = true,
}: { sessionToken?: string; feature?: AiFeature; useCache?: boolean } = {}): ClaudeGrader {
  return new ClaudeGrader({
    client: getAnthropic(),
    model: claudeModel(),
    effort: parseEffort(process.env.ANTHROPIC_EFFORT),
    guard: requestUsageGuard({ sessionToken }),
    cache: useCache ? databaseGradeCache : null,
    feature,
  });
}
