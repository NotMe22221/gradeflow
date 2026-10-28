import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

import { claudeEffort, runClaudeJson } from "@/lib/ai/anthropic";
import { ClaudeCallError, type ClaudePart } from "@/lib/ai/claude-call";
import { guardedOpenAiCall } from "@/lib/ai/guard";
import { describeOpenAiError, getOpenAI, openAiErrorKind, openAiRequestOptions } from "@/lib/ai/openai";
import { AiLimitError } from "@/lib/ai/usage";
import { GRADER_LABELS } from "@/lib/constants";
import type { GradingInput } from "@/lib/grading/types";
import { readScanThroughCache } from "@/lib/scan/cache";
import { databasePhotoReadCache } from "@/lib/scan/cache-store";
import type { CheckedImage } from "@/lib/scan/form";
import {
  buildVisionSystemPrompt,
  mapVisionOutput,
  VisionGradingSchema,
  visionParts,
  type MappedVisionOutput,
  type VisionGradingOutput,
} from "@/lib/scan/vision-prompt";

/**
 * The camera grader: reads the handwriting on the photos and drafts a score
 * per question against the answer key, on GPT-4o (OPENAI_API_KEY) or Claude
 * (ANTHROPIC_API_KEY), whichever engineFor("vision") picked. Both get the
 * same prompt, photos and output schema. The keys stay on the server;
 * nothing here logs a key, request headers, images, or student text. A read
 * of the same photos against the same rubric, model and prompt is saved and
 * reused (lib/scan/cache.ts), so it is paid for once.
 */

/** A camera-grading failure whose message is safe to show to the teacher. */
export class VisionGradingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisionGradingError";
  }
}

/** A live vision engine and the model it runs. */
export type VisionEngine = { kind: "openai" | "claude"; model: string };

/** Claude reads at most this much: room for adaptive thinking plus the transcription and scores. */
const CLAUDE_VISION_MAX_TOKENS = 16_000;
/** GPT-4o's output limit for the same read (no thinking). */
const OPENAI_VISION_MAX_TOKENS = 8000;

function openAiPart(part: ClaudePart): ChatCompletionContentPart {
  if (part.type === "text") return part;
  const base64 = Buffer.from(part.image.bytes).toString("base64");
  return { type: "image_url", image_url: { url: `data:${part.image.mimeType};base64,${base64}`, detail: "high" } };
}

const DECLINED = (engine: VisionEngine) => `${GRADER_LABELS[engine.kind]} declined to read these photos. Grade this test by hand.`;
const CUT_OFF = (engine: VisionEngine) =>
  `${GRADER_LABELS[engine.kind]}'s answer was cut off before it finished. Try again with fewer pages.`;
const UNREADABLE = (engine: VisionEngine) =>
  `${GRADER_LABELS[engine.kind]} returned a response Markwise could not read. Try again.`;

async function readWithOpenAI(engine: VisionEngine, parts: ClaudePart[]): Promise<VisionGradingOutput> {
  let parsed: VisionGradingOutput | null;
  try {
    const request = {
      model: engine.model,
      temperature: 0,
      max_completion_tokens: OPENAI_VISION_MAX_TOKENS,
      messages: [
        { role: "system" as const, content: buildVisionSystemPrompt() },
        { role: "user" as const, content: parts.map(openAiPart) },
      ],
      response_format: zodResponseFormat(VisionGradingSchema, "handwritten_test_grading"),
    };
    // The usage caps come first; the vision budget bounds the whole call, retries included (lib/ai/openai.ts).
    const completion = await guardedOpenAiCall("scan", request, () =>
      getOpenAI().chat.completions.parse(request, openAiRequestOptions("vision"))
    );
    const message = completion.choices[0]?.message;
    if (message?.refusal) {
      console.warn("[markwise] GPT-4o declined to grade a scanned test");
      throw new VisionGradingError(DECLINED(engine));
    }
    parsed = message?.parsed ?? null;
  } catch (error) {
    if (error instanceof VisionGradingError || error instanceof AiLimitError) throw error;
    // describeOpenAiError logs the failure kind and status only.
    const message = describeOpenAiError(error, "Camera grading");
    // parse() raises these when the model stops early.
    switch (openAiErrorKind(error)) {
      case "length":
        throw new VisionGradingError(CUT_OFF(engine));
      case "content_filter":
        throw new VisionGradingError(DECLINED(engine));
      default:
        throw new VisionGradingError(message);
    }
  }
  if (!parsed) {
    console.warn("[markwise] GPT-4o returned no structured output for a scanned test");
    throw new VisionGradingError(UNREADABLE(engine));
  }
  return parsed;
}

async function readWithClaude(engine: VisionEngine, parts: ClaudePart[]): Promise<{ parsed: VisionGradingOutput; model: string }> {
  try {
    return await runClaudeJson({
      feature: "scan",
      task: "vision",
      model: engine.model,
      effort: claudeEffort("vision"),
      system: buildVisionSystemPrompt(),
      parts,
      schema: VisionGradingSchema,
      maxTokens: CLAUDE_VISION_MAX_TOKENS,
    });
  } catch (error) {
    if (error instanceof AiLimitError) throw error;
    if (error instanceof ClaudeCallError) {
      if (error.kind === "refusal") throw new VisionGradingError(DECLINED(engine));
      if (error.kind === "max_tokens") throw new VisionGradingError(CUT_OFF(engine));
      if (error.kind === "unreadable") throw new VisionGradingError(UNREADABLE(engine));
      throw new VisionGradingError(error.message);
    }
    throw error;
  }
}

/**
 * Read and grade one scanned test. Returns the mapped output and the model
 * that answered; validateScanGrading() checks it before anything is stored.
 * A saved read is mapped and checked the same way, with no provider call and
 * nothing reserved in the usage guard.
 */
export async function gradeWithVision(
  engine: VisionEngine,
  input: Omit<GradingInput, "paper">,
  pages: CheckedImage[],
  answerKey: CheckedImage | null
): Promise<MappedVisionOutput & { model: string }> {
  const claude = engine.kind === "claude";
  const { parsed, model } = await readScanThroughCache(
    databasePhotoReadCache,
    {
      engine,
      input,
      pages,
      answerKey,
      effort: claude ? claudeEffort("vision") : null,
      maxTokens: claude ? CLAUDE_VISION_MAX_TOKENS : OPENAI_VISION_MAX_TOKENS,
    },
    async () => {
      const parts = visionParts(input, pages, answerKey);
      return claude ? readWithClaude(engine, parts) : { parsed: await readWithOpenAI(engine, parts), model: engine.model };
    }
  );
  return { ...mapVisionOutput(parsed), model };
}
