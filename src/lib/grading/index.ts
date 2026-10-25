import "server-only";

import { ClaudeGrader } from "@/lib/grading/claude";
import { DemoGrader } from "@/lib/grading/mock";
import type { Grader } from "@/lib/grading/types";

/**
 * The grader for one AI first pass: Claude when ANTHROPIC_API_KEY is set on
 * the server, otherwise the local deterministic demo grader. Mirrors
 * getGraderInfo() in config.ts, which the UI uses to label the active grader.
 * Returns a fresh instance per call, so per-run state never leaks between runs.
 */
export function getGrader(): Grader {
  return process.env.ANTHROPIC_API_KEY ? new ClaudeGrader() : new DemoGrader();
}
