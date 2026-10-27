// Does a quote plausibly support the criterion it is cited for? A cheap,
// local check that makes no AI call. Pure: safe for client components, server
// code, and unit tests.
//
// A quote passes when it shares a content word with the criterion's title or
// description, or carries a cue of the kind of quality the criterion measures:
// - a transition for organization;
// - a figure, a source or a quotation for evidence;
// - "some people" or "although" for a counterargument;
// - "because" or "this shows" for analysis;
// - "if ... then" for a hypothesis.
// A criterion about grammar, style or conventions accepts any sentence, since
// every sentence shows them.
//
// A quote that fails stays in the review (it is in the paper) but is flagged
// to the teacher as a weak match. It is a heuristic: it can miss a subtle
// misfit and can flag a fine quote, so it only ever asks the teacher to look.

import { classifyCriterion, DIMENSION_PATTERNS, type Dimension } from "@/lib/grading/dimensions";
import type { RubricCriterionInput } from "@/lib/grading/types";
import { contentStems, RUBRIC_FILLER } from "@/lib/grading/words";

/**
 * A quotation from a source, not just a quoted title ("The Clockmaker's
 * Garden"). The closing mark may be missing: a stored quote that ends inside
 * a quotation has it trimmed (cleanEvidence).
 */
export function hasSourceQuotation(text: string): boolean {
  for (const match of text.matchAll(/["“]([^"“”]+)(?:["”]|$)/g)) {
    const words = match[1].trim().split(/\s+/).filter(Boolean);
    const titleCase = words.every((word) => word.length <= 3 || /^[^a-z]/.test(word));
    if (words.length >= 3 && !titleCase) return true;
  }
  return false;
}

type CuedDimension = Exclude<Dimension, "general" | "mechanics">;

// Matched against the lowercased quote.
const CUES: Record<CuedDimension, RegExp> = {
  thesis:
    /\b(?:should|must|ought to|needs? to|i (?:argue|believe|think|feel)|in my (?:opinion|view)|my position|(?:is|are|was|would be) (?:a|an|the)? ?(?:good|bad|better|best|great|important|key|wise|mistake)\b|because)\b/,
  evidence:
    /\d|\b(?:according to|for example|for instance|such as|survey|stud(?:y|ies)|research\w*|data|statistics?|percent|found that|reported|source|experts?|doctors?|scientists?|(?:author|story|text|article|poem|book|report|sheet|narrator) (?:says|said|states|writes|wrote|explains|describes|shows)|(?:writes|says|states) that)\b/,
  organization:
    /^\W*(?:first|second|third|next|then|finally|another|also|in addition|additionally|furthermore|moreover|however|on the other hand|in conclusion|to conclude|overall|ultimately|in summary|to sum up|in the end|at the (?:start|beginning|end)|later|meanwhile|as a result|therefore|thus|for example|for instance)\b|\b(?:in conclusion|to conclude|in summary|furthermore|moreover|in addition|on the other hand|as a result|first of all)\b/,
  analysis:
    /\b(?:because|this (?:shows|means|suggests|reveals|proves)|which (?:shows|means|suggests)|shows that|means that|suggests?|therefore|thus|as a result|so that|this is why|which is why|in other words|represents?|symboli[sz]es|symbol of|reveals?|demonstrates?|explains?|implies|leads? to|the reason)\b/,
  counterargument:
    /\b(?:some (?:people|may|might|argue|say|believe|think|critics|families|parents|students|teachers)|others? (?:may|might|argue|say|believe|think)|critics|opponents|skeptics|on the other hand|although|even though|though|however|admittedly|granted|it is true that|of course|while some|despite|concerns?|objections?|disagree)\b/,
  hypothesis:
    /\bif\b[^.!?]*\bthen\b|\b(?:predict\w*|hypothes\w*|expect\w*|will (?:increase|decrease|grow|rise|fall|produce|make|be))\b|\?/,
  method:
    /\b(?:we|i) (?:used|measured|added|put|filled|tested|rinsed|recorded|collected|placed|mixed|repeated|took|poured|timed|set up|weighed|counted|compared|labell?ed|heated|cooled|stirred|swirled|stretched)\b|\b(?:measur\w*|procedure|trials?|samples?|ml|thermometer|kits?|flasks?|beakers?|bottles?|ruler|scale|minutes|seconds|controlled?|variables?|steps?)\b/,
  results:
    /\d|\b(?:increased?|decreased?|rose|fell|higher|lower|average|results?|measured|showed|grew|dropped|changed)\b/,
  limitations:
    /\b(?:errors?|mistakes?|wrong|inaccura\w*|limitations?|uncertain\w*|improve\w*|next time|should have|could have|did not|didn['’]?t|only (?:once|one)|ran out of time|leak\w*|rush\w*|not (?:very )?(?:accurate|exact|precise)|might (?:of|have))\b/,
};

function hasCue(dimension: CuedDimension, quote: string): boolean {
  if (dimension === "evidence" && hasSourceQuotation(quote)) return true;
  return CUES[dimension].test(quote.toLowerCase());
}

/**
 * Every kind of quality a criterion names: its main one (classifyCriterion,
 * which reads the description only when the title names none) plus any other
 * its title names ("Evidence and reasoning", "Organization and style").
 * Descriptions mention other qualities in passing ("supports the position"),
 * so they add no more. `anySentence` when the criterion is about grammar,
 * style or conventions.
 */
export function criterionKinds(criterion: Pick<RubricCriterionInput, "title" | "description">): {
  kinds: Set<CuedDimension>;
  anySentence: boolean;
} {
  // "Counterargument" names a counterargument, not an argument (thesis).
  const title = criterion.title.toLowerCase().replace(/counter[\s-]?arguments?/g, "counterargument");
  const titleWithoutCounter = title.replace(/counterargument/g, " ");
  const main = classifyCriterion(criterion);
  const kinds = new Set<CuedDimension>();
  let anySentence = main === "mechanics";
  if (main !== "mechanics" && main !== "general") kinds.add(main);
  for (const [dimension, pattern] of DIMENSION_PATTERNS) {
    if (!pattern.test(dimension === "counterargument" ? title : titleWithoutCounter)) continue;
    if (dimension === "mechanics") anySentence = true;
    else kinds.add(dimension);
  }
  return { kinds, anySentence };
}

export type QuoteRelevance =
  | { relevant: true; basis: "any_sentence" | "shared_words" | "cue" | "unjudged" }
  | { relevant: false; basis: "none" };

/**
 * Whether `quote` plausibly supports `criterion` (see the file comment).
 * `topic` is the assignment's title and instructions: words from it don't
 * count as shared, since nearly every sentence of an on-topic paper uses them.
 */
export function quoteRelevance(
  quote: string,
  criterion: Pick<RubricCriterionInput, "title" | "description">,
  topic = ""
): QuoteRelevance {
  const { kinds, anySentence } = criterionKinds(criterion);
  if (anySentence) return { relevant: true, basis: "any_sentence" };

  const topicWords = contentStems(topic);
  const criterionWords = contentStems(`${criterion.title} ${criterion.description}`, RUBRIC_FILLER);
  for (const word of topicWords) criterionWords.delete(word);
  const quoteWords = contentStems(quote);
  for (const word of quoteWords) {
    if (criterionWords.has(word)) return { relevant: true, basis: "shared_words" };
  }
  // A holistic criterion ("Overall quality", "Ideas and content") names no
  // kind to look for, and shared words alone are too thin to call a misfit.
  if (kinds.size === 0) return { relevant: true, basis: "unjudged" };
  for (const kind of kinds) {
    if (hasCue(kind, quote)) return { relevant: true, basis: "cue" };
  }
  return { relevant: false, basis: "none" };
}
