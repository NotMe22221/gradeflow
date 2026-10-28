import { NextResponse } from "next/server";

import { aiLimitResponse } from "@/lib/ai/guard";
import { AiLimitError } from "@/lib/ai/usage";
import { GradingError } from "@/lib/grading/validate";
import { readJsonWithLimit } from "@/lib/http/body";
import { stripNul } from "@/lib/text/sanitize";
import { gradeInSandbox, sandboxAllowance } from "@/lib/try/grade";
import { ensureSandboxToken } from "@/lib/try/sandbox";
import { checkTryPaper, isTemplateId, SandboxLimitError, TRY_MAX_CHARS } from "@/lib/try/types";

export const dynamic = "force-dynamic";
// One Claude call, capped at 110 seconds with its retry (CLAUDE_REQUEST_BUDGET), plus the sandbox writes.
export const maxDuration = 120;

/** The paper is capped at TRY_MAX_CHARS; UTF-8 and JSON escaping take at most six bytes a character. */
const MAX_BODY_BYTES = TRY_MAX_CHARS * 6 + 1024;
const NO_STORE = { "Cache-Control": "no-store" };

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });
}

/**
 * The judges' try-it sandbox: grade a pasted paper against a built-in rubric
 * template. No sign-in. Each browser gets its own sandbox cookie, and its
 * papers and results live only in TryItRun for 24 hours. The route never
 * touches classes, submissions or grades, so nothing here reaches the demo
 * data or a student. A live call goes through the usage caps under the
 * sandbox's session (past one, 429 with Retry-After, or 503 when waiting
 * won't help: kill switch, a call larger than the daily budget), and every new run counts
 * against the sandbox's and the network's hourly run caps. The pasted paper
 * is untrusted data, graded and validated like any submission.
 */
export async function POST(request: Request) {
  try {
    // JSON only: a cross-site form can't send it without a CORS preflight, which this route never grants.
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse("Send the paper as JSON.", 415);
    }
    const body = await readJsonWithLimit(request, MAX_BODY_BYTES);
    if (!body.ok) {
      return body.reason === "too_large"
        ? errorResponse(`Keep the paper under ${TRY_MAX_CHARS.toLocaleString("en-US")} characters.`, 413)
        : errorResponse("Paste a paper first.", 400);
    }
    const { templateId, paper } = (body.value ?? {}) as { templateId?: unknown; paper?: unknown };
    if (!isTemplateId(templateId)) return errorResponse("Choose a rubric.", 400);
    const checked = checkTryPaper(typeof paper === "string" ? stripNul(paper) : "");
    if (!checked.ok) return errorResponse(checked.error, 400);

    const token = await ensureSandboxToken();
    const result = await gradeInSandbox(token, templateId, checked.paper);
    return NextResponse.json({ ok: true, result, allowance: await sandboxAllowance(token) }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AiLimitError) return aiLimitResponse(error, NO_STORE);
    if (error instanceof SandboxLimitError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: "TRY_LIMIT" },
        { status: 429, headers: { ...NO_STORE, "Retry-After": String(error.retryAfterSeconds) } }
      );
    }
    if (error instanceof GradingError) return errorResponse(error.message, error.status);
    console.error("[markwise] Try-it route failed", { type: error instanceof Error ? error.name : typeof error });
    return errorResponse("Grading failed. Try again.", 500);
  }
}
