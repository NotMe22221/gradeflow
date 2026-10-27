// The deterministic demo grader, used when no ANTHROPIC_API_KEY is set. Pure:
// no randomness, no clock, no I/O, so the same paper and rubric always get the
// same suggestion. It is labelled "Demo grader" everywhere in the UI.
//
// Scores come from surface features of the text (length against the expected
// length, paragraphing, sentence variety, transitions, evidence markers,
// numbers, quotations, hedging, keyword overlap with each criterion, and
// mechanical slips), plus lab-report features (hypothesis wording, procedure
// detail, measurements with units, sources of error). The wording of each
// justification follows the score it explains. Recognized grader-directed
// sentences ("ignore the rubric...") are removed before any feature is
// computed and are never quoted as evidence; detection is a heuristic (see
// injection.ts), and the teacher's approval is the real safeguard.

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
import { classifyCriterion, type Dimension } from "@/lib/grading/dimensions";
import { hasSourceQuotation, quoteRelevance } from "@/lib/grading/relevance";
import { contentStems, RUBRIC_FILLER, tokenize } from "@/lib/grading/words";

export { classifyCriterion } from "@/lib/grading/dimensions";

type Band = "strong" | "mid" | "weak";

const DEFAULT_TARGET_WORDS = 350;
const MIN_EVIDENCE_WORDS = 8;
const MAX_EVIDENCE_WORDS = 30;

// --- Vocabulary --------------------------------------------------------------

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
// Hedges in the opening weaken a stated position ("kind of a good idea but
// also maybe not").
const HEDGE_MARKERS = [
  "maybe",
  "kind of",
  "sort of",
  "it depends",
  "not sure",
  "i guess",
  "but also",
  "probably",
  "i dont know",
  "i don't know",
  "i don’t know",
];
const CONCLUSION_MARKERS = ["in conclusion", "to conclude", "overall", "ultimately", "in summary", "to sum up", "in the end", "all in all", "in short"];
const MISSPELLINGS = new Set(
  (
    "teh recieve alot definately seperate untill wich becuase thier occured arguement goverment enviroment " +
    "beleive tommorow truely wierd noone dont doesnt didnt isnt cant wouldnt couldnt shouldnt im thru alright"
  ).split(" ")
);

// Lab reports.
const HYPOTHESIS_LABEL = /^(?:(?:research\s+)?question\s+and\s+)?hypothes[ie]s\b\s*:?/;
const IF_THEN = /\bif\b[^.!?]*\bthen\b/;
const PREDICTION = /\b(?:predict(?:s|ed|ion)?|hypothesi[sz]e[sd]?)\b|\b(?:i|we)\s+(?:think|expect|predict)\b[^.!?]*\b(?:will|would|should)\b/;
const HYPOTHESIS_VERDICT =
  /\b(?:support|supports|supported|confirm|confirms|confirmed|contradict|contradicts|contradicted|refute|refutes|refuted)\b[^.!?]{0,40}\bhypothes[ie]s\b|\bhypothes[ie]s\s+(?:was|is)\s+(?:[a-z]+\s+)?(?:right|wrong|correct|incorrect|supported|confirmed|true|false)\b/;
const DIRECTION =
  /\b(?:increase[sd]?|decrease[sd]?|rises?|falls?|drops?|grows?|higher|lower|faster|slower|more|less|fewer|greater|bigger|larger|smaller|longer|shorter|warmer|colder|cooler|hotter|dirtier|cleaner|worse|better)\b/;
const HYPOTHESIS_REASON = /\b(?:because|since|due to|as a result|caus(?:e|es|ed|ing)|so that|which means|leads? to)\b/;
const REPEATED_TRIALS = /\b(?:trials?|repeated|repetitions?|averaged|average of|three times|twice)\b/;
const MEASUREMENT_WITH_UNIT =
  /\b\d+(?:[.,]\d+)?\s?(?:°\s?[cf]|mm|cm|km|m|ml|mg\/l|l|kg|mg|g|seconds?|secs?|s|minutes?|mins?|hours?|hrs?|ntu|ppm|degrees?|percent|%)(?![a-z])/g;
const PROCEDURE_VERBS = [
  "measured",
  "recorded",
  "timed",
  "tested",
  "sampled",
  "filled",
  "rinsed",
  "calibrated",
  "mixed",
  "added",
  "poured",
  "placed",
  "repeated",
  "averaged",
  "weighed",
  "heated",
  "cooled",
  "stretched",
  "collected",
  "counted",
  "swirled",
  "stirred",
  "labeled",
  "labelled",
  "attached",
  "released",
  "waited",
  "used",
  "put",
];
const EQUIPMENT = [
  "stopwatch",
  "timer",
  "thermometer",
  "ruler",
  "meter stick",
  "measuring tape",
  "tape measure",
  "scale",
  "balance",
  "beaker",
  "beakers",
  "flask",
  "flasks",
  "graduated cylinder",
  "bottle",
  "bottles",
  "kit",
  "kits",
  "probe",
  "sensor",
  "pen",
  "tube",
  "tubes",
  "pipette",
  "balloon",
  "balloons",
  "hot plate",
  "dropper",
  "syringe",
  "titration",
];
const ERROR_MARKERS = [
  "source of error",
  "sources of error",
  "error",
  "errors",
  "limitation",
  "limitations",
  "uncertain",
  "uncertainty",
  "reaction time",
  "not precise",
  "imprecise",
  "inaccurate",
  "not accurate",
  "only one",
  "only once",
  "ran out of time",
  "not constant",
  "leaked",
  "rushing",
];
const IMPROVEMENT_MARKERS = [
  "next time",
  "in the future",
  "to improve",
  "improvement",
  "we could use",
  "we should",
  "could have",
  "would have",
  "should have",
  "more trials",
  "more time",
];

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

function joinList(parts: string[], conjunction: "and" | "or" = "and"): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} ${conjunction} ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, ${conjunction} ${parts[parts.length - 1]}`;
}

function on(flag: boolean): number {
  return flag ? 1 : 0;
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

type LabFeatures = {
  /** A hypothesis or prediction is stated (a "Hypothesis:" section, an if-then, "I predict"). */
  hypothesisStated: boolean;
  hypothesisIfThen: boolean;
  /** The prediction names a direction of change ("will increase", "dirtier"). */
  hypothesisDirection: boolean;
  /** The prediction comes with a reason ("because...", or an explaining sentence in its section). */
  hypothesisReason: boolean;
  /** A question near the start ("Does water quality...?"). */
  questionPosed: boolean;
  /** How many of independent / dependent / controlled variables are named. */
  variablesNamed: number;
  procedureSteps: number;
  equipment: number;
  measurementsWithUnits: number;
  repeatedTrials: boolean;
  /** Lines with three or more numbers: table rows or lists of readings. */
  dataRows: number;
  /** Sentences that name a source of error or a limitation. */
  errorSources: number;
  improvement: boolean;
  /** States whether the data support the hypothesis. */
  hypothesisVerdict: boolean;
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
  hedgesIntro: number;
  hedgesUsed: string[];
  hasConclusionMarker: boolean;
  introConclusionEcho: number;
  topicOverlap: number;
  topicStems: Set<string>;
  issues: MechanicsIssues;
  errorCount: number;
  stems: Set<string>;
  lab: LabFeatures;
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

/**
 * The prediction a sentence states, without its "Hypothesis:" label, or null
 * for a bare label, a question, or a verdict ("the data support my
 * hypothesis").
 */
function hypothesisBody(lower: string): string | null {
  if (HYPOTHESIS_VERDICT.test(lower)) return null;
  const body = lower.replace(HYPOTHESIS_LABEL, "").trim();
  return body && !body.endsWith("?") ? body : null;
}

/** True when a sentence states a prediction: a labelled hypothesis, an if-then, or "I predict". */
function statesHypothesis(lower: string): boolean {
  const body = hypothesisBody(lower);
  return body !== null && (HYPOTHESIS_LABEL.test(lower) || IF_THEN.test(body) || PREDICTION.test(body));
}

function analyzeLab(sentences: Sentence[], clean: string, lowerAll: string): LabFeatures {
  // A paragraph that opens with a "Hypothesis" label is the hypothesis
  // section: every statement in it counts, not only the first.
  const labelled = new Set(
    sentences.filter((s) => s.index === 0 && HYPOTHESIS_LABEL.test(s.lower)).map((s) => s.paragraph)
  );
  const statements = sentences.filter(
    (s) => statesHypothesis(s.lower) || (labelled.has(s.paragraph) && hypothesisBody(s.lower) !== null)
  );
  const explainedInSection = [...labelled].some(
    (paragraph) => statements.filter((s) => s.paragraph === paragraph).length >= 2
  );

  const variablesNamed = [
    /\bindependent\s+variables?\b/,
    /\bdependent\s+variables?\b/,
    /\b(?:controlled|control|constant)\s+variables?\b|\bconstants\b/,
  ].filter((pattern) => pattern.test(lowerAll)).length;

  const dataRows = clean.split("\n").filter((line) => (line.match(/\d+(?:[.,]\d+)?/g)?.length ?? 0) >= 3).length;

  // "One source of error is... Another is..." names two, though only the
  // first sentence says "error".
  let errorSources = 0;
  let previousNamedError = false;
  for (const sentence of sentences) {
    const named: boolean =
      countPhrases(sentence.lower, ERROR_MARKERS, 1).total > 0 ||
      (previousNamedError && /^(?:another|a second|a third|second|third|also)\b/.test(sentence.lower));
    if (named) errorSources++;
    previousNamedError = named;
  }

  return {
    hypothesisStated: statements.length > 0,
    hypothesisIfThen: statements.some((s) => IF_THEN.test(s.lower)),
    hypothesisDirection: statements.some((s) => DIRECTION.test(s.lower)),
    hypothesisReason: explainedInSection || statements.some((s) => HYPOTHESIS_REASON.test(s.lower)),
    questionPosed: sentences.some((s) => s.paragraph <= 1 && s.text.trim().endsWith("?")),
    variablesNamed,
    procedureSteps: countPhrases(lowerAll, PROCEDURE_VERBS, 2).total,
    equipment: countPhrases(lowerAll, EQUIPMENT, 2).total,
    measurementsWithUnits: Math.min(12, lowerAll.match(MEASUREMENT_WITH_UNIT)?.length ?? 0),
    repeatedTrials: REPEATED_TRIALS.test(lowerAll),
    dataRows,
    errorSources,
    improvement: countPhrases(lowerAll, IMPROVEMENT_MARKERS, 1).total > 0,
    hypothesisVerdict: HYPOTHESIS_VERDICT.test(lowerAll),
  };
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
  const hedges = countPhrases(introLower, HEDGE_MARKERS, 2);
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
    hedgesIntro: hedges.total,
    hedgesUsed: hedges.used,
    hasConclusionMarker,
    introConclusionEcho,
    topicOverlap,
    topicStems,
    issues,
    errorCount,
    stems,
    lab: analyzeLab(sentences, clean, lowerAll),
  };
}

// --- Scoring -----------------------------------------------------------------

function dimensionScore(dimension: Dimension, f: Features): number {
  // Floor the denominator so a single figure in a tiny paper is not "dense" evidence.
  const per100 = Math.max(2, f.wordCount / 100);
  switch (dimension) {
    case "thesis": {
      // Hedging in the opening ("maybe", "it depends") undercuts the claim.
      const claim = saturate(f.claimMarkersIntro, 1.2) * (1 - clamp01(f.hedgesIntro / 2));
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
    case "hypothesis": {
      const { lab } = f;
      // A question or named variables frame the prediction; rubrics ask for one or the other.
      const framing = Math.max(on(lab.questionPosed), saturate(lab.variablesNamed, 1.2));
      if (!lab.hypothesisStated) return clamp01(0.1 + 0.15 * framing);
      return clamp01(
        0.4 +
          0.15 * on(lab.hypothesisIfThen) +
          0.15 * on(lab.hypothesisDirection) +
          0.15 * on(lab.hypothesisReason) +
          0.15 * framing
      );
    }
    case "method": {
      const { lab } = f;
      return clamp01(
        0.15 +
          0.3 * saturate(lab.procedureSteps, 3) +
          0.2 * saturate(lab.equipment, 2) +
          0.2 * saturate(lab.measurementsWithUnits, 3) +
          0.15 * on(lab.repeatedTrials)
      );
    }
    case "results": {
      const { lab } = f;
      return clamp01(
        0.2 +
          0.4 * saturate(lab.measurementsWithUnits, 3) +
          0.25 * saturate(f.numbers / per100, 1.5) +
          0.15 * saturate(lab.dataRows, 1.5)
      );
    }
    case "limitations": {
      const { lab } = f;
      return clamp01(
        0.1 + 0.5 * clamp01(lab.errorSources / 2) + 0.15 * on(lab.improvement) + 0.25 * on(lab.hypothesisVerdict)
      );
    }
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

const BAND_ORDER: Band[] = ["weak", "mid", "strong"];

/**
 * Which wording a criterion gets. It follows the score actually suggested, so
 * a 3 out of 5 never reads as strong. The one exception: when the paper is
 * short and length alone pulls a score into the weak band although its
 * features are better, the wording is the middle band and the length note
 * explains the rest, so a short paper with a clear claim is not told it has
 * none.
 */
function wordingBand(score: number, maxPoints: number, featureScore: number, shortPaper: boolean): Band {
  const scoreRank = BAND_ORDER.indexOf(bandFor(maxPoints > 0 ? score / maxPoints : 0));
  if (!shortPaper) return BAND_ORDER[scoreRank];
  const featureRank = BAND_ORDER.indexOf(bandFor(featureScore));
  return BAND_ORDER[Math.max(scoreRank, Math.min(featureRank, BAND_ORDER.indexOf("mid")))];
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

/** What a lab-report section includes and what it still lacks, in rubric order. */
type Parts = { has: string[]; missing: string[] };

function partsOf(items: Array<[present: boolean, has: string, missing: string]>): Parts {
  return {
    has: items.filter(([present]) => present).map(([, has]) => has),
    missing: items.filter(([present]) => !present).map(([, , missing]) => missing),
  };
}

function criterionAsks(criterion: RubricCriterionInput, pattern: RegExp): boolean {
  return pattern.test(`${criterion.title} ${criterion.description}`.toLowerCase());
}

function hypothesisParts(f: Features, criterion: RubricCriterionInput): Parts {
  const { lab } = f;
  const items: Array<[boolean, string, string]> = [
    [lab.hypothesisIfThen, "an if-then prediction", "an if-then structure"],
    [lab.hypothesisDirection, "a predicted direction of change", "a specific direction of change"],
    [lab.hypothesisReason, "a reason for the prediction", "a scientific reason"],
  ];
  if (criterionAsks(criterion, /question/)) items.push([lab.questionPosed, "a focused question", "a focused question"]);
  if (criterionAsks(criterion, /variable/)) {
    items.push([lab.variablesNamed >= 2, "named variables", "named independent and dependent variables"]);
  }
  return partsOf(items);
}

function methodParts(f: Features): Parts {
  const { lab } = f;
  return partsOf([
    [lab.procedureSteps >= 3, "step-by-step actions", "the steps in order"],
    [lab.equipment >= 1, "the equipment used", "the equipment used"],
    [lab.measurementsWithUnits >= 2, "measured amounts with units", "amounts and measurements with units"],
    [lab.repeatedTrials, "repeated trials", "repeated trials"],
  ]);
}

function limitationParts(f: Features, criterion: RubricCriterionInput): Parts {
  const { lab } = f;
  const items: Array<[boolean, string, string]> = [
    lab.errorSources >= 2
      ? [true, "two or more sources of error", ""]
      : lab.errorSources === 1
        ? [false, "", "a second source of error"]
        : [false, "", "specific sources of error"],
  ];
  if (criterionAsks(criterion, /improv|future|next time|suggest/)) {
    items.push([lab.improvement, "a concrete improvement", "a concrete improvement"]);
  }
  if (criterionAsks(criterion, /hypothes|support|conclu/)) {
    items.push([lab.hypothesisVerdict, "whether the data support the hypothesis", "whether the data support the hypothesis"]);
  }
  const parts = partsOf(items);
  if (lab.errorSources === 1) parts.has.unshift("one source of error");
  return parts;
}

/** " It could still add X." when a strong section still lacks something. */
function stillMissing(parts: Parts, verb = "add"): string {
  return parts.missing.length ? ` It could still ${verb} ${parts.missing[0]}.` : "";
}

const TEMPLATES: Record<Dimension, Record<Band, Template[]>> = {
  thesis: {
    strong: [
      () => "The introduction takes a clear, arguable position, and the conclusion returns to it, so the paper stays focused on the prompt.",
      () => "A specific claim appears in the opening paragraph, and the body paragraphs keep building on it rather than drifting.",
    ],
    mid: [
      (f) =>
        f.hedgesIntro
          ? `The paper leans toward a position but hedges it (${quoteList(f.hedgesUsed)}), so the claim never becomes firm.`
          : "The paper signals a position early, but the claim is broad and the conclusion only partly returns to it.",
      (f) =>
        f.hedgesIntro
          ? `A main idea is present, but hedges such as ${quoteList(f.hedgesUsed)} keep it from becoming an arguable claim.`
          : "A main idea is present, though it is stated loosely and could say more precisely what the paper sets out to prove.",
    ],
    weak: [
      (f) =>
        f.hedgesIntro
          ? `The opening hedges (${quoteList(f.hedgesUsed)}) instead of committing to a position, so it is hard to tell what the paper argues.`
          : "The paper never states a clear, arguable position, so it is hard to tell what it sets out to prove.",
      (f) =>
        f.hedgesIntro
          ? `The paper never commits to one side; hedges like ${quoteList(f.hedgesUsed)} leave the main claim unclear.`
          : "The main claim is missing or only implied; the opening reads as background rather than an argument.",
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
      (f) =>
        f.paragraphCount >= 3 && f.hasConclusionMarker
          ? "The paragraphs are there, but ideas jump between them with few links, so the reader has to work out how they connect."
          : "There is no clear introduction, body, and conclusion, so the reader has to work out how the ideas connect.",
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
      (f) =>
        f.counterMarkers
          ? `Mentions another view (${quoteList(f.counterUsed, 1)}) only in passing and does not respond to it.`
          : "Does not address counterarguments or alternative viewpoints.",
      (f) =>
        f.counterMarkers
          ? "Nods to the other side, but never explains why the paper's position still holds."
          : "The paper presents only one side and never engages with how someone might disagree.",
    ],
  },
  hypothesis: {
    strong: [
      (f, c) => {
        const parts = hypothesisParts(f, c);
        return parts.has.length
          ? `States a clear, testable hypothesis with ${joinList(parts.has.slice(0, 3))}.${stillMissing(parts)}`
          : "States a clear, testable hypothesis.";
      },
      (f, c) => {
        const parts = hypothesisParts(f, c);
        return parts.has.length
          ? `The prediction is specific and testable: it includes ${joinList(parts.has.slice(0, 3))}.${stillMissing(parts)}`
          : "The prediction is specific and testable.";
      },
    ],
    mid: [
      (f, c) => {
        const { missing } = hypothesisParts(f, c);
        return missing.length
          ? `A hypothesis is stated, but it lacks ${joinList(missing.slice(0, 2))}.`
          : "A hypothesis is stated, though it could say more precisely what will change and why.";
      },
      (f, c) => {
        const { missing } = hypothesisParts(f, c);
        return missing.length
          ? `The prediction is testable in principle, but without ${joinList(missing.slice(0, 2), "or")} it stays general.`
          : "The prediction is testable in principle, though it could say more precisely what will change and why.";
      },
    ],
    weak: [
      (f, c) => {
        if (!f.lab.hypothesisStated) return "The report does not state a clear, testable hypothesis or prediction.";
        const { missing } = hypothesisParts(f, c);
        return missing.length
          ? `The hypothesis is too vague to test well: it lacks ${joinList(missing.slice(0, 3))}.`
          : "The hypothesis is brief and needs more detail to be testable.";
      },
      (f, c) => {
        if (!f.lab.hypothesisStated) return "No testable prediction is given, so it is unclear what the experiment sets out to show.";
        const { missing } = hypothesisParts(f, c);
        return missing.length
          ? `A prediction appears, but without ${joinList(missing.slice(0, 2), "or")} it is hard to test.`
          : "A prediction appears, but it is too brief to test well.";
      },
    ],
  },
  method: {
    strong: [
      (f) => {
        const parts = methodParts(f);
        return parts.has.length
          ? `Describes the procedure clearly enough to repeat, including ${joinList(parts.has)}.${stillMissing(parts)}`
          : "Describes the procedure clearly enough to repeat.";
      },
      (f) => {
        const parts = methodParts(f);
        return parts.has.length
          ? `Another group could follow this method: it gives ${joinList(parts.has)}.${stillMissing(parts)}`
          : "Another group could follow this method.";
      },
    ],
    mid: [
      (f) => {
        const { missing } = methodParts(f);
        return missing.length
          ? `Outlines the procedure, but leaves out ${joinList(missing.slice(0, 2))}, so another group would have to guess at some steps.`
          : "Outlines the procedure, though some steps are too brief for another group to repeat exactly.";
      },
      (f) => {
        const { has, missing } = methodParts(f);
        return missing.length
          ? `The method gives ${has.length ? joinList(has) : "a general outline"}, but without ${joinList(missing.slice(0, 2), "or")} it would be hard to repeat exactly.`
          : "Outlines the procedure, though some steps are too brief for another group to repeat exactly.";
      },
    ],
    weak: [
      (f) => {
        const { missing } = methodParts(f);
        return missing.length
          ? `The method is too vague to repeat: it leaves out ${joinList(missing.slice(0, 3))}.`
          : "The method is too brief for another group to repeat.";
      },
      (f) => {
        const { missing } = methodParts(f);
        return missing.length
          ? `Only a general outline of what was done is given; it does not include ${joinList(missing.slice(0, 2), "or")}.`
          : "Only a general outline of what was done is given, which is not enough for another group to repeat it.";
      },
    ],
  },
  results: {
    strong: [
      (f) =>
        f.lab.measurementsWithUnits
          ? `Reports specific results, including ${pluralize(f.lab.measurementsWithUnits, "measurement")} with units${f.lab.dataRows >= 2 ? " laid out in a table or list" : ""}, so the numbers are easy to check.`
          : `Reports specific values for each condition${f.lab.dataRows >= 2 ? " in a table or list" : ""}, though units would make them easier to check.`,
      (f) =>
        f.lab.measurementsWithUnits
          ? `Results are reported precisely, with units on ${pluralize(f.lab.measurementsWithUnits, "measurement")}, and the key numbers are easy to find.`
          : `Reports specific values for each condition${f.lab.dataRows >= 2 ? " in a table or list" : ""}, though units would make them easier to check.`,
    ],
    mid: [
      (f) =>
        !f.numbers
          ? "Describes the results mostly in words, with few specific measurements."
          : !f.lab.measurementsWithUnits
            ? `Reports ${pluralize(f.numbers, "value")}, but none of them include units, so the reader cannot tell exactly what was measured.`
            : `Reports some measurements (${pluralize(f.lab.measurementsWithUnits, "value")} with units), but the results are thin in places or not clearly organized.`,
      (f) =>
        !f.numbers
          ? "Describes the results mostly in words, with few specific measurements."
          : !f.lab.measurementsWithUnits
            ? "The numbers are there, but without units or labels they are hard to interpret."
            : `Includes ${pluralize(f.lab.measurementsWithUnits, "measurement")} with units, though some results are missing or not tied to a specific condition.`,
    ],
    weak: [
      (f) =>
        f.numbers
          ? `Gives ${pluralize(f.numbers, "number")}${f.lab.measurementsWithUnits ? "" : " with no units"}, but the results need a specific, labelled measurement for each condition.`
          : "The results describe what happened in general terms, without specific measurements.",
      (f) =>
        f.numbers
          ? `The results are incomplete: ${f.lab.measurementsWithUnits ? "several conditions have no clear measurement" : "the numbers have no units"}, so they are hard to check.`
          : "No specific measurements are reported, so the results cannot be checked.",
    ],
  },
  limitations: {
    strong: [
      (f, c) => {
        const parts = limitationParts(f, c);
        return parts.has.length
          ? `Addresses ${joinList(parts.has)}.${stillMissing(parts)}`
          : "Discusses the limits of the experiment in specific terms.";
      },
      (f, c) => {
        const parts = limitationParts(f, c);
        return parts.has.length
          ? `The wrap-up is thorough: it covers ${joinList(parts.has)}.${stillMissing(parts)}`
          : "Discusses the limits of the experiment in specific terms.";
      },
    ],
    mid: [
      (f, c) => {
        const { has, missing } = limitationParts(f, c);
        if (!missing.length) return `Addresses ${joinList(has)}, though each point is covered only briefly.`;
        return `Addresses ${has.length ? joinList(has) : "the results only briefly"}, but leaves out ${joinList(missing.slice(0, 2))}.`;
      },
      (f, c) => {
        const { has, missing } = limitationParts(f, c);
        if (!missing.length) return `Addresses ${joinList(has)}, though each point is covered only briefly.`;
        return `${has.length ? `Covers ${joinList(has)}; adding` : "Adding"} ${joinList(missing.slice(0, 2))} would complete it.`;
      },
    ],
    weak: [
      (f, c) => {
        const { has, missing } = limitationParts(f, c);
        if (!f.lab.errorSources) {
          return `Does not name specific sources of error${criterionAsks(c, /improv|future|next time|suggest/) ? " or ways to improve the experiment" : ""}.`;
        }
        return missing.length
          ? `Mentions ${joinList(has)} only briefly and leaves out ${joinList(missing.slice(0, 2))}.`
          : "Mentions sources of error only briefly, without explaining how they affected the results.";
      },
      (f, c) => {
        const { has, missing } = limitationParts(f, c);
        if (!missing.length) return "Mentions sources of error only briefly, without explaining how they affected the results.";
        return `Needs ${joinList(missing.slice(0, 3))}${has.length ? `; for now it offers only ${joinList(has)}` : ""}.`;
      },
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
  // Lab-report cues.
  hypothesis: boolean;
  question: boolean;
  verdict: boolean;
  procedure: number;
  equipment: number;
  measurements: number;
  trials: boolean;
  errors: number;
  improvement: number;
};

const CLAUSE_BREAK = /[,;:](?=\s)|\s[—–-]\s/g;

/**
 * Clause windows of a long sentence that fit the 8-30 word quote limit. A
 * sentence with no such clause gives none: a quote never stops mid-clause.
 */
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
    hasQuotation: hasSourceQuotation(text),
    hasConclusionMarker: CONCLUSION_MARKERS.some((marker) => countPhrase(lower, marker) > 0),
    reasoning: countPhrases(lower, REASONING_MARKERS, 2).total,
    counter: countPhrases(lower, COUNTER_MARKERS, 2).total,
    commas: Math.min(3, text.match(/,/g)?.length ?? 0),
    hypothesis: statesHypothesis(lower),
    question: text.trim().endsWith("?"),
    verdict: HYPOTHESIS_VERDICT.test(lower),
    procedure: countPhrases(lower, PROCEDURE_VERBS, 1).total,
    equipment: countPhrases(lower, EQUIPMENT, 1).total,
    measurements: lower.match(MEASUREMENT_WITH_UNIT)?.length ?? 0,
    trials: REPEATED_TRIALS.test(lower),
    errors: countPhrases(lower, ERROR_MARKERS, 1).total,
    improvement: countPhrases(lower, IMPROVEMENT_MARKERS, 1).total,
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
    case "hypothesis":
      if (candidate.hypothesis) score += 4;
      if (candidate.question) score += 1.5;
      if (sentence.paragraph === 0) score += 1;
      // "The data support my hypothesis" is a conclusion, not the hypothesis.
      if (candidate.verdict) score -= 3;
      break;
    case "method":
      // Show what was done: a sentence with no procedure verb is a result or a claim.
      score +=
        1.5 * Math.min(3, candidate.procedure) +
        Math.min(2, candidate.equipment) +
        0.5 * Math.min(2, candidate.measurements) +
        (candidate.trials ? 1.5 : 0);
      if (candidate.procedure === 0) score -= 2;
      break;
    case "results":
      score += 1.5 * Math.min(4, candidate.measurements) + 0.5 * Math.min(4, candidate.numbers);
      break;
    case "limitations":
      score += 3 * Math.min(2, candidate.errors) + 2 * Math.min(1, candidate.improvement) + (candidate.verdict ? 1.5 : 0);
      break;
    case "general":
      score += overlapRatio(topicStems, candidate.stems) * 3 + Math.min(1, candidate.reasoning);
      break;
  }
  if (candidate.partial) score -= 0.5;
  if (candidate.short) score -= 6;
  return score;
}

/**
 * The best-matching verifiable quote for a criterion, or "" when no sentence
 * passes the relevance check (relevance.ts): the review then says "No
 * supporting quote found" rather than citing something unrelated.
 */
function pickEvidence(
  input: GradingInput,
  criterion: RubricCriterionInput,
  dimension: Dimension,
  candidates: Candidate[],
  band: Band,
  criterionStems: Set<string>,
  topicStems: Set<string>,
  used: Set<string>
): string {
  const topic = `${input.assignmentTitle} ${input.instructions}`;
  const ranked = candidates
    .map((candidate, position) => {
      let score = candidateScore(dimension, candidate, band, criterionStems, topicStems);
      // Prefer a different quote for each criterion when there is a choice.
      if (used.has(candidate.text)) score -= 5;
      return { candidate, position, score };
    })
    .sort((a, b) => b.score - a.score || a.position - b.position);
  for (const { candidate } of ranked) {
    if (findEvidenceSpan(input.paper, candidate.text) === null) continue;
    if (!quoteRelevance(candidate.text, criterion, topic).relevant) continue;
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
  injectionFound: boolean,
  displayWords: number
): string {
  if (f.wordCount === 0) return "This paper has no text to grade.";
  const avg = fractions.length ? fractions.reduce((a, b) => a + b, 0) / fractions.length : 0;
  const opener =
    avg >= 0.8 ? "A strong paper" : avg >= 0.6 ? "A solid paper" : avg >= 0.4 ? "A developing paper" : "An early draft";
  let comment: string;
  if (criteria.length === 0) {
    comment = `${opener} of ${pluralize(displayWords, "word")}.`;
  } else if (criteria.length === 1) {
    comment = `${opener} of ${pluralize(displayWords, "word")}, judged against "${criteria[0].title}".`;
  } else {
    let best = 0;
    let worst = 0;
    fractions.forEach((value, i) => {
      if (value > fractions[best]) best = i;
      if (value < fractions[worst]) worst = i;
    });
    comment =
      best === worst || fractions[best] - fractions[worst] < 0.05
        ? `${opener} of ${pluralize(displayWords, "word")}, fairly even across the rubric.`
        : `${opener} of ${pluralize(displayWords, "word")}: it is strongest on "${criteria[best].title}" and has the most room to grow on "${criteria[worst].title}".`;
  }
  if (injectionFound) comment += " It includes text addressed to the grader, which was ignored for scoring.";
  return comment;
}

/** Grade a paper with the demo heuristics. Same input, same output. */
export function gradeWithDemoHeuristics(input: GradingInput): RawGradingResult {
  const f = analyze(input);
  const injectionFound = detectPromptInjection(input.paper).found;
  // Comments quote the full paper's length, matching the paper header and the
  // short-paper flag; scoring still uses f.wordCount from the stripped text.
  const displayWords = countWords(input.paper);
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
    const score = toHalfPoints(fraction, criterion.maxPoints);
    const shortPaper = f.wordCount > 0 && f.lengthFactor < 0.7;
    // The wording matches the suggested score; when length is what pulls the
    // score down, the note below says so.
    const band = wordingBand(score, criterion.maxPoints, f.wordCount === 0 ? 0 : dimensionScore(dimension, f), shortPaper);

    const variants = TEMPLATES[dimension][band];
    const variantKey = `${dimension}:${band}`;
    const offset = usedVariants.get(variantKey) ?? 0;
    usedVariants.set(variantKey, offset + 1);
    let justification =
      f.wordCount === 0
        ? "The paper has no text to evaluate for this criterion."
        : variants[(hash(`${criterion.id}|${criterion.title}`) + offset) % variants.length](f, criterion);
    if (shortPaper) {
      justification += ` At ${pluralize(displayWords, "word")}, the paper is well under the expected length of about ${f.targetWords} words.`;
    }

    return {
      criterionId: criterion.id,
      score,
      justification,
      evidence: pickEvidence(input, criterion, dimension, candidates, band, criterionStems, f.topicStems, usedEvidence),
    };
  });

  return {
    criteria: results,
    confidence: confidenceFor(f, fractions, injectionFound),
    overallComment: overallCommentFor(f, input.criteria, fractions, injectionFound, displayWords),
  };
}

export class DemoGrader implements Grader {
  readonly kind = "demo" as const;
  readonly model = null;

  async grade(input: GradingInput): Promise<RawGradingResult> {
    return gradeWithDemoHeuristics(input);
  }
}
