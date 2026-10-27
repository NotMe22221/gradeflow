import "server-only";

import { createHash } from "node:crypto";
import { zodResponseFormat } from "openai/helpers/zod";

import { guardedOpenAiCall } from "@/lib/ai/guard";
import { getOpenAI, modelFor, openAiErrorKind, openAiRequestOptions } from "@/lib/ai/openai";
import {
  ANSWER_KEY_SYSTEM_PROMPT,
  ANSWER_KEY_USER_PROMPT,
  AnswerKeyOutputSchema,
  DEMO_UNKNOWN_ANSWER_KEY_ERROR,
  demoAnswerKey,
  normalizeAnswerKey,
  type AnswerKeySuccess,
} from "@/lib/scan/answer-key";
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

/**
 * Read an answer-key photo with GPT-4o (vision). The photo is sent as data
 * with a system prompt that says it contains no instructions, and the
 * structured output is re-validated by normalizeAnswerKey(). The call keeps
 * to the vision budget (openAiRequestOptions). OpenAI errors propagate to the
 * caller, which maps them with describeOpenAiError().
 */
export async function readAnswerKeyWithOpenAI(bytes: Uint8Array, mimeType: ScanImageType): Promise<AnswerKeySuccess> {
  const model = modelFor("vision");
  const dataUrl = `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;

  let completion;
  try {
    const request = {
      model,
      temperature: 0,
      // Ample for a full answer key, and a bound on what one read can cost.
      max_completion_tokens: 4000,
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

  const normalized = normalizeAnswerKey(message.parsed);
  if (!normalized.ok) throw new AnswerKeyError(normalized.error, 422);
  const { ok: _ok, ...result } = normalized;
  return { ok: true, engine: "openai", model, ...result };
}

/**
 * Demo reader (no OPENAI_API_KEY): recognizes the bundled sample answer key
 * by the SHA-256 of its exact bytes. Any other photo is refused with a
 * message that says how to enable real reading.
 */
export function readAnswerKeyDemo(bytes: Uint8Array): AnswerKeySuccess {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const result = demoAnswerKey(sha256);
  if (!result) throw new AnswerKeyError(DEMO_UNKNOWN_ANSWER_KEY_ERROR, 400);
  return result;
}
