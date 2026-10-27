// Word helpers shared by the demo grader and the quote relevance check.
// Pure: safe for client components, server code, and unit tests.

export const STOPWORDS = new Set(
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
export const RUBRIC_FILLER = new Set(
  (
    "paper essay student writer writing response full credit point points clear clearly well strong strongly " +
    "effective effectively use uses using used demonstrate demonstrates show shows throughout each every " +
    "appropriate relevant good excellent includes include including provides provide make makes level score " +
    "meets meet fully complete completely consistent consistently thorough thoroughly skill skilled"
  ).split(" ")
);

export function tokenize(lower: string): string[] {
  return lower.match(/[a-z0-9]+(?:['’][a-z]+)*/g) ?? [];
}

export function stem(word: string): string {
  let w = word.replace(/['’]s$/, "");
  for (const suffix of ["ingly", "edly", "ing", "ies", "ed", "es", "ly", "s"]) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      w = w.slice(0, -suffix.length) + (suffix === "ies" ? "y" : "");
      break;
    }
  }
  return w;
}

export function contentStems(text: string, exclude?: Set<string>): Set<string> {
  const stems = new Set<string>();
  for (const token of tokenize(text.toLowerCase())) {
    if (token.length < 3 || STOPWORDS.has(token) || /^\d/.test(token)) continue;
    if (exclude?.has(token)) continue;
    stems.add(stem(token));
  }
  return stems;
}
