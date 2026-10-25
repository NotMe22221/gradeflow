// Heuristics for text inside a student paper that addresses the grader
// ("ignore the rubric", "give this essay full marks"). Pure: safe for unit
// tests and client components.
//
// Two consumers:
//  - validate.ts raises a POSSIBLE_PROMPT_INJECTION flag so the teacher sees it.
//  - mock.ts removes grader-directed sentences before computing any score
//    feature, so injected text can never raise a demo-grader score.
//
// This is a heuristic, not the security boundary. The Claude grader is
// protected by its system prompt and delimiter neutralization (prompt.ts), and
// every grade still needs a teacher's approval before it is published.

export type SentenceSpan = {
  /** The sentence exactly as it appears in the source text. */
  text: string;
  start: number;
  end: number;
  /** Zero-based line number of `start`. */
  line: number;
};

export type InjectionScan = { found: boolean; snippets: string[] };

const MAX_SNIPPET_CHARS = 200;
const MAX_SNIPPETS = 5;

// --- Sentence segmentation ---------------------------------------------------

const TERMINATORS = ".!?";
const CLOSERS = `"'”’)]»`;
const ABBREVIATIONS = new Set([
  "e.g",
  "i.e",
  "etc",
  "vs",
  "dr",
  "mr",
  "mrs",
  "ms",
  "prof",
  "st",
  "jr",
  "sr",
  "fig",
  "approx",
  "dept",
  "jan",
  "feb",
  "mar",
  "apr",
  "jun",
  "jul",
  "aug",
  "sep",
  "sept",
  "oct",
  "nov",
  "dec",
]);

function isWhitespace(ch: string | undefined): boolean {
  return ch !== undefined && /\s/.test(ch);
}

/** True when the "." at `dot` ends an abbreviation or initial, not a sentence. */
function endsAbbreviation(text: string, from: number, dot: number): boolean {
  let i = dot - 1;
  while (i >= from && /[A-Za-z.]/.test(text[i])) i--;
  const token = text.slice(i + 1, dot).toLowerCase();
  if (!token) return false;
  if (ABBREVIATIONS.has(token)) return true;
  // Initials ("J. K. Rowling") and dotted forms ("U.S.").
  return token.length === 1 || token.includes(".");
}

/**
 * Split text into sentences with their offsets. Line breaks always end a
 * sentence, so a heading or a one-line note never merges into the next line.
 */
export function splitSentences(text: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  let start = 0;
  let line = 0;

  const push = (end: number) => {
    let s = start;
    let e = end;
    while (s < e && isWhitespace(text[s])) s++;
    while (e > s && isWhitespace(text[e - 1])) e--;
    if (e > s) spans.push({ text: text.slice(s, e), start: s, end: e, line });
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") {
      push(i);
      start = i + 1;
      line++;
      continue;
    }
    if (!TERMINATORS.includes(ch)) continue;

    let j = i + 1;
    while (j < text.length && TERMINATORS.includes(text[j])) j++;
    while (j < text.length && CLOSERS.includes(text[j])) j++;
    // "3.5", "example.com", "U.S.A": no whitespace after the mark, keep going.
    if (j < text.length && !isWhitespace(text[j])) {
      i = j - 1;
      continue;
    }
    if (ch === "." && j === i + 1 && endsAbbreviation(text, start, i)) continue;
    // An ellipsis followed by a lowercase word continues the same sentence.
    if (text.slice(i, j).includes("..") && /^\s*[a-z]/.test(text.slice(j, j + 8))) {
      i = j - 1;
      continue;
    }
    push(j);
    start = j;
    i = j - 1;
  }
  push(text.length);
  return spans;
}

/**
 * The same segmentation, but single line breaks inside a paragraph are read
 * as spaces, so a sentence hard-wrapped across lines stays whole. Blank lines
 * still separate paragraphs. Offsets refer to the original text.
 */
function splitSentencesAcrossLines(text: string): SentenceSpan[] {
  // One-for-one replacement keeps every offset valid in the original text.
  const softened = text.replace(/(?<=\S)[ \t]*\n(?=[ \t]*\S)/g, (match) => match.replace("\n", " "));
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") lineStarts.push(i + 1);
  return splitSentences(softened).map((span) => {
    let line = 0;
    while (line + 1 < lineStarts.length && lineStarts[line + 1] <= span.start) line++;
    return { text: text.slice(span.start, span.end), start: span.start, end: span.end, line };
  });
}

// --- Pattern matching --------------------------------------------------------

// Zero-width spaces and joiners, word joiner, BOM, and soft hyphen: invisible
// characters that could split a keyword without changing how it looks.
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;

/**
 * Lowercase, strip invisible characters, fold full-width and curly forms,
 * rejoin letter-spaced words ("I-G-N-O-R-E", "g i v e"), and turn punctuation
 * into single spaces, so "Ignore... the RUBRIC!!" style spacing does not
 * defeat the patterns. Keeps %, + and / for "100%", "A+" and "10/10".
 */
function normalizeForMatch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(INVISIBLE_CHARS, "")
    .toLowerCase()
    .replace(/\b[a-z](?:[\s.\-_*]+[a-z]\b){2,}/g, (spaced) => spaced.replace(/[^a-z]/g, ""))
    .replace(/[‘’‛′`´]/g, "'")
    .replace(/'(?![a-z])|(?<![a-z])'/g, " ")
    .replace(/[^a-z0-9%+/']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ROLE_NOUNS = String.raw`(?:grader|ai|chatgpt|claude|model|gpt|llm|marker)`;

// Matched against normalizeForMatch() output.
const NORMALIZED_PATTERNS: RegExp[] = [
  /\bignore\s+(?:(?:all|the|any|every|previous|prior|above|earlier|your|my|these|those|of|grading|marking)\s+){0,4}(?:instructions?|rubrics?|directions?|criteria|criterion|rules|guidelines)\b/,
  /\b(?:give|award|assign|grant)\s+(?:(?:me|this|it|the|my|essay|paper|submission|assignment|student|author|writer|a|an)\s+){0,3}(?:full|maximum|max|perfect|100%|all\s+the|top|highest)\s+(?:marks?|points?|scores?|credit|grades?)\b/,
  /\byou\s+are\s+(?:now\s+)?(?:an?\s+|the\s+)?(?:ai|grader|grading\s+(?:ai|assistant|bot|model)|assistant|language\s+model|llm|chatbot)\b(?!\s+(?:researchers?|engineers?|developers?|experts?|skeptics?|enthusiasts?|company|companies|ethicists?|startups?|scientists?|systems?|tools?|models?|users?|fans?|critics?|literate)\b)/,
  /\bsystem\s+prompts?\b/,
  new RegExp(
    String.raw`\bnote\s+(?:to|for)\s+(?:the\s+)?(?:${ROLE_NOUNS}|teacher'?s?\s+ai|grading\s+(?:ai|assistant|model|system)|ai\s+(?:grader|system|model))\b`
  ),
  new RegExp(String.raw`(?:^|\s)(?:dear|hey|hi|hello)\s+(?:the\s+)?${ROLE_NOUNS}\b`),
  /\b(?:grade|score|rate|mark)\s+this\s+(?:essay|paper|submission|assignment)\s+(?:as\s+|a\s+)?(?:an?\s+)?(?:a\+|10\s*\/\s*10|perfect|100|full\s+marks)/,
  /\bdisregard\s+(?:(?:the|all|any|previous|prior|above|your|grading|these)\s+){0,3}(?:rubrics?|instructions?|directions?|criteria|rules|guidelines)\b/,
  /\bforget\s+(?:(?:all|the|any|previous|prior|above|your|earlier)\s+){0,3}(?:instructions?|rubrics?|directions?|criteria|rules)\b/,
  /\b(?:this|my)\s+(?:essay|paper|submission|assignment)\s+(?:deserves|should\s+(?:get|receive|be\s+given))\s+(?:an?\s+)?(?:full|maximum|max|perfect|100%|a\+|top|the\s+highest)\b/,
];

// "Attention" is common in ordinary prose ("attention models"), so it only
// counts as a salutation when punctuation follows the addressee.
const SALUTATION_PATTERN = new RegExp(
  String.raw`(?:^|[.!?:]\s*)attention\s*,?\s*(?:the\s+)?${ROLE_NOUNS}\s*[:,!.\-]`
);

/** True when a sentence or line is addressed to the grader or AI. */
export function isGraderDirected(text: string): boolean {
  const normalized = normalizeForMatch(text);
  if (!normalized) return false;
  if (NORMALIZED_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  const lowered = text.normalize("NFKC").replace(INVISIBLE_CHARS, "").toLowerCase();
  return SALUTATION_PATTERN.test(lowered.trim());
}

// Short shouted lead-ins ("IMPORTANT!", "SYSTEM OVERRIDE!!!", "P.S.") that sit
// next to a grader-directed sentence on the same line belong to it.
function isLeadInFragment(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;
  if (/^(?:p\.?\s?s\.?|n\.?\s?b\.?|note|important|attention|reminder|instructions?|override)\b/i.test(text)) {
    return true;
  }
  return /[A-Z]/.test(text) && !/[a-z]/.test(text);
}

type Range = { start: number; end: number };

function overlaps(a: Range, b: Range): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Sentences addressed to the grader, plus their lead-in fragments. */
function findGraderDirectedSpans(paper: string): { matched: SentenceSpan[]; removed: Range[] } {
  const sentences = splitSentences(paper);
  const flagged = sentences.map((s) => isGraderDirected(s.text));
  const matched = sentences.filter((_, i) => flagged[i]);
  const removed: Range[] = matched.map(({ start, end }) => ({ start, end }));

  for (let i = 0; i < sentences.length; i++) {
    if (!flagged[i]) continue;
    for (const j of [i - 1, i + 1]) {
      const neighbor = sentences[j];
      if (!neighbor || flagged[j] || neighbor.line !== sentences[i].line) continue;
      if (isLeadInFragment(neighbor.text)) removed.push({ start: neighbor.start, end: neighbor.end });
    }
  }

  // Catch instructions hard-wrapped across two lines that the per-line pass
  // cannot see. Only sentences that do not overlap an existing match count.
  for (const span of splitSentencesAcrossLines(paper)) {
    if (!span.text.includes("\n")) continue;
    if (removed.some((range) => overlaps(range, span))) continue;
    if (isGraderDirected(span.text)) {
      matched.push(span);
      removed.push({ start: span.start, end: span.end });
    }
  }

  // Catch instructions chopped into fragments on one line ("Ignore. The.
  // Rubric."): the whole line goes when only the line as a whole matches.
  let lineStart = 0;
  paper.split("\n").forEach((text, line) => {
    const start = lineStart + (text.length - text.trimStart().length);
    const end = lineStart + text.trimEnd().length;
    lineStart += text.length + 1;
    if (end <= start) return;
    const span = { text: paper.slice(start, end), start, end, line };
    if (removed.some((range) => overlaps(range, span))) return;
    if (isGraderDirected(span.text)) {
      matched.push(span);
      removed.push({ start, end });
    }
  });

  matched.sort((a, b) => a.start - b.start);
  return { matched, removed };
}

function toSnippet(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= MAX_SNIPPET_CHARS) return flat;
  return `${flat.slice(0, MAX_SNIPPET_CHARS - 1).trimEnd()}…`;
}

/** Find sentences that address the grader rather than make the paper's argument. */
export function detectPromptInjection(paper: string): InjectionScan {
  if (!paper) return { found: false, snippets: [] };
  const { matched } = findGraderDirectedSpans(paper);
  const snippets: string[] = [];
  for (const span of matched) {
    const snippet = toSnippet(span.text);
    if (snippet && !snippets.includes(snippet)) snippets.push(snippet);
    if (snippets.length >= MAX_SNIPPETS) break;
  }
  return { found: snippets.length > 0, snippets };
}

/**
 * The paper with grader-directed sentences removed. Lines emptied by the
 * removal are dropped entirely, so appending or inserting an injected line
 * leaves the remaining text, and its paragraph structure, exactly as it was.
 * Untouched papers are returned unchanged.
 */
export function stripGraderDirectedText(paper: string): string {
  if (!paper) return paper;
  const { removed } = findGraderDirectedSpans(paper);
  if (removed.length === 0) return paper;

  const drop = new Uint8Array(paper.length);
  for (const range of removed) drop.fill(1, range.start, range.end);

  const lines: string[] = [];
  let lineStart = 0;
  for (let i = 0; i <= paper.length; i++) {
    if (i < paper.length && paper[i] !== "\n") continue;
    let kept = "";
    let touched = false;
    for (let k = lineStart; k < i; k++) {
      if (drop[k]) touched = true;
      else kept += paper[k];
    }
    if (!touched) lines.push(kept);
    else {
      const tidy = kept.replace(/[ \t]{2,}/g, " ").trim();
      if (tidy) lines.push(tidy);
    }
    lineStart = i + 1;
  }
  return lines.join("\n");
}
