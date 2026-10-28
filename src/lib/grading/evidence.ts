// Locating quoted evidence inside a paper. Pure: safe for client components,
// server code, and unit tests.
//
// The match tolerates differences that do not change the words: whitespace
// and line breaks, curly vs straight quotes, dash variants, letter case, and
// leading/trailing quote marks or ellipses around the quote. It never
// tolerates different words, so evidence that is not in the paper is rejected,
// and it matches whole words only: "possible to justify" is not found in
// "impossible to justify".

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

// The last paper normalized: graders and the review check many quotes against
// one paper, and normalizing a long paper per quote made that quadratic.
let lastPaper: string | null = null;
let lastHaystack: { normalized: string; map: number[] } = { normalized: "", map: [] };

function normalizePaper(paper: string): { normalized: string; map: number[] } {
  if (paper !== lastPaper) {
    lastHaystack = normalizeWithMap(paper);
    lastPaper = paper;
  }
  return lastHaystack;
}

// Letters, digits and combining marks, except in scripts written without
// spaces between words (Chinese, Japanese, Thai, Lao, Khmer, Burmese), where
// a quote may start or end at any character.
const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u;
const UNSPACED_SCRIPT = /[\p{scx=Han}\p{scx=Hira}\p{scx=Kana}\p{scx=Thai}\p{scx=Laoo}\p{scx=Khmr}\p{scx=Mymr}]/u;
const DIGIT = /\p{Nd}/u;

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && WORD_CHAR.test(ch) && !UNSPACED_SCRIPT.test(ch);
}

// Hyphens as typed in the paper. Normalizing turns every dash into "-", so the
// paper's own character tells a hyphen ("non-binding") from a dash ("plan—which").
const HYPHENS = new Set(["-", "\u2010", "\u2011"]);

/**
 * An apostrophe between letters ("can't"), a hyphen between letters
 * ("non-binding"; `typed` is the paper's own character), or a point or comma
 * between digits ("3.5", "10,000").
 */
function joins(left: string | undefined, joiner: string | undefined, right: string | undefined, typed?: string): boolean {
  if (joiner === "'") return isWordChar(left) && isWordChar(right);
  if (joiner === "-") return typed !== undefined && HYPHENS.has(typed) && isWordChar(left) && isWordChar(right);
  if (joiner === "." || joiner === ",") return left !== undefined && right !== undefined && DIGIT.test(left) && DIGIT.test(right);
  return false;
}

/** Whether a match starting or ending at `at` would cut a word: "im|possible", "can|'t", "3.|5". */
function cutsWord(text: string, at: number, typed: (index: number) => string | undefined): boolean {
  const left = text[at - 1];
  const right = text[at];
  if (isWordChar(left) && isWordChar(right)) return true;
  return joins(left, right, text[at + 1], typed(at)) || joins(text[at - 2], left, right, typed(at - 1));
}

/**
 * Where `needle` first occurs in `haystack` as whole words, or -1, so
 * "possible" is not found in "impossible" nor "we can" in "we can't". With
 * `cutEnd`, the match may end inside a word.
 */
function indexOfWords(
  haystack: string,
  needle: string,
  cutEnd: boolean,
  typed: (index: number) => string | undefined
): number {
  for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, index + 1)) {
    if (!cutsWord(haystack, index, typed) && (cutEnd || !cutsWord(haystack, index + needle.length, typed))) return index;
  }
  return -1;
}

/** Strip wrapping quote marks, ellipses, and whitespace from a quote. */
export function cleanEvidence(quote: string): string {
  return quote
    .trim()
    .replace(/^(?:\.{3}|…|["'‘’“”\s])+/, "")
    .replace(/(?:\.{3}|…|["'‘’“”\s])+$/, "")
    .trim();
}

/** A function that finds a quote in a paper, like findEvidenceSpan. */
export type EvidenceLocator = (paper: string, quote: string) => EvidenceSpan | null;

// A trailing ellipsis, as on a snippet cut to length ("...give full ma…").
const CUT_SHORT = /(?:\.{3}|…)["'‘’“”\s]*$/;

/**
 * Find where `quote` appears in `paper` as whole words, or null if it does
 * not. A quote that ends with an ellipsis was cut short, so its last word may
 * be partial; validateGrading strips ellipses before it calls this, so a
 * grader's quote must always end on a whole word.
 */
export function findEvidenceSpan(paper: string, quote: string | null | undefined): EvidenceSpan | null {
  if (!quote) return null;
  const cleaned = cleanEvidence(quote);
  if (cleaned.length < MIN_EVIDENCE_CHARS) return null;

  const haystack = normalizePaper(paper);
  const needle = normalizeWithMap(cleaned).normalized;
  if (!needle) return null;
  const cutEnd = CUT_SHORT.test(quote);
  const typed = (index: number) => paper[haystack.map[index]];

  let index = indexOfWords(haystack.normalized, needle, cutEnd, typed);
  if (index === -1) {
    // Models sometimes drop or add a final period. Retry without trailing
    // sentence punctuation, still requiring every word to match.
    const trimmedNeedle = needle.replace(/[.,;:!?]+$/, "");
    if (trimmedNeedle.length < MIN_EVIDENCE_CHARS) return null;
    index = indexOfWords(haystack.normalized, trimmedNeedle, cutEnd, typed);
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

// A question label at the start of a transcription line: "Q1.", "Q2)",
// "Question 3:", "4.", "5)", "6:". Mirrors the labels the demo scanner reads.
const ANSWER_LINE = /^(\s*(?:(?:q|question)\s*\d{1,2}\s*[.):\-–—]?|\d{1,2}\s*[.):](?!\d))\s*)(.*?)\s*$/i;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

function lineSpan(line: string, lineStart: number, needle: string): EvidenceSpan | null {
  const { normalized, map } = normalizeWithMap(line);
  const text = normalized.replace(TRAILING_PUNCTUATION, "");
  if (!text || text !== needle) return null;
  return { start: lineStart + map[0], end: lineStart + map[text.length - 1] + 1 };
}

/**
 * Find a short answer that is the whole answer on one line of a test
 * transcription: "O horizon" on the line "Q2. O horizon", or the whole line
 * itself ("Q4. Roots", or "Roots" on an unnumbered line). Quotes under
 * MIN_EVIDENCE_CHARS are too generic to find anywhere in a paper, but an
 * exact match with a complete answer is still evidence that is in the paper.
 * Case, whitespace, quote style, and trailing punctuation are ignored; the
 * words must match the whole answer, so "horizon" never matches "O horizon".
 */
export function findAnswerLineSpan(paper: string, quote: string | null | undefined): EvidenceSpan | null {
  if (!quote) return null;
  const needle = normalizeWithMap(cleanEvidence(quote)).normalized.replace(TRAILING_PUNCTUATION, "");
  if (!needle) return null;

  let lineStart = 0;
  for (const line of paper.split("\n")) {
    const label = line.match(ANSWER_LINE);
    let span: EvidenceSpan | null = null;
    if (!label) span = lineSpan(line, lineStart, needle);
    // A bare label ("Q3.") is a blank answer: there is nothing to quote.
    else if (label[2]) span = lineSpan(label[2], lineStart + label[1].length, needle) ?? lineSpan(line, lineStart, needle);
    if (span) return span;
    lineStart += line.length + 1;
  }
  return null;
}

/**
 * Evidence on a test, where answers are often a word or two: a verbatim quote
 * (findEvidenceSpan), or else a whole answer line (findAnswerLineSpan).
 */
export function findTestEvidenceSpan(paper: string, quote: string | null | undefined): EvidenceSpan | null {
  return findEvidenceSpan(paper, quote) ?? findAnswerLineSpan(paper, quote);
}
