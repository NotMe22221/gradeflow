import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";

import { guardedOpenAiCall } from "@/lib/ai/guard";
import { getOpenAI, modelFor, openAiConfigured, openAiRequestOptions } from "@/lib/ai/openai";
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
 * Draft the brief with the text model (gpt-4o-mini via modelFor("text")).
 * The data goes in as an escaped JSON block that the system prompt marks as
 * data, never instructions; the structured output is re-validated and capped
 * by normalizeBriefOutput(). OpenAI errors propagate to the caller, which maps
 * them with describeOpenAiError().
 */
async function draftWithOpenAI(input: BriefInput): Promise<GeneratedBrief> {
  const model = modelFor("text");
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

/** OpenAI when OPENAI_API_KEY is set, otherwise the deterministic demo brief. */
export async function generateConferenceBrief(input: BriefInput): Promise<GeneratedBrief> {
  if (openAiConfigured()) return draftWithOpenAI(input);
  return { engine: "demo", model: null, brief: buildDemoBrief(input) };
}

/** Which engine a brief would use right now, for the UI label (no secrets). */
export function briefEngineInfo(): { engine: BriefEngine; model: string | null } {
  return openAiConfigured() ? { engine: "openai", model: modelFor("text") } : { engine: "demo", model: null };
}
