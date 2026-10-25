// Locating quoted evidence inside a paper. Pure: safe for client components,
// server code, and unit tests.
//
// The match tolerates differences that do not change the words: whitespace
// and line breaks, curly vs straight quotes, dash variants, letter case, and
// leading/trailing quote marks or ellipses around the quote. It never
// tolerates different words, so evidence that is not in the paper is rejected.

export type EvidenceSpan = { start: number; end: number };

/** Evidence shorter than this is too generic to count as a verified quote. */
export const MIN_EVIDENCE_CHARS = 12;

const QUOTE_CHARS = /[‘’‚‛′`´]/g;
const DOUBLE_QUOTE_CHARS = /[“”„‟″«»]/g;
const DASH_CHARS = /[‐‑‒–—―−]/g;

function normalizeChar(ch: string): string {
  return ch
    .replace(QUOTE_CHARS, "'")
    .replace(DOUBLE_QUOTE_CHARS, '"')
    .replace(DASH_CHARS, "-")
    .replace(/…/g, "...")
    .toLowerCase();
}

/**
 * Normalize text and keep a map from each normalized character back to its
 * index in the original string, so a match can be highlighted in place.
 */
function normalizeWithMap(text: string): { normalized: string; map: number[] } {
  let normalized = "";
  const map: number[] = [];
  let lastWasSpace = true; // trims leading whitespace
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (!lastWasSpace) {
        normalized += " ";
        map.push(i);
        lastWasSpace = true;
      }
      continue;
    }
    const out = normalizeChar(ch);
    for (const c of out) {
      normalized += c;
      map.push(i);
    }
    lastWasSpace = false;
  }
  if (normalized.endsWith(" ")) {
    normalized = normalized.slice(0, -1);
    map.pop();
  }
  return { normalized, map };
}

/** Strip wrapping quote marks, ellipses, and whitespace from a quote. */
export function cleanEvidence(quote: string): string {
  return quote
    .trim()
    .replace(/^(?:\.{3}|…|["'‘’“”\s])+/, "")
    .replace(/(?:\.{3}|…|["'‘’“”\s])+$/, "")
    .trim();
}

/** Find where `quote` appears in `paper`, or null if it does not. */
export function findEvidenceSpan(paper: string, quote: string | null | undefined): EvidenceSpan | null {
  if (!quote) return null;
  const cleaned = cleanEvidence(quote);
  if (cleaned.length < MIN_EVIDENCE_CHARS) return null;

  const haystack = normalizeWithMap(paper);
  const needle = normalizeWithMap(cleaned).normalized;
  if (!needle) return null;

  let index = haystack.normalized.indexOf(needle);
  if (index === -1) {
    // Models sometimes drop or add a final period. Retry without trailing
    // sentence punctuation, still requiring every word to match.
    const trimmedNeedle = needle.replace(/[.,;:!?]+$/, "");
    if (trimmedNeedle.length < MIN_EVIDENCE_CHARS) return null;
    index = haystack.normalized.indexOf(trimmedNeedle);
    if (index === -1) return null;
    return {
      start: haystack.map[index],
      end: haystack.map[index + trimmedNeedle.length - 1] + 1,
    };
  }
  return {
    start: haystack.map[index],
    end: haystack.map[index + needle.length - 1] + 1,
  };
}

export function evidenceAppearsInPaper(paper: string, quote: string | null | undefined): boolean {
  return findEvidenceSpan(paper, quote) !== null;
}
