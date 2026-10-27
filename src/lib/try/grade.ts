import "server-only";

import { aiKillSwitchOn, readUsageLimits, remainingCalls } from "@/lib/ai/usage";
import { readUsageSnapshot } from "@/lib/ai/usage-store";
import { usageSubject } from "@/lib/auth/session";
import type { TemplateId } from "@/lib/demo/templates";
import { paperHash } from "@/lib/grading/cache";
import { createClaudeGrader } from "@/lib/grading/claude";
import { activeGraderKind, claudeModel } from "@/lib/grading/config";
import { DemoGrader } from "@/lib/grading/mock";
import { validateGrading } from "@/lib/grading/validate";
import { checkRunLimits, findSameRun, saveRun } from "@/lib/try/sandbox";
import { tryItInput, type TryItAllowance, type TryItEngine, type TryItResult } from "@/lib/try/types";

/** The engine a try would use right now: Claude with a key and the kill switch off, else the demo grader. */
export function sandboxEngine(): TryItEngine {
  return activeGraderKind() === "claude" ? { kind: "claude", model: claudeModel() } : { kind: "demo", model: null };
}

/**
 * Grade a pasted paper in this browser's sandbox. The same paper and rubric
 * graded again within the sandbox's lifetime is shown again rather than paid
 * for again. A live call goes through the usage caps under the sandbox's own
 * session (an AiLimitError reaches the route). It is validated exactly like
 * a submitted paper. Nothing is written outside the sandbox and the usage
 * ledger. Each sandbox and network saves a limited number of runs an hour
 * (SandboxLimitError), whichever engine grades.
 */
export async function gradeInSandbox(token: string, templateId: TemplateId, paper: string): Promise<TryItResult> {
  const engine = sandboxEngine();
  const hash = paperHash(paper);
  const same = await findSameRun(token, { templateId, paperHash: hash, engine });
  if (same) return same;

  const { ipKey } = await usageSubject({ sessionToken: token });
  await checkRunLimits(token, ipKey);
  const input = tryItInput(templateId, paper);
  const grader =
    engine.kind === "claude"
      ? createClaudeGrader({ sessionToken: token, feature: "try_it", useCache: false })
      : new DemoGrader();
  const grading = validateGrading(await grader.grade(input), input);
  return saveRun(token, ipKey, { templateId, paper, paperHash: hash, engine, grading });
}

/** The engine, the caps, and how many live tries this visitor has left. */
export async function sandboxAllowance(token: string | null): Promise<TryItAllowance> {
  const engine = sandboxEngine();
  const limits = readUsageLimits();
  const base = {
    engine,
    killSwitch: aiKillSwitchOn(),
    perSessionPerHour: limits.perSessionPerHour,
    perIpPerHour: limits.perIpPerHour,
    perDay: limits.perDay,
  };
  if (engine.kind === "demo") return { ...base, remaining: null };
  // Before the first try there is no sandbox cookie yet: its own count is zero.
  const subject = await usageSubject({ sessionToken: token ?? "sandbox-not-started" });
  const snapshot = await readUsageSnapshot(subject);
  return { ...base, remaining: remainingCalls(token ? snapshot : { ...snapshot, sessionCalls: 0 }, limits) };
}
