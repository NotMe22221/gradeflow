// Estimated cost of a live AI call, for the daily spend cap only. Pure: safe
// for unit tests.
//
// Prices are list prices in USD per million tokens as published by each
// provider (Anthropic's model table checked October 2026; OpenAI's gpt-4o and
// gpt-4o-mini list prices). They only drive the cap, never a bill: check the
// provider's pricing page before relying on them. A model missing from the
// table is priced at the most expensive tier, so the cap never under-counts.

export type ModelPrice = {
  /** USD per million input tokens. */
  input: number;
  /** USD per million output tokens. */
  output: number;
  /** A higher rate card for long prompts (Claude Haiku 5.5 above 100K input tokens). */
  longPrompt?: { aboveInputTokens: number; input: number; output: number };
};

export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, longPrompt: { aboveInputTokens: 100_000, input: 0.5, output: 2.5 } },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

/** The most expensive current tier: used for any model not in the table. */
export const UNKNOWN_MODEL_PRICE: ModelPrice = { input: 10, output: 50 };

export function priceFor(model: string): ModelPrice {
  return MODEL_PRICES[model] ?? UNKNOWN_MODEL_PRICE;
}

export type TokenUsage = { inputTokens: number; outputTokens: number };

/**
 * Cost in micro-dollars (millionths of a USD), rounded up. Tokens times a
 * per-million price is already micro-dollars, so no float division is needed.
 */
export function costMicroUsd(model: string, usage: TokenUsage): number {
  return costAtPrice(priceFor(model), usage);
}

function costAtPrice(price: ModelPrice, usage: TokenUsage): number {
  const card =
    price.longPrompt && usage.inputTokens > price.longPrompt.aboveInputTokens ? price.longPrompt : price;
  const input = Math.max(0, usage.inputTokens);
  const output = Math.max(0, usage.outputTokens);
  return Math.ceil(input * card.input + output * card.output);
}

/**
 * Tokens a high-detail image can cost on gpt-4o: 85 base plus 170 per 512px
 * tile, at most 6 tiles after OpenAI's resize (1,105). Rounded up for margin.
 */
export const MAX_TOKENS_PER_IMAGE = 1_500;

/**
 * Tokens a photo can cost on Claude: about width x height / 750, and the
 * scanner sends at most 2048 px on the long edge (lib/scan/images.ts), which
 * is 5,593 for a square photo. An answer-key photo can be larger, but Claude
 * shrinks any image past its own limit first. Rounded up for margin.
 */
export const CLAUDE_TOKENS_PER_IMAGE = 7_000;

/**
 * The most a call can cost before it is sent, for the reservation. Text is
 * counted at one token per two characters, about twice the usual English
 * rate, so the estimate stays above the real input; the output is the
 * request's max_tokens.
 */
export type CallSize = { textChars: number; images?: number; tokensPerImage?: number; maxOutputTokens: number };

function worstCaseUsage({ textChars, images = 0, tokensPerImage = MAX_TOKENS_PER_IMAGE, maxOutputTokens }: CallSize): TokenUsage {
  return { inputTokens: Math.ceil(Math.max(0, textChars) / 2) + images * tokensPerImage, outputTokens: maxOutputTokens };
}

export function worstCaseCostMicroUsd(model: string, size: CallSize): number {
  return costMicroUsd(model, worstCaseUsage(size));
}

/** The same call run again on a model not named up front (a server-side fallback), at the top tier. */
export function worstCaseRerunMicroUsd(size: CallSize): number {
  return costAtPrice(UNKNOWN_MODEL_PRICE, worstCaseUsage(size));
}

export function formatUsd(microUsd: number): string {
  const usd = microUsd / 1_000_000;
  return usd >= 0.01 || usd === 0 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(4)}`;
}

/**
 * The text length and image count of an OpenAI chat request's messages, for
 * worstCaseCostMicroUsd. Image data URLs are counted as images, not text.
 */
export function chatInputSize(messages: readonly { content?: unknown }[]): { textChars: number; images: number } {
  let textChars = 0;
  let images = 0;
  for (const message of messages) {
    const { content } = message;
    if (typeof content === "string") {
      textChars += content.length;
    } else if (Array.isArray(content)) {
      for (const part of content as { type?: unknown; text?: unknown }[]) {
        if (part?.type === "image_url") images += 1;
        else if (typeof part?.text === "string") textChars += part.text.length;
      }
    }
  }
  return { textChars, images };
}
