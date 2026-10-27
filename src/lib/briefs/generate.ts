import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";

import { claudeEffort, runClaudeJson } from "@/lib/ai/anthropic";
import { ClaudeCallError } from "@/lib/ai/claude-call";
import { engineFor } from "@/lib/ai/engines";
import { guardedOpenAiCall } from "@/lib/ai/guard";
import { getOpenAI, openAiRequestOptions } from "@/lib/ai/openai";
import { AiLimitError } from "@/lib/ai/usage";
import { buildDemoBrief } from "@/lib/briefs/demo";
import { BRIEF_SYSTEM_PROMPT, buildBriefUserPrompt } from "@/lib/briefs/prompt";
import type { BriefEngine, BriefInput, ConferenceBrief } from "@/lib/briefs/types";
import { BriefOutputSchema, normalizeBriefOutput } from "@/lib/briefs/validate";

/** An expected failure with a message that is safe to show the teacher. */
export class BriefError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "BriefError";
  }
}

export type GeneratedBrief = { engine: BriefEngine; model: string | null; brief: ConferenceBrief };

/**
 * Draft the brief with OpenAI's text model (gpt-4o-mini, see engineFor).
 * The data goes in as an escaped JSON block that the system prompt marks as
 * data, never instructions; the structured output is re-validated and capped
 * by normalizeBriefOutput(). OpenAI errors propagate to the caller, which maps
 * them with describeOpenAiError().
 */
async function draftWithOpenAI(input: BriefInput, model: string): Promise<GeneratedBrief> {
  const request = {
    model,
    temperature: 0.3,
    max_completion_tokens: 1500,
    messages: [
      { role: "system" as const, content: BRIEF_SYSTEM_PROMPT },
      { role: "user" as const, content: buildBriefUserPrompt(input) },
    ],
    response_format: zodResponseFormat(BriefOutputSchema, "conference_brief"),
  };
  const completion = await guardedOpenAiCall("brief", request, () =>
    getOpenAI().chat.completions.parse(request, openAiRequestOptions("text"))
  );

  const message = completion.choices[0]?.message;
  if (message?.refusal) throw new BriefError("OpenAI declined to draft this brief. Try again.", 502);
  if (!message?.parsed) throw new BriefError("The brief could not be drafted. Try again.", 502);

  const checked = normalizeBriefOutput(message.parsed);
  if (!checked.ok) throw new BriefError(checked.error, 502);
  return { engine: "openai", model, brief: checked.brief };
}

/** Room for a short adaptive think plus the brief's JSON, and a bound on what one draft can cost. */
const CLAUDE_BRIEF_MAX_TOKENS = 4_000;

/**
 * Draft the brief with Claude (no OPENAI_API_KEY, ANTHROPIC_API_KEY set):
 * the same prompt, data block and schema as the OpenAI draft, the same checks
 * after. A cap that stops the call propagates as AiLimitError; any other
 * failure becomes a BriefError with a safe message.
 */
async function draftWithClaude(input: BriefInput, model: string): Promise<GeneratedBrief> {
  let read;
  try {
    read = await runClaudeJson({
      feature: "brief",
      task: "text",
      model,
      effort: claudeEffort("text"),
      system: BRIEF_SYSTEM_PROMPT,
      parts: [{ type: "text", text: buildBriefUserPrompt(input) }],
      schema: BriefOutputSchema,
      maxTokens: CLAUDE_BRIEF_MAX_TOKENS,
    });
  } catch (error) {
    if (error instanceof AiLimitError) throw error;
    if (error instanceof ClaudeCallError) {
      if (error.kind === "refusal") throw new BriefError("Claude declined to draft this brief. Try again.", 502);
      if (error.kind === "max_tokens" || error.kind === "unreadable") {
        throw new BriefError("The brief could not be drafted. Try again.", 502);
      }
      throw new BriefError(error.message, 502);
    }
    throw error;
  }

  const checked = normalizeBriefOutput(read.parsed);
  if (!checked.ok) throw new BriefError(checked.error, 502);
  return { engine: "claude", model: read.model, brief: checked.brief };
}

/** The live engine engineFor("text") picks (OpenAI, then Claude), otherwise the deterministic demo brief. */
export async function generateConferenceBrief(input: BriefInput): Promise<GeneratedBrief> {
  const engine = engineFor("text");
  if (engine.kind === "openai" && engine.model) return draftWithOpenAI(input, engine.model);
  if (engine.kind === "claude" && engine.model) return draftWithClaude(input, engine.model);
  return { engine: "demo", model: null, brief: buildDemoBrief(input) };
}

/** Which engine a brief would use right now, for the UI label (no secrets). */
export function briefEngineInfo(): { engine: BriefEngine; model: string | null } {
  const engine = engineFor("text");
  return { engine: engine.kind, model: engine.model };
}
