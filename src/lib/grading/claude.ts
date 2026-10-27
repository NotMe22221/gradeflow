import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { requestUsageGuard } from "@/lib/ai/guard";
import type { AiFeature } from "@/lib/ai/usage";
import { databaseGradeCache } from "@/lib/grading/cache-store";
import { CLAUDE_REQUEST_BUDGET, ClaudeGrader, parseEffort } from "@/lib/grading/claude-grader";
import { claudeModel } from "@/lib/grading/config";

let sharedClient: Anthropic | null = null;

/**
 * The SDK reads ANTHROPIC_API_KEY on the server. The key is never passed
 * around, logged, or sent to the client.
 */
function getClient(): Anthropic {
  sharedClient ??= new Anthropic({
    maxRetries: CLAUDE_REQUEST_BUDGET.maxRetries,
    timeout: CLAUDE_REQUEST_BUDGET.timeout,
  });
  return sharedClient;
}

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
    client: getClient(),
    model: claudeModel(),
    effort: parseEffort(process.env.ANTHROPIC_EFFORT),
    guard: requestUsageGuard({ sessionToken }),
    cache: useCache ? databaseGradeCache : null,
    feature,
  });
}
