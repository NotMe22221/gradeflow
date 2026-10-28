// The photo-read cache: the camera grader and the answer-key reader. Pure:
// safe for unit tests. The database store is src/lib/scan/cache-store.ts.
//
// A live photo read is saved in the AiGradeCache table, next to the essay
// first passes, under its own key namespace ("scan:" or "answer-key:") and
// read back with its own parser. The key covers everything the model is
// sent: the bytes of every photo in order, the answer-key photo, the rubric,
// the model, and the prompt, schema, effort and output limit. Anything that
// changes the request misses. A hit makes no provider call and reserves
// nothing in the usage guard. The saved output is the provider's parsed
// answer, so it still goes through the same checks as a fresh read:
// mapVisionOutput() and validateScanGrading(), or normalizeAnswerKey().
// Only live reads are saved: the demo engines never come here.

import { createHash } from "node:crypto";
import { z } from "zod";

import type { ClaudeImage } from "@/lib/ai/claude-call";
import { gradeCacheKey, promptHash, rubricHash, type GradeCacheKeyParts } from "@/lib/grading/cache";
import type { GradingInput } from "@/lib/grading/types";
import {
  ANSWER_KEY_SYSTEM_PROMPT,
  ANSWER_KEY_USER_PROMPT,
  AnswerKeyOutputSchema,
  normalizeAnswerKey,
  type AnswerKeyOutput,
} from "@/lib/scan/answer-key";
import {
  buildVisionSystemPrompt,
  mapVisionOutput,
  VisionGradingSchema,
  visionParts,
  type VisionGradingOutput,
} from "@/lib/scan/vision-prompt";

/** Bump when a request changes in a way the key below doesn't show (temperature, image detail). */
const REQUEST_FORMAT_VERSION = 1;

const NAMESPACES = { scan: "scan:", answerKey: "answer-key:" } as const;

const SCAN_SCHEMA = JSON.stringify(z.toJSONSchema(VisionGradingSchema));
const ANSWER_KEY_SCHEMA = JSON.stringify(z.toJSONSchema(AnswerKeyOutputSchema));

function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** One photo exactly as sent: any changed byte is a new photo. */
function imageDigest(image: ClaudeImage): string {
  return `${image.mimeType}:${sha256(image.bytes)}`;
}

/** A live engine and the model it was asked for. */
export type PhotoReadEngine = { kind: "openai" | "claude"; model: string };

/** A parsed provider answer and the model that actually served it. */
export type PhotoRead<T> = { parsed: T; model: string };

export type PhotoReadKey = { key: string; parts: GradeCacheKeyParts };

/** Saved photo reads, as stored JSON. The parsers below check every entry read back. */
export interface PhotoReadCacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, parts: GradeCacheKeyParts, json: string): Promise<void>;
}

export type ScanReadRequest = {
  engine: PhotoReadEngine;
  input: Pick<GradingInput, "assignmentTitle" | "instructions" | "criteria">;
  pages: readonly ClaudeImage[];
  answerKey: ClaudeImage | null;
  /** Claude's effort setting; null for GPT-4o, which has none. */
  effort: string | null;
  maxTokens: number;
};

/** Where a camera-grader read of these photos, against this rubric, with this model and prompt is saved. */
export function scanCacheKey(request: ScanReadRequest): PhotoReadKey {
  const { engine, input, pages, answerKey } = request;
  const parts = {
    paperHash: sha256(
      JSON.stringify({ pages: pages.map(imageDigest), answerKey: answerKey ? imageDigest(answerKey) : null })
    ),
    rubricHash: rubricHash(input),
    model: engine.model,
    promptHash: promptHash([
      REQUEST_FORMAT_VERSION,
      engine.kind,
      buildVisionSystemPrompt(),
      // The user turn as sent: the rubric text, each label, and each photo in its place.
      ...visionParts(input, pages, answerKey).map((part) => (part.type === "text" ? part.text : imageDigest(part.image))),
      SCAN_SCHEMA,
      request.effort ?? "",
      request.maxTokens,
    ]),
  };
  return { key: NAMESPACES.scan + gradeCacheKey(parts), parts };
}

export type AnswerKeyReadRequest = {
  engine: PhotoReadEngine;
  image: ClaudeImage;
  /** Claude's effort setting; null for GPT-4o, which has none. */
  effort: string | null;
  maxTokens: number;
};

/** Where an answer-key read of this photo, with this model and prompt, is saved. */
export function answerKeyCacheKey(request: AnswerKeyReadRequest): PhotoReadKey {
  const { engine, image } = request;
  const parts = {
    paperHash: sha256(imageDigest(image)),
    // The photo is the whole input: there is no rubric yet.
    rubricHash: "none",
    model: engine.model,
    promptHash: promptHash([
      REQUEST_FORMAT_VERSION,
      engine.kind,
      ANSWER_KEY_SYSTEM_PROMPT,
      ANSWER_KEY_USER_PROMPT,
      ANSWER_KEY_SCHEMA,
      request.effort ?? "",
      request.maxTokens,
    ]),
  };
  return { key: NAMESPACES.answerKey + gradeCacheKey(parts), parts };
}

type Stored = { kind: keyof typeof NAMESPACES; output: unknown; servedModel: string };

function parseStored<S extends z.ZodType>(json: string, kind: Stored["kind"], schema: S): PhotoRead<z.infer<S>> | null {
  try {
    const value = JSON.parse(json) as Partial<Stored> | null;
    if (!value || value.kind !== kind || typeof value.servedModel !== "string" || !value.servedModel) return null;
    const output = schema.safeParse(value.output);
    return output.success ? { parsed: output.data, model: value.servedModel } : null;
  } catch {
    return null;
  }
}

/** A saved camera-grader read, or null if it doesn't have the expected shape. */
export function parseCachedScan(json: string): PhotoRead<VisionGradingOutput> | null {
  return parseStored(json, "scan", VisionGradingSchema);
}

/** A saved answer-key read, or null if it doesn't have the expected shape. */
export function parseCachedAnswerKey(json: string): PhotoRead<AnswerKeyOutput> | null {
  return parseStored(json, "answerKey", AnswerKeyOutputSchema);
}

/** Log the error type only: never the key, the photos, or what was read. */
function logStoreFailure(action: "read" | "save", error: unknown) {
  console.error(action === "read" ? "[markwise] Could not read the photo cache" : "[markwise] Could not save to the photo cache", {
    type: error instanceof Error ? error.name : typeof error,
  });
}

/**
 * A saved read when there is one; otherwise `read()` (the paid call), saved
 * when `keep` accepts it. Errors are never saved, and a store that fails
 * never fails the read: the call simply goes ahead.
 */
async function readThroughCache<T>(
  store: PhotoReadCacheStore | null,
  kind: Stored["kind"],
  { key, parts }: PhotoReadKey,
  parse: (json: string) => PhotoRead<T> | null,
  keep: (parsed: T) => boolean,
  read: () => Promise<PhotoRead<T>>
): Promise<PhotoRead<T> & { cacheHit: boolean }> {
  if (store) {
    try {
      const json = await store.get(key);
      const saved = json === null ? null : parse(json);
      if (saved) return { ...saved, cacheHit: true };
    } catch (error) {
      logStoreFailure("read", error);
    }
  }

  const fresh = await read();
  if (store && keep(fresh.parsed)) {
    try {
      // The model that served the call, which a server-side fallback can change.
      const stored: Stored = { kind, output: fresh.parsed, servedModel: fresh.model };
      await store.set(key, parts, JSON.stringify(stored));
    } catch (error) {
      logStoreFailure("save", error);
    }
  }
  return { ...fresh, cacheHit: false };
}

/**
 * The camera grader's read, through the cache. A read with no handwriting is
 * not saved: the scan is refused, and the teacher can try again.
 */
export function readScanThroughCache(
  store: PhotoReadCacheStore | null,
  request: ScanReadRequest,
  read: () => Promise<PhotoRead<VisionGradingOutput>>
): Promise<PhotoRead<VisionGradingOutput> & { cacheHit: boolean }> {
  return readThroughCache(
    store,
    "scan",
    scanCacheKey(request),
    parseCachedScan,
    (parsed) => mapVisionOutput(parsed).transcription !== "",
    read
  );
}

/** The answer-key reader's read, through the cache. A read the checks refuse is not saved. */
export function readAnswerKeyThroughCache(
  store: PhotoReadCacheStore | null,
  request: AnswerKeyReadRequest,
  read: () => Promise<PhotoRead<AnswerKeyOutput>>
): Promise<PhotoRead<AnswerKeyOutput> & { cacheHit: boolean }> {
  return readThroughCache(
    store,
    "answerKey",
    answerKeyCacheKey(request),
    parseCachedAnswerKey,
    (parsed) => normalizeAnswerKey(parsed).ok,
    read
  );
}

/** A single-process store for unit tests and offline scripts. */
export function createMemoryPhotoReadCache(): PhotoReadCacheStore & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    async get(key) {
      return entries.get(key) ?? null;
    },
    async set(key, _parts, json) {
      entries.set(key, json);
    },
  };
}
