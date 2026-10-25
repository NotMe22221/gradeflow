import "server-only";

import { ClaudeGrader } from "@/lib/grading/claude";
import { activeGraderKind } from "@/lib/grading/config";
import { DemoGrader } from "@/lib/grading/mock";
import type { Grader } from "@/lib/grading/types";

/**
 * The grader for one AI first pass: Claude when ANTHROPIC_API_KEY is set on
 * the server, otherwise the local deterministic demo grader. To add a grader,
 * implement Grader, add its kind to GRADERS and GRADER_LABELS in
 * src/lib/constants.ts, and return it here.
 * Returns a fresh instance per call, so per-run state never leaks between runs.
 */
export function getGrader(): Grader {
  switch (activeGraderKind()) {
    case "claude":
      return new ClaudeGrader();
    case "demo":
      return new DemoGrader();
  }
}
