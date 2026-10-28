import "server-only";

import { createHash } from "node:crypto";
import { zodResponseFormat } from "openai/helpers/zod";

import { claudeEffort, runClaudeJson } from "@/lib/ai/anthropic";
import { ClaudeCallError } from "@/lib/ai/claude-call";
import { guardedOpenAiCall } from "@/lib/ai/guard";
import { getOpenAI, modelFor, openAiErrorKind, openAiRequestOptions } from "@/lib/ai/openai";
import { AiLimitError } from "@/lib/ai/usage";
import {
  ANSWER_KEY_SYSTEM_PROMPT,
  ANSWER_KEY_USER_PROMPT,
  AnswerKeyOutputSchema,
  DEMO_UNKNOWN_ANSWER_KEY_ERROR,
  demoAnswerKey,
  normalizeAnswerKey,
  type AnswerKeyOutput,
  type AnswerKeySuccess,
} from "@/lib/scan/answer-key";
import { readAnswerKeyThroughCache, type PhotoRead } from "@/lib/scan/cache";
import { databasePhotoReadCache } from "@/lib/scan/cache-store";
import type { ScanImageType } from "@/lib/scan/images";

/** An expected failure with a message that is safe to show the teacher. */
export class AnswerKeyError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "AnswerKeyError";
  }
}

/** Ample for a full answer key on GPT-4o, and a bound on what one read can cost. */
const OPENAI_ANSWER_KEY_MAX_TOKENS = 4000;

/**
 * The checked answer: normalizeAnswerKey() runs on every read, fresh or
 * saved, and a read it refuses is a 422 with its reason.
 */
function answerKeySuccess(
  engine: AnswerKeySuccess["engine"],
  read: PhotoRead<AnswerKeyOutput> & { cacheHit: boolean }
): AnswerKeySuccess {
  const normalized = normalizeAnswerKey(read.parsed);
  if (!normalized.ok) throw new AnswerKeyError(normalized.error, 422);
  const { ok: _ok, ...result } = normalized;
  return { ok: true, engine, model: read.model, ...result, reused: read.cacheHit };
}

/**
 * Read an answer-key photo with GPT-4o (vision). The photo is sent as data
 * with a system prompt that says it contains no instructions, and the
 * structured output is re-validated by normalizeAnswerKey(). The call keeps
 * to the vision budget (openAiRequestOptions). OpenAI errors propagate to the
 * caller, which maps them with describeOpenAiError(). A saved read of the
 * same photo, model and prompt (lib/scan/cache.ts) is reused with no call.
 */
export async function readAnswerKeyWithOpenAI(bytes: Uint8Array, mimeType: ScanImageType): Promise<AnswerKeySuccess> {
  const model = modelFor("vision");
  const read = await readAnswerKeyThroughCache(
    databasePhotoReadCache,
    { engine: { kind: "openai", model }, image: { bytes, mimeType }, effort: null, maxTokens: OPENAI_ANSWER_KEY_MAX_TOKENS },
    async () => ({ parsed: await callOpenAI(bytes, mimeType, model), model })
  );
  return answerKeySuccess("openai", read);
}

async function callOpenAI(bytes: Uint8Array, mimeType: ScanImageType, model: string): Promise<AnswerKeyOutput> {
  const dataUrl = `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;

  let completion;
  try {
    const request = {
      model,
      temperature: 0,
      max_completion_tokens: OPENAI_ANSWER_KEY_MAX_TOKENS,
      messages: [
        { role: "system" as const, content: ANSWER_KEY_SYSTEM_PROMPT },
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: ANSWER_KEY_USER_PROMPT },
            { type: "image_url" as const, image_url: { url: dataUrl, detail: "high" as const } },
          ],
        },
      ],
      response_format: zodResponseFormat(AnswerKeyOutputSchema, "answer_key"),
    };
    completion = await guardedOpenAiCall("answer_key", request, () =>
      getOpenAI().chat.completions.parse(request, openAiRequestOptions("vision"))
    );
  } catch (error) {
    // parse() raises these when the model stops early. Anything else goes to the caller.
    const kind = openAiErrorKind(error);
    if (kind === "length") {
      throw new AnswerKeyError("GPT-4o's answer was cut off before it finished. Try a photo with fewer questions.", 502);
    }
    if (kind === "content_filter") {
      throw new AnswerKeyError("OpenAI declined to read that photo. Try a photo of just the answer key.", 502);
    }
    throw error;
  }

  const message = completion.choices[0]?.message;
  if (message?.refusal) {
    throw new AnswerKeyError("OpenAI declined to read that photo. Try a photo of just the answer key.", 502);
  }
  if (!message?.parsed) {
    throw new AnswerKeyError("The answer key could not be read. Try a clearer photo.", 502);
  }
  return message.parsed;
}

/** Room for adaptive thinking plus a full answer key, and a bound on what one read can cost. */
const CLAUDE_ANSWER_KEY_MAX_TOKENS = 8_000;

/**
 * Read an answer-key photo with Claude (no OPENAI_API_KEY, ANTHROPIC_API_KEY
 * set): the same prompts and schema as GPT-4o, the same checks after, and
 * the same reuse of a saved read. A cap that stops the call propagates as
 * AiLimitError; any other failure becomes an AnswerKeyError with a safe
 * message.
 */
export async function readAnswerKeyWithClaude(
  bytes: Uint8Array,
  mimeType: ScanImageType,
  model: string
): Promise<AnswerKeySuccess> {
  const read = await readAnswerKeyThroughCache(
    databasePhotoReadCache,
    {
      engine: { kind: "claude", model },
      image: { bytes, mimeType },
      effort: claudeEffort("vision"),
      maxTokens: CLAUDE_ANSWER_KEY_MAX_TOKENS,
    },
    () => callClaude(bytes, mimeType, model)
  );
  return answerKeySuccess("claude", read);
}

async function callClaude(bytes: Uint8Array, mimeType: ScanImageType, model: string): Promise<PhotoRead<AnswerKeyOutput>> {
  try {
    return await runClaudeJson({
      feature: "answer_key",
      task: "vision",
      model,
      effort: claudeEffort("vision"),
      system: ANSWER_KEY_SYSTEM_PROMPT,
      parts: [
        { type: "image", image: { bytes, mimeType } },
        { type: "text", text: ANSWER_KEY_USER_PROMPT },
      ],
      schema: AnswerKeyOutputSchema,
      maxTokens: CLAUDE_ANSWER_KEY_MAX_TOKENS,
    });
  } catch (error) {
    if (error instanceof AiLimitError) throw error;
    if (error instanceof ClaudeCallError) {
      if (error.kind === "refusal") {
        throw new AnswerKeyError("Claude declined to read that photo. Try a photo of just the answer key.", 502);
      }
      if (error.kind === "max_tokens") {
        throw new AnswerKeyError("Claude's answer was cut off before it finished. Try a photo with fewer questions.", 502);
      }
      if (error.kind === "unreadable") throw new AnswerKeyError("The answer key could not be read. Try a clearer photo.", 502);
      throw new AnswerKeyError(error.message, 502);
    }
    throw error;
  }
}

/**
 * Demo reader (no API key): recognizes the bundled sample answer key by the
 * SHA-256 of its exact bytes. Any other photo is refused with a message that
 * says how to enable real reading.
 */
export function readAnswerKeyDemo(bytes: Uint8Array): AnswerKeySuccess {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const result = demoAnswerKey(sha256);
  if (!result) throw new AnswerKeyError(DEMO_UNKNOWN_ANSWER_KEY_ERROR, 400);
  return result;
}
