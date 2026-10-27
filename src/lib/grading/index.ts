import "server-only";

import { createClaudeGrader } from "@/lib/grading/claude";
import { activeGraderKind } from "@/lib/grading/config";
import { DemoGrader } from "@/lib/grading/mock";
import type { Grader } from "@/lib/grading/types";

/**
 * The grader for one AI first pass: Claude when ANTHROPIC_API_KEY is set on
 * the server and the kill switch (AI_KILL_SWITCH) is off, otherwise the local
 * deterministic demo grader. To add a grader,
 * implement Grader, add its kind to GRADERS and GRADER_LABELS in
 * src/lib/constants.ts, and return it here.
 * Returns a fresh instance per call, so per-run state never leaks between runs.
 */
export function getGrader(): Grader {
  switch (activeGraderKind()) {
    case "claude":
      return createClaudeGrader();
    case "demo":
      return new DemoGrader();
  }
}
