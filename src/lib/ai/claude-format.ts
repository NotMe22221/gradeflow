// Request pieces every Claude call shares: the structured-output format, the
// server-side fallback, and the worst-case cost the usage guard holds. Pure:
// safe for unit tests.

import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import { worstCaseCostMicroUsd, worstCaseRerunMicroUsd } from "@/lib/ai/pricing";

/**
 * Models that accept the server-side refusal fallback. Claude Haiku 5.5 has
 * none (a declined request stays declined), so it is sent without one.
 */
const SERVER_FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

export function supportsServerFallback(model: string): boolean {
  return SERVER_FALLBACK_MODELS.has(model);
}

/** The request fields that turn the server-side fallback on, for the models that have one. */
export function serverFallbackFields(model: string) {
  return supportsServerFallback(model)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
    : {};
}

/**
 * The most a call can cost. With a server-side fallback, a declined request
 * is run again on another model inside the same call, so a second pass is
 * held too, at the top price tier (the fallback model is not named up front).
 */
export function claudeWorstCaseMicroUsd(
  model: string,
  size: Parameters<typeof worstCaseCostMicroUsd>[1]
): number {
  const once = worstCaseCostMicroUsd(model, size);
  return supportsServerFallback(model) ? once + worstCaseRerunMicroUsd(size) : once;
}

type JsonNode = Record<string, unknown>;

const isNode = (value: unknown): value is JsonNode => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Put back each `enum` the SDK's schema transform (1.3.0) moved into a
 * description, walking the zod schema and the sent schema side by side, and
 * drop the description text that held it.
 */
function restoreEnums(source: unknown, target: unknown): void {
  if (!isNode(source) || !isNode(target)) return;
  if (Array.isArray(source.enum) && target.enum === undefined && target.type !== undefined) {
    target.enum = source.enum;
    if (typeof target.description === "string") {
      const folded = `{enum: ${JSON.stringify(source.enum)}}`;
      const rest = target.description.endsWith(folded)
        ? target.description.slice(0, -folded.length).replace(/\n\n$/, "")
        : target.description;
      if (rest) target.description = rest;
      else delete target.description;
    }
  }
  const variants = source.anyOf ?? source.oneOf;
  if (Array.isArray(variants) && Array.isArray(target.anyOf)) {
    variants.forEach((variant, index) => restoreEnums(variant, (target.anyOf as unknown[])[index]));
  }
  for (const key of ["properties", "$defs"] as const) {
    const from = source[key];
    const to = target[key];
    if (isNode(from) && isNode(to)) for (const name of Object.keys(from)) restoreEnums(from[name], to[name]);
  }
  restoreEnums(source.items, target.items);
}

/**
 * The structured-output format for `schema`: betaZodOutputFormat with every
 * `enum` kept. The SDK's transform folds `enum` into the field's description,
 * so Claude's constrained decoding would not hold a field like `confidence`
 * to its allowed values, and one off-list word would make a paid answer
 * unreadable. The API supports `enum`, so it is put back. The `parse` the SDK
 * attaches is unchanged.
 */
export function claudeOutputFormat<S extends z.ZodType>(schema: S) {
  const format = betaZodOutputFormat(schema);
  restoreEnums(z.toJSONSchema(schema, { reused: "ref" }), format.schema);
  return format;
}
