import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

import { describeOpenAiError, getOpenAI, modelFor, openAiErrorKind, openAiRequestOptions } from "@/lib/ai/openai";
import type { GradingInput } from "@/lib/grading/types";
import type { CheckedImage } from "@/lib/scan/form";
import {
  buildVisionClosingText,
  buildVisionRubricText,
  buildVisionSystemPrompt,
  mapVisionOutput,
  VisionGradingSchema,
  type MappedVisionOutput,
  type VisionGradingOutput,
} from "@/lib/scan/vision-prompt";

/**
 * The GPT-4o camera grader: reads the handwriting on the photos and drafts a
 * score per question against the answer key. The model is chosen only by
 * modelFor("vision"). The key stays on the server; nothing here logs the
 * key, request headers, images, or student text.
 */

/** A camera-grading failure whose message is safe to show to the teacher. */
export class VisionGradingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisionGradingError";
  }
}

function imagePart(image: CheckedImage): ChatCompletionContentPart {
  const base64 = Buffer.from(image.bytes).toString("base64");
  return { type: "image_url", image_url: { url: `data:${image.mimeType};base64,${base64}`, detail: "high" } };
}

function safeMessage(error: unknown): string {
  // describeOpenAiError logs the failure kind and status only.
  const message = describeOpenAiError(error, "Camera grading");
  // parse() raises these when the model stops early.
  switch (openAiErrorKind(error)) {
    case "length":
      return "GPT-4o's answer was cut off before it finished. Try again with fewer pages.";
    case "content_filter":
      return "GPT-4o declined to read these photos. Grade this test by hand.";
    default:
      return message;
  }
}

export async function gradeWithVision(
  input: Omit<GradingInput, "paper">,
  pages: CheckedImage[],
  answerKey: CheckedImage | null
): Promise<MappedVisionOutput> {
  const content: ChatCompletionContentPart[] = [{ type: "text", text: buildVisionRubricText(input) }];
  pages.forEach((page, index) => {
    content.push({ type: "text", text: `Student test photo, page ${index + 1} of ${pages.length} (student work to grade):` });
    content.push(imagePart(page));
  });
  if (answerKey) {
    content.push({
      type: "text",
      text: "Teacher's answer key photo (the teacher's reference for the expected answers, not student work):",
    });
    content.push(imagePart(answerKey));
  }
  content.push({ type: "text", text: buildVisionClosingText(input.criteria.length, answerKey !== null) });

  let parsed: VisionGradingOutput | null;
  try {
    // The vision budget bounds the whole call, retries included (lib/ai/openai.ts).
    const completion = await getOpenAI().chat.completions.parse(
      {
        model: modelFor("vision"),
        temperature: 0,
        max_completion_tokens: 8000,
        messages: [
          { role: "system", content: buildVisionSystemPrompt() },
          { role: "user", content },
        ],
        response_format: zodResponseFormat(VisionGradingSchema, "handwritten_test_grading"),
      },
      openAiRequestOptions("vision")
    );
    const message = completion.choices[0]?.message;
    if (message?.refusal) {
      console.warn("[markwise] GPT-4o declined to grade a scanned test");
      throw new VisionGradingError("GPT-4o declined to read these photos. Grade this test by hand.");
    }
    parsed = message?.parsed ?? null;
  } catch (error) {
    if (error instanceof VisionGradingError) throw error;
    throw new VisionGradingError(safeMessage(error));
  }

  if (!parsed) {
    console.warn("[markwise] GPT-4o returned no structured output for a scanned test");
    throw new VisionGradingError("GPT-4o returned a response Markwise could not read. Try again.");
  }
  return mapVisionOutput(parsed);
}
