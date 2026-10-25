// The deterministic demo grader, used when no ANTHROPIC_API_KEY is set. Pure:
// no randomness, no clock, no I/O, so the same paper and rubric always get the
// same suggestion. It is labelled "Demo grader" everywhere in the UI.
//
// Scores come from surface features of the text (length against the expected
// length, paragraphing, sentence variety, transitions, evidence markers,
// numbers, quotations, keyword overlap with each criterion, and mechanical
// slips). Grader-directed sentences ("ignore the rubric...") are removed
// before any feature is computed and are never quoted as evidence, so
// injected text cannot raise a score.

import type { Confidence } from "@/lib/constants";
import { pluralize } from "@/lib/format";
import { cleanEvidence, findEvidenceSpan, MIN_EVIDENCE_CHARS } from "@/lib/grading/evidence";
import {
  detectPromptInjection,
  isGraderDirected,
  splitSentences,
  stripGraderDirectedText,
} from "@/lib/grading/injection";
import type {
  Grader,
  GradingInput,
  RawCriterionResult,
  RawGradingResult,
  RubricCriterionInput,
} from "@/lib/grading/types";

type Dimension = "thesis" | "evidence" | "organization" | "mechanics" | "analysis" | "counterargument" | "general";
type Band = "strong" | "mid" | "weak";

const DEFAULT_TARGET_WORDS = 350;
const MIN_EVIDENCE_WORDS = 8;
const MAX_EVIDENCE_WORDS = 30;

// --- Vocabulary --------------------------------------------------------------

const STOPWORDS = new Set(
  (
    "a about above after again against all also am an and any are as at be because been before being below " +
    "between both but by can could did do does doing down during each few for from further had has have having " +
    "he her here hers herself him himself his how i if in into is it its itself just me more most my myself no " +
    "nor not now of off on once only or other our ours ourselves out over own same she should so some such than " +
    "that the their theirs them themselves then there these they this those through to too under until up very " +
    "was we were what when where which while who whom why will with would you your yours yourself yourselves " +
    "one two three also may might must shall upon within without whether"
  ).split(" ")
);

// Rubric boilerplate that says nothing about the topic of a criterion.
const RUBRIC_FILLER = new Set(
  (
    "paper essay student writer writing response full credit point points clear clearly well strong strongly " +
    "effective effectively use uses using used demonstrate demonstrates show shows throughout each every " +
    "appropriate relevant good excellent includes include including provides provide make makes level score " +
    "meets meet fully complete completely consistent consistently thorough thoroughly skill skilled"
  ).split(" ")
);

// Assignment boilerplate ("Write a 400-600 word essay...") that says nothing about the topic.
const INSTRUCTION_FILLER = new Set(
  (
    "write words word essay paper least take address explain describe discuss argumentative persuasive " +
    "position support evidence counterargument counterarguments source sources cite citation paragraph " +
    "paragraphs page pages student students include response respond prompt answer question"
  ).split(" ")
);

const STRONG_TRANSITIONS = [
  "however",
  "therefore",
  "furthermore",
  "moreover",
  "consequently",
  "nevertheless",
  "in addition",
  "additionally",
  "as a result",
  "on the other hand",
  "in contrast",
  "for example",
  "for instance",
  "similarly",
  "likewise",
  "meanwhile",
  "in conclusion",
  "ultimately",
];
// Only count as transitions when they open a sentence.
const OPENING_TRANSITIONS = ["first", "second", "third", "next", "finally", "another", "overall", "to begin", "thus", "instead", "in particular", "specifically"];
const EVIDENCE_MARKERS = [
  "for example",
  "for instance",
  "according to",
  "such as",
  "found that",
  "shows that",
  "showed that",
  "reported",
  "study",
  "studies",
  "survey",
  "research",
  "researchers",
  "data",
  "statistics",
  "evidence",
  "percent",
  "experts",
  "doctors",
  "scientists",
  "the author",
  "states that",
  "writes that",
];
const REASONING_MARKERS = [
  "because",
  "therefore",
  "thus",
  "this means",
  "this shows",
  "which shows",
  "which means",
  "suggests",
  "as a result",
  "consequently",
  "implies",
  "in other words",
  "this is why",
  "leads to",
  "explains",
  "demonstrates",
  "reveals",
  "so that",
  "the reason",
  "means that",
  "shows that",
  "suggest",
  "for this reason",
  "which is why",
  "this matters",
  "compared with",
  "compared to",
];
const COUNTER_MARKERS = [
  "however",
  "although",
  "some argue",
  "some people",
  "some may",
  "critics",
  "opponents",
  "on the other hand",
  "while some",
  "others may",
  "others argue",
  "it is true that",
  "admittedly",
  "despite",
  "even though",
  "skeptics",
  "nevertheless",
  "granted",
  "to be fair",
];
const CLAIM_MARKERS = [
  "i argue",
  "i believe",
  "i think",
  "this essay",
  "this paper",
  "should",
  "must",
  "need to",
  "needs to",
  "the main reason",
  "argue that",
  "my position",
  "ought to",
  "is essential",
  "the best",
];
const CONCLUSION_MARKERS = ["in conclusion", "to conclude", "overall", "ultimately", "in summary", "to sum up", "in the end", "all in all", "in short"];
const MISSPELLINGS = new Set(
  (
    "teh recieve alot definately seperate untill wich becuase thier occured arguement goverment enviroment " +
    "beleive tommorow truely wierd noone dont doesnt didnt isnt cant wouldnt couldnt shouldnt im thru alright"
  ).split(" ")
);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phraseRegExp(phrase: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(phrase).replace(/ /g, "\\s+")}\\b`, "g");
}

const PHRASE_CACHE = new Map<string, RegExp>();
function countPhrase(lower: string, phrase: string): number {
  let regex = PHRASE_CACHE.get(phrase);
  if (!regex) {
    regex = phraseRegExp(phrase);
    PHRASE_CACHE.set(phrase, regex);
  }
  regex.lastIndex = 0;
  return lower.match(regex)?.length ?? 0;
}

/** Occurrences of each phrase, capped per phrase so one word cannot dominate. */
function countPhrases(lower: string, phrases: string[], capPerPhrase = 3): { total: number; used: string[] } {
  let total = 0;
  const used: string[] = [];
  for (const phrase of phrases) {
    const count = Math.min(capPerPhrase, countPhrase(lower, phrase));
    if (count > 0) {
      total += count;
      used.push(phrase);
    }
  }
  return { total, used };
}

// --- Small helpers -----------------------------------------------------------

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/** Saturating curve: 0 at 0, approaches 1 as x grows past k. */
function saturate(x: number, k: number): number {
  return 1 - Math.exp(-Math.max(0, x) / k);
}

/** FNV-1a: a stable, dependency-free hash for picking phrasings. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function tokenize(lower: string): string[] {
  return lower.match(/[a-z0-9]+(?:['’][a-z]+)*/g) ?? [];
}

function stem(word: string): string {
  let w = word.replace(/['’]s$/, "");
  for (const suffix of ["ingly", "edly", "ing", "ies", "ed", "es", "ly", "s"]) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      w = w.slice(0, -suffix.length) + (suffix === "ies" ? "y" : "");
      break;
    }
  }
  return w;
}

function contentStems(text: string, exclude?: Set<string>): Set<string> {
  const stems = new Set<string>();
  for (const token of tokenize(text.toLowerCase())) {
    if (token.length < 3 || STOPWORDS.has(token) || /^\d/.test(token)) continue;
    if (exclude?.has(token)) continue;
    stems.add(stem(token));
  }
  return stems;
}

function overlapRatio(terms: Set<string>, pool: Set<string>): number {
  if (terms.size === 0) return 0;
  let hits = 0;
  for (const term of terms) if (pool.has(term)) hits++;
  return hits / terms.size;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const term of a) if (b.has(term)) inter++;
  return inter / (a.size + b.size - inter);
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function quoteList(phrases: string[], max = 2): string {
  return joinList(phrases.slice(0, max).map((phrase) => `"${phrase}"`));
}

// --- Text analysis -----------------------------------------------------------

type Sentence = {
  text: string;
  lower: string;
  paragraph: number;
  index: number;
  isLast: boolean;
  words: number;
  hasError: boolean;
  startsWithTransition: boolean;
};

type MechanicsIssues = {
  lowercaseStarts: number;
  repeatedWords: number;
  lowercaseI: number;
  misspellings: number;
  runOns: number;
  missingPunctuation: number;
};

type Features = {
  wordCount: number;
  targetWords: number;
  lengthFactor: number;
  paragraphCount: number;
  sentences: Sentence[];
  avgSentenceWords: number;
  sentenceWordsSd: number;
  lexicalDiversity: number;
  transitionsUsed: string[];
  evidenceMarkers: number;
  evidenceMarkersUsed: string[];
  numbers: number;
  quotations: number;
  reasoningMarkers: number;
  reasoningUsed: string[];
  counterMarkers: number;
  counterUsed: string[];
  claimMarkersIntro: number;
  hasConclusionMarker: boolean;
  introConclusionEcho: number;
  topicOverlap: number;
  topicStems: Set<string>;
  issues: MechanicsIssues;
  errorCount: number;
  stems: Set<string>;
};

/** The expected length, read from instructions like "400-600 words" or "at least 500 words". */
export function expectedWordCount(instructions: string): number {
  const range = instructions.match(/(\d{2,4})\s*(?:-|–|—|to)\s*(\d{2,4})\s*words?/i);
  const single = instructions.match(/(\d{2,4})\s*\+?\s*words?/i);
  const value = range ? Number(range[1]) : single ? Number(single[1]) : DEFAULT_TARGET_WORDS;
  return Math.min(3000, Math.max(100, value));
}

function splitParagraphs(text: string): string[] {
  const blocks = /\n[ \t]*\n/.test(text) ? text.split(/\n(?:[ \t]*\n)+/) : text.split("\n");
  return blocks.map((block) => block.trim()).filter(Boolean);
}

function startsWithTransition(lower: string): boolean {
  const opening = lower.replace(/^["'“‘(\[]+/, "");
  return [...STRONG_TRANSITIONS, ...OPENING_TRANSITIONS].some((t) => opening.startsWith(`${t} `) || opening.startsWith(`${t},`));
}

function sentenceHasError(text: string, words: number): boolean {
  const first = text.replace(/^["'“‘(\[]+/, "")[0] ?? "";
  if (/[a-z]/.test(first)) return true;
  if (/\b([A-Za-z']+)\s+\1\b/i.test(text)) return true;
  if (/(?:^|\s)i(?=[\s,.;:!?']|$)/.test(text)) return true;
  if (tokenize(text.toLowerCase()).some((token) => MISSPELLINGS.has(token))) return true;
  if (words > 45) return true;
  return words >= 6 && !/[.!?"”')\]]$/.test(text);
}

function analyze(input: GradingInput): Features {
  // Grader-directed text is removed before anything is measured.
  const clean = stripGraderDirectedText(input.paper).trim();
  const lowerAll = clean.toLowerCase();
  const tokens = tokenize(lowerAll);
  const wordTokens = tokens.filter((token) => !/^\d/.test(token));
  const wordCount = countWords(clean);

  const paragraphs = splitParagraphs(clean);
  const sentences: Sentence[] = [];
  paragraphs.forEach((paragraph, p) => {
    // A line break inside a paragraph followed by a lowercase word is a soft
    // wrap; read it as a space (one-for-one, so offsets still line up).
    const softened = paragraph.replace(/(?<=[^.!?:"”\n])[ \t]*\n(?=[ \t]*[a-z])/g, (m) => m.replace("\n", " "));
    const spans = splitSentences(softened);
    spans.forEach((span, index) => {
      const text = paragraph.slice(span.start, span.end);
      const words = countWords(text);
      const lower = text.toLowerCase();
      sentences.push({
        text,
        lower,
        paragraph: p,
        index,
        isLast: index === spans.length - 1,
        words,
        hasError: sentenceHasError(text, words),
        startsWithTransition: startsWithTransition(lower),
      });
    });
  });

  const lengths = sentences.map((s) => s.words);
  const avgSentenceWords = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const sentenceWordsSd = lengths.length
    ? Math.sqrt(lengths.reduce((acc, n) => acc + (n - avgSentenceWords) ** 2, 0) / lengths.length)
    : 0;

  const sample = wordTokens.slice(0, 300);
  const lexicalDiversity = sample.length ? new Set(sample).size / sample.length : 0;

  const transitionsUsed: string[] = [];
  for (const transition of STRONG_TRANSITIONS) {
    if (countPhrase(lowerAll, transition) > 0) transitionsUsed.push(transition);
  }
  for (const sentence of sentences) {
    const opening = sentence.lower.replace(/^["'“‘(\[]+/, "");
    for (const transition of OPENING_TRANSITIONS) {
      if ((opening.startsWith(`${transition} `) || opening.startsWith(`${transition},`)) && !transitionsUsed.includes(transition)) {
        transitionsUsed.push(transition);
      }
    }
  }

  const evidence = countPhrases(lowerAll, EVIDENCE_MARKERS);
  const reasoning = countPhrases(lowerAll, REASONING_MARKERS);
  const counter = countPhrases(lowerAll, COUNTER_MARKERS);
  const numbers = Math.min(12, clean.match(/\b\d+(?:[.,]\d+)*%?/g)?.length ?? 0);
  const quotations = Math.min(8, clean.match(/["“][^"“”\n]{3,}["”]/g)?.length ?? 0);

  const intro = sentences.filter((s) => s.paragraph === 0 || (paragraphs.length === 1 && s.index < 3));
  const introLower = intro.map((s) => s.lower).join(" ");
  const claimMarkersIntro = countPhrases(introLower, CLAIM_MARKERS, 2).total;
  const lastParagraph = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1].toLowerCase() : "";
  const hasConclusionMarker = CONCLUSION_MARKERS.some((m) => countPhrase(lastParagraph || lowerAll.slice(-600), m) > 0);
  const introConclusionEcho = paragraphs.length > 1 ? jaccard(contentStems(paragraphs[0]), contentStems(lastParagraph)) : 0;

  const stems = contentStems(clean);
  const titleStems = contentStems(input.assignmentTitle, INSTRUCTION_FILLER);
  const instructionStems = contentStems(input.instructions, INSTRUCTION_FILLER);
  const topicStems = new Set([...titleStems, ...instructionStems]);
  // The title names the topic most directly, so it counts for more.
  const topicOverlap = titleStems.size
    ? 0.6 * overlapRatio(titleStems, stems) + 0.4 * overlapRatio(instructionStems, stems)
    : overlapRatio(instructionStems, stems);

  const issues: MechanicsIssues = {
    lowercaseStarts: sentences.filter((s) => /[a-z]/.test(s.text.replace(/^["'“‘(\[]+/, "")[0] ?? "")).length,
    repeatedWords: clean.match(/\b([A-Za-z']+)\s+\1\b/gi)?.length ?? 0,
    lowercaseI: clean.match(/(?:^|\s)i(?=[\s,.;:!?']|$)/g)?.length ?? 0,
    misspellings: tokens.filter((token) => MISSPELLINGS.has(token)).length,
    runOns: sentences.filter((s) => s.words > 45).length,
    missingPunctuation: sentences.filter((s) => s.words >= 6 && !/[.!?"”')\]]$/.test(s.text)).length,
  };
  const errorCount = Object.values(issues).reduce((a, b) => a + b, 0);

  const targetWords = expectedWordCount(input.instructions);
  const ratio = wordCount / targetWords;
  let lengthFactor = clamp01(ratio / 0.85) ** 0.9;
  if (ratio > 2.5) lengthFactor = 0.9;

  return {
    wordCount,
    targetWords,
    lengthFactor,
    paragraphCount: paragraphs.length,
    sentences,
    avgSentenceWords,
    sentenceWordsSd,
    lexicalDiversity,
    transitionsUsed,
    evidenceMarkers: evidence.total,
    evidenceMarkersUsed: evidence.used,
    numbers,
    quotations,
    reasoningMarkers: reasoning.total,
    reasoningUsed: reasoning.used,
    counterMarkers: counter.total,
    counterUsed: counter.used,
    claimMarkersIntro,
    hasConclusionMarker,
    introConclusionEcho,
    topicOverlap,
    topicStems,
    issues,
    errorCount,
    stems,
  };
}

// --- Scoring -----------------------------------------------------------------

const DIMENSION_PATTERNS: Array<[Exclude<Dimension, "general">, RegExp]> = [
  ["counterargument", /counter|opposing|rebut|objection|other side|alternative (?:view|perspective)/],
  ["evidence", /evidence|support|example|source|citation|cite|data|research|quot|detail|textual/],
  ["thesis", /thesis|claim|argument|position|main idea|focus|purpose|central idea|controlling idea|stance/],
  ["organization", /organi[sz]|structure|flow|transition|paragraph|coheren|order|sequence|introduction|conclusion/],
  ["analysis", /analy|reasoning|explain|explanation|insight|interpret|critical|depth|connect|reflect|understanding|significance/],
  ["mechanics", /grammar|mechanic|spelling|punctuation|convention|style|clarity|language|word choice|voice|tone|sentence|fluency|proofread|usage/],
];

/** Which kind of quality a criterion measures, judged from its title first. */
export function classifyCriterion(criterion: Pick<RubricCriterionInput, "title" | "description">): Dimension {
  const title = criterion.title.toLowerCase();
  let best: Dimension = "general";
  let bestIndex = Number.POSITIVE_INFINITY;
  for (const [dimension, pattern] of DIMENSION_PATTERNS) {
    const index = title.search(pattern);
    if (index !== -1 && index < bestIndex) {
      best = dimension;
      bestIndex = index;
    }
  }
  if (best !== "general") return best;

  const description = criterion.description.toLowerCase();
  let bestCount = 0;
  for (const [dimension, pattern] of DIMENSION_PATTERNS) {
    const count = description.match(new RegExp(pattern.source, "g"))?.length ?? 0;
    if (count > bestCount) {
      best = dimension;
      bestCount = count;
    }
  }
  return best;
}

function dimensionScore(dimension: Dimension, f: Features): number {
  // Floor the denominator so a single figure in a tiny paper is not "dense" evidence.
  const per100 = Math.max(2, f.wordCount / 100);
  switch (dimension) {
    case "thesis": {
      const claim = saturate(f.claimMarkersIntro, 1.2);
      const topic = clamp01(f.topicOverlap * 2.2);
      const focus = f.paragraphCount > 1 ? clamp01(f.introConclusionEcho * 6) : 0.3;
      return clamp01(0.2 + 0.35 * claim + 0.25 * topic + 0.2 * focus);
    }
    case "evidence": {
      const density = (f.evidenceMarkers + f.numbers * 0.7 + f.quotations * 1.2) / per100;
      return clamp01(0.25 + 0.75 * saturate(density, 1.3));
    }
    case "organization": {
      const paragraphs = clamp01((f.paragraphCount - 1) / 4);
      const transitions = saturate(f.transitionsUsed.length, 3);
      const conclusion = f.hasConclusionMarker ? 1 : f.introConclusionEcho > 0.12 ? 0.6 : 0.2;
      return clamp01(0.15 + 0.35 * paragraphs + 0.3 * transitions + 0.2 * conclusion);
    }
    case "mechanics": {
      const errorRate = f.errorCount / Math.max(1, f.sentences.length);
      const accuracy = 1 - clamp01(errorRate * 1.6);
      const variety = clamp01(f.sentenceWordsSd / 7);
      const avg = f.avgSentenceWords;
      const length = avg >= 12 && avg <= 24 ? 1 : avg < 12 ? clamp01(avg / 12) : clamp01(1 - (avg - 24) / 20);
      return clamp01(0.55 * accuracy + 0.25 * variety + 0.2 * length);
    }
    case "analysis": {
      const reasoning = saturate(f.reasoningMarkers / per100, 0.9);
      const diversity = clamp01((f.lexicalDiversity - 0.4) / 0.25);
      const depth = clamp01(f.avgSentenceWords / 18);
      return clamp01(0.15 + 0.45 * reasoning + 0.25 * diversity + 0.15 * depth);
    }
    case "counterargument":
      return clamp01(0.15 + 0.85 * saturate(f.counterMarkers, 1.5));
    case "general":
      return (
        (dimensionScore("thesis", f) +
          dimensionScore("evidence", f) +
          dimensionScore("organization", f) +
          dimensionScore("analysis", f) +
          dimensionScore("mechanics", f)) /
        5
      );
  }
}

function scoreFraction(dimension: Dimension, f: Features, keywordOverlap: number): number {
  if (f.wordCount === 0) return 0;
  const raw = 0.72 * dimensionScore(dimension, f) + 0.1 * clamp01(keywordOverlap * 3) + 0.18 * f.lengthFactor;
  // Short papers pull every criterion down, whatever their surface features,
  // and a paper of a few words cannot earn more than a token score.
  const gated = raw * (0.6 + 0.4 * f.lengthFactor);
  return clamp01(Math.min(gated, 0.1 + 1.2 * f.lengthFactor));
}

function toHalfPoints(fraction: number, maxPoints: number): number {
  const max = Math.max(0, maxPoints);
  return Math.min(max, Math.max(0, Math.round(fraction * max * 2) / 2));
}

function bandFor(fraction: number): Band {
  if (fraction >= 0.75) return "strong";
  if (fraction >= 0.5) return "mid";
  return "weak";
}

// --- Justifications ----------------------------------------------------------

type Template = (f: Features, criterion: RubricCriterionInput) => string;

function evidenceInventory(f: Features): string {
  const parts: string[] = [];
  if (f.numbers) parts.push(pluralize(f.numbers, "specific figure"));
  if (f.quotations) parts.push(pluralize(f.quotations, "direct quotation"));
  if (f.evidenceMarkers) parts.push(pluralize(f.evidenceMarkers, "signposted example or source", "signposted examples or sources"));
  return joinList(parts);
}

function mechanicsInventory(f: Features): string {
  const parts: string[] = [];
  if (f.issues.lowercaseStarts) parts.push(pluralize(f.issues.lowercaseStarts, "sentence starting in lowercase", "sentences starting in lowercase"));
  if (f.issues.lowercaseI) parts.push(`a lowercase "i"`);
  if (f.issues.repeatedWords) parts.push(pluralize(f.issues.repeatedWords, "repeated word"));
  if (f.issues.misspellings) parts.push(pluralize(f.issues.misspellings, "misspelling"));
  if (f.issues.runOns) parts.push(pluralize(f.issues.runOns, "run-on sentence"));
  if (f.issues.missingPunctuation) parts.push(pluralize(f.issues.missingPunctuation, "sentence missing end punctuation", "sentences missing end punctuation"));
  return joinList(parts.slice(0, 3));
}

function paragraphPhrase(count: number): string {
  return count <= 1 ? "a single block of text" : pluralize(count, "paragraph");
}

const TEMPLATES: Record<Dimension, Record<Band, Template[]>> = {
  thesis: {
    strong: [
      () => "The introduction takes a clear, arguable position, and the conclusion returns to it, so the paper stays focused on the prompt.",
      () => "A specific claim appears in the opening paragraph, and the body paragraphs keep building on it rather than drifting.",
    ],
    mid: [
      () => "The paper signals a position early, but the claim is broad and the conclusion only partly returns to it.",
      () => "A main idea is present, though it is stated loosely and could say more precisely what the paper sets out to prove.",
    ],
    weak: [
      () => "The paper never states a clear, arguable position, so it is hard to tell what it sets out to prove.",
      () => "The main claim is missing or only implied; the opening reads as background rather than an argument.",
    ],
  },
  evidence: {
    strong: [
      (f) => `Backs up its claims with ${evidenceInventory(f)}, which makes the reasoning easy to check.`,
      (f) => `Evidence is specific and frequent: the paper offers ${evidenceInventory(f)} across its body paragraphs.`,
    ],
    mid: [
      (f) => `Includes some support (${evidenceInventory(f) || "a few general examples"}), but several claims rest on general statements rather than specifics.`,
      (f) => `There is relevant support here, including ${evidenceInventory(f) || "a few general examples"}, though it is thin in places and not always explained.`,
    ],
    weak: [
      () => "Most claims are asserted without specific examples, data, or quotations to back them up.",
      (f) =>
        f.evidenceMarkers + f.numbers + f.quotations > 0
          ? `Offers little concrete support beyond ${evidenceInventory(f)}; most paragraphs need specific examples or sources.`
          : "Offers no concrete examples, figures, or quotations; adding specific support would strengthen every paragraph.",
    ],
  },
  organization: {
    strong: [
      (f) =>
        f.transitionsUsed.length >= 2
          ? `Organized into ${paragraphPhrase(f.paragraphCount)} with clear transitions such as ${quoteList(f.transitionsUsed)}, moving logically from introduction to conclusion.`
          : `Organized into ${paragraphPhrase(f.paragraphCount)} that move logically from introduction to conclusion.`,
      (f) => `Each of the ${pluralize(f.paragraphCount, "paragraph")} has a clear job, and the conclusion ties the sequence of ideas together.`,
    ],
    mid: [
      (f) =>
        f.transitionsUsed.length
          ? `The paper uses ${paragraphPhrase(f.paragraphCount)} and some transitions (${quoteList(f.transitionsUsed, 1)}), but the order of ideas is not always easy to follow.`
          : `The paper uses ${paragraphPhrase(f.paragraphCount)}, but transitions between ideas are sparse, so the order is not always easy to follow.`,
      (f) =>
        f.hasConclusionMarker
          ? "The structure is recognizable, though some paragraphs mix several ideas and the links between them are thin."
          : `The structure is recognizable across ${paragraphPhrase(f.paragraphCount)}, but the ending stops rather than concludes.`,
    ],
    weak: [
      (f) => `Ideas run together in ${paragraphPhrase(f.paragraphCount)} with few transitions, which makes the line of reasoning hard to follow.`,
      () => "There is no clear introduction, body, and conclusion, so the reader has to work out how the ideas connect.",
    ],
  },
  mechanics: {
    strong: [
      () => "The writing is clean and controlled, with varied sentence lengths and very few errors in grammar or punctuation.",
      () => "Sentences are varied and correctly punctuated; a quick proofread would catch the few remaining slips.",
    ],
    mid: [
      (f) =>
        f.errorCount
          ? `Generally readable, but there are mechanical slips (${mechanicsInventory(f)}) that a careful proofread would catch.`
          : "Generally readable and mostly correct, though sentence structure is repetitive in places.",
      (f) =>
        f.avgSentenceWords < 12
          ? "Mostly correct, but many short, similar sentences make the writing feel choppy."
          : `Mostly correct, with some slips (${mechanicsInventory(f) || "uneven sentence control"}) that interrupt the reading.`,
    ],
    weak: [
      (f) => `Frequent mechanical errors (${mechanicsInventory(f) || "fragments and run-ons"}) get in the way of the meaning; it needs careful proofreading.`,
      (f) =>
        f.errorCount
          ? `Errors such as ${mechanicsInventory(f)} appear throughout and make several sentences hard to follow.`
          : "Sentence control is weak, with very short or very long sentences that make the meaning hard to follow.",
    ],
  },
  analysis: {
    strong: [
      (f) =>
        f.reasoningUsed.length
          ? `Goes beyond summary by explaining why the evidence matters, using reasoning links like ${quoteList(f.reasoningUsed)} to connect ideas.`
          : "Goes beyond summary by explaining why each point matters to the argument.",
      () => "Explains how each example supports the claim and considers what follows from it, rather than just listing facts.",
    ],
    mid: [
      () => "Some explanation connects the evidence to the claim, but parts of the paper summarize rather than analyze.",
      () => "The paper starts to explain why its points matter, though the reasoning is often a single sentence and could go deeper.",
    ],
    weak: [
      () => "Mostly describes or lists ideas without explaining how they support the argument.",
      () => "Points are stated but not explained; the paper rarely says why an example matters or what it shows.",
    ],
  },
  counterargument: {
    strong: [
      (f) =>
        f.counterUsed.length
          ? `Acknowledges an opposing view (signalled by ${quoteList(f.counterUsed, 1)}) and responds to it, which strengthens the argument.`
          : "Acknowledges an opposing view and responds to it, which strengthens the argument.",
      () => "Takes another perspective seriously and explains why the paper's position still holds.",
    ],
    mid: [
      () => "Briefly mentions another perspective but does not fully respond to it.",
      () => "Nods to an opposing view, though the rebuttal is short and leaves the objection partly unanswered.",
    ],
    weak: [
      () => "Does not address counterarguments or alternative viewpoints.",
      () => "The paper presents only one side and never engages with how someone might disagree.",
    ],
  },
  general: {
    strong: [
      (_f, c) => `Meets the expectations for "${c.title}" well: the response is developed, specific, and closely tied to the prompt.`,
      (_f, c) => `Strong on "${c.title}", with specific, well-developed points that match what full credit describes.`,
    ],
    mid: [
      (_f, c) => `Partly meets the expectations for "${c.title}"; the response is on topic but uneven in development.`,
      (_f, c) => `Shows a reasonable grasp of "${c.title}", though some points need more detail to reach full credit.`,
    ],
    weak: [
      (_f, c) => `Falls short on "${c.title}": the response is underdeveloped compared with what full credit describes.`,
      (_f, c) => `Does little to address "${c.title}"; key elements of the full-credit description are missing.`,
    ],
  },
};

// --- Evidence selection ------------------------------------------------------

type Candidate = {
  text: string;
  sentence: Sentence;
  /** A clause window cut from a longer sentence. */
  partial: boolean;
  /** Shorter than the 8-word minimum; used only when nothing better exists. */
  short: boolean;
  // Features computed once per candidate, then reused for every criterion.
  stems: Set<string>;
  claims: number;
  evidenceMarkers: number;
  numbers: number;
  hasQuotation: boolean;
  hasConclusionMarker: boolean;
  reasoning: number;
  counter: number;
  commas: number;
};

const CLAUSE_BREAK = /[,;:](?=\s)|\s[—–-]\s/g;

/** Clause windows of a long sentence that fit the 8-30 word quote limit. */
function clauseWindows(sentence: Sentence): string[] {
  const text = sentence.text;
  const cuts = [0];
  for (const match of text.matchAll(CLAUSE_BREAK)) cuts.push((match.index ?? 0) + match[0].length);
  cuts.push(text.length);
  const windows: string[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    for (let j = i + 1; j < cuts.length; j++) {
      const piece = text.slice(cuts[i], cuts[j]).trim().replace(/[\s,;:—–-]+$/, "");
      const words = countWords(piece);
      if (words > MAX_EVIDENCE_WORDS) break;
      if (words >= MIN_EVIDENCE_WORDS) windows.push(piece);
    }
  }
  if (windows.length === 0) {
    // No clause fits: take the first 30 words, exactly as written.
    const match = text.match(new RegExp(`^(?:\\S+\\s+){${MAX_EVIDENCE_WORDS - 1}}\\S+`));
    if (match) windows.push(match[0].replace(/[,;:—–-]+$/, ""));
  }
  return windows;
}

function describeCandidate(text: string, sentence: Sentence, partial: boolean, short: boolean): Candidate {
  const lower = text.toLowerCase();
  return {
    text,
    sentence,
    partial,
    short,
    stems: contentStems(text),
    claims: countPhrases(lower, CLAIM_MARKERS, 1).total,
    evidenceMarkers: countPhrases(lower, EVIDENCE_MARKERS, 2).total,
    numbers: text.match(/\b\d+(?:[.,]\d+)*%?/g)?.length ?? 0,
    hasQuotation: /["“][^"“”]{3,}["”]/.test(text),
    hasConclusionMarker: CONCLUSION_MARKERS.some((marker) => countPhrase(lower, marker) > 0),
    reasoning: countPhrases(lower, REASONING_MARKERS, 2).total,
    counter: countPhrases(lower, COUNTER_MARKERS, 2).total,
    commas: Math.min(3, text.match(/,/g)?.length ?? 0),
  };
}

function buildCandidates(f: Features, paper: string): Candidate[] {
  const raw: Array<Pick<Candidate, "text" | "sentence" | "partial" | "short">> = [];
  const { sentences } = f;
  sentences.forEach((sentence, i) => {
    if (sentence.words >= MIN_EVIDENCE_WORDS && sentence.words <= MAX_EVIDENCE_WORDS) {
      raw.push({ text: sentence.text, sentence, partial: false, short: false });
    } else if (sentence.words > MAX_EVIDENCE_WORDS) {
      for (const text of clauseWindows(sentence)) raw.push({ text, sentence, partial: true, short: false });
    } else {
      const next = sentences[i + 1];
      if (next && next.paragraph === sentence.paragraph) {
        const joined = `${sentence.text} ${next.text}`;
        if (countWords(joined) <= MAX_EVIDENCE_WORDS && paper.includes(joined)) {
          raw.push({ text: joined, sentence, partial: false, short: countWords(joined) < MIN_EVIDENCE_WORDS });
          return;
        }
      }
      raw.push({ text: sentence.text, sentence, partial: false, short: true });
    }
  });
  // Quotes must be verbatim and never grader-directed. The full
  // findEvidenceSpan check runs on the chosen quote in pickEvidence.
  return raw
    .filter(
      (c) => cleanEvidence(c.text).length >= MIN_EVIDENCE_CHARS && paper.includes(c.text) && !isGraderDirected(c.text)
    )
    .map((c) => describeCandidate(c.text, c.sentence, c.partial, c.short));
}

function candidateScore(
  dimension: Dimension,
  candidate: Candidate,
  band: Band,
  criterionStems: Set<string>,
  topicStems: Set<string>
): number {
  const { sentence } = candidate;
  let score = overlapRatio(criterionStems, candidate.stems) * 3;

  switch (dimension) {
    case "thesis":
      if (sentence.paragraph === 0) score += 3;
      if (sentence.paragraph === 0 && sentence.isLast) score += 1.5;
      score += candidate.claims * 2 + overlapRatio(topicStems, candidate.stems) * 2;
      break;
    case "evidence":
      score += candidate.evidenceMarkers * 2 + candidate.numbers * 1.5 + (candidate.hasQuotation ? 2 : 0);
      break;
    case "organization":
      if (sentence.startsWithTransition) score += 3;
      if (candidate.hasConclusionMarker) score += 2.5;
      if (sentence.paragraph > 0 && sentence.index === 0) score += 1;
      break;
    case "mechanics":
      // Weaker writing: show a sentence with a slip. Stronger: a well-built one.
      if (band === "strong") score += !sentence.hasError && sentence.words >= 12 && sentence.words <= 25 ? 2 : 0;
      else score += sentence.hasError ? 4 : 0;
      score += candidate.commas * 0.4;
      break;
    case "analysis":
      score += candidate.reasoning * 2.5;
      break;
    case "counterargument":
      score += candidate.counter * 3;
      break;
    case "general":
      score += overlapRatio(topicStems, candidate.stems) * 3 + Math.min(1, candidate.reasoning);
      break;
  }
  if (candidate.partial) score -= 0.5;
  if (candidate.short) score -= 6;
  return score;
}

/** The best-matching verifiable quote for a criterion, or "" if the paper has none. */
function pickEvidence(
  paper: string,
  dimension: Dimension,
  candidates: Candidate[],
  band: Band,
  criterionStems: Set<string>,
  topicStems: Set<string>,
  used: Set<string>
): string {
  const ranked = candidates
    .map((candidate, position) => {
      let score = candidateScore(dimension, candidate, band, criterionStems, topicStems);
      // Prefer a different quote for each criterion when there is a choice.
      if (used.has(candidate.text)) score -= 5;
      return { candidate, position, score };
    })
    .sort((a, b) => b.score - a.score || a.position - b.position);
  for (const { candidate } of ranked) {
    if (findEvidenceSpan(paper, candidate.text) === null) continue;
    used.add(candidate.text);
    return candidate.text;
  }
  return "";
}

// --- Grader ------------------------------------------------------------------

function confidenceFor(f: Features, fractions: number[], injectionFound: boolean): Confidence {
  if (f.wordCount < 80) return "low";
  if (f.topicStems.size > 0 && f.topicOverlap < 0.05 && f.wordCount < 200) return "low";
  const avg = fractions.length ? fractions.reduce((a, b) => a + b, 0) / fractions.length : 0;
  const clearCut = avg >= 0.78 || avg <= 0.38;
  if (clearCut && f.wordCount >= 150 && !injectionFound) return "high";
  return "medium";
}

function overallCommentFor(
  f: Features,
  criteria: RubricCriterionInput[],
  fractions: number[],
  injectionFound: boolean
): string {
  if (f.wordCount === 0) return "This paper has no text to grade.";
  const avg = fractions.length ? fractions.reduce((a, b) => a + b, 0) / fractions.length : 0;
  const opener =
    avg >= 0.8 ? "A strong paper" : avg >= 0.6 ? "A solid paper" : avg >= 0.4 ? "A developing paper" : "An early draft";
  let comment: string;
  if (criteria.length === 0) {
    comment = `${opener} of ${pluralize(f.wordCount, "word")}.`;
  } else if (criteria.length === 1) {
    comment = `${opener} of ${pluralize(f.wordCount, "word")}, judged against "${criteria[0].title}".`;
  } else {
    let best = 0;
    let worst = 0;
    fractions.forEach((value, i) => {
      if (value > fractions[best]) best = i;
      if (value < fractions[worst]) worst = i;
    });
    comment =
      best === worst || fractions[best] - fractions[worst] < 0.05
        ? `${opener} of ${pluralize(f.wordCount, "word")}, fairly even across the rubric.`
        : `${opener} of ${pluralize(f.wordCount, "word")}: it is strongest on "${criteria[best].title}" and has the most room to grow on "${criteria[worst].title}".`;
  }
  if (injectionFound) comment += " It includes text addressed to the grader, which was ignored for scoring.";
  return comment;
}

/** Grade a paper with the demo heuristics. Same input, same output. */
export function gradeWithDemoHeuristics(input: GradingInput): RawGradingResult {
  const f = analyze(input);
  const injectionFound = detectPromptInjection(input.paper).found;
  const candidates = buildCandidates(f, input.paper);
  const usedEvidence = new Set<string>();
  const usedVariants = new Map<string, number>();
  const fractions: number[] = [];

  const results: RawCriterionResult[] = input.criteria.map((criterion) => {
    const dimension = classifyCriterion(criterion);
    const criterionStems = contentStems(`${criterion.title} ${criterion.description}`, RUBRIC_FILLER);
    const keywordOverlap = criterionStems.size ? overlapRatio(criterionStems, f.stems) : 0.4;
    const fraction = scoreFraction(dimension, f, keywordOverlap);
    fractions.push(fraction);
    // The wording describes what the paper does on this dimension; when length
    // is what pulls the score down, the note below says so.
    const band = bandFor(f.wordCount === 0 ? 0 : dimensionScore(dimension, f));

    const variants = TEMPLATES[dimension][band];
    const variantKey = `${dimension}:${band}`;
    const offset = usedVariants.get(variantKey) ?? 0;
    usedVariants.set(variantKey, offset + 1);
    let justification =
      f.wordCount === 0
        ? "The paper has no text to evaluate for this criterion."
        : variants[(hash(`${criterion.id}|${criterion.title}`) + offset) % variants.length](f, criterion);
    if (f.wordCount > 0 && f.lengthFactor < 0.7) {
      justification += ` At ${pluralize(f.wordCount, "word")}, the paper is well under the expected length of about ${f.targetWords} words.`;
    }

    return {
      criterionId: criterion.id,
      score: toHalfPoints(fraction, criterion.maxPoints),
      justification,
      evidence: pickEvidence(input.paper, dimension, candidates, band, criterionStems, f.topicStems, usedEvidence),
    };
  });

  return {
    criteria: results,
    confidence: confidenceFor(f, fractions, injectionFound),
    overallComment: overallCommentFor(f, input.criteria, fractions, injectionFound),
  };
}

export class DemoGrader implements Grader {
  readonly kind = "demo" as const;
  readonly model = null;

  async grade(input: GradingInput): Promise<RawGradingResult> {
    return gradeWithDemoHeuristics(input);
  }
}
