// Stored validation flags (AiGrade.flags): one codec and one teacher-facing
// wording for every screen. Pure: safe for client components, server code,
// and unit tests.

/** A flag as stored in AiGrade.flags. `code` is a ValidationFlagCode. */
export type StoredFlag = {
  code: string;
  message: string;
  criterionId?: string;
  /** EVIDENCE_NOT_FOUND only: why there is no quote. Absent on flags stored before it existed. */
  evidence?: "none" | "not_in_paper" | "grader_directed";
  /** LOW_LEGIBILITY only: how much of the handwriting could be read. Absent on older flags. */
  legibility?: "partly_legible" | "illegible";
};

const EVIDENCE_MISSES = new Set(["none", "not_in_paper", "grader_directed"]);
const LEGIBILITY_LEVELS = new Set(["partly_legible", "illegible"]);

export type FlagCriterion = { id: string; title: string; maxPoints: number };

export type FlagDisplay = { criterionLabel: string | null; message: string };

/** AiGrade.flags is a JSON string. Parse it defensively. */
export function parseFlags(json: string | null | undefined): StoredFlag[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry): StoredFlag[] => {
      if (!entry || typeof entry !== "object") return [];
      const { code, message, criterionId, evidence, legibility } = entry as Record<string, unknown>;
      if (typeof code !== "string") return [];
      return [
        {
          code,
          message: typeof message === "string" ? message : "",
          ...(typeof criterionId === "string" ? { criterionId } : {}),
          ...(typeof evidence === "string" && EVIDENCE_MISSES.has(evidence)
            ? { evidence: evidence as NonNullable<StoredFlag["evidence"]> }
            : {}),
          ...(typeof legibility === "string" && LEGIBILITY_LEVELS.has(legibility)
            ? { legibility: legibility as NonNullable<StoredFlag["legibility"]> }
            : {}),
        },
      ];
    });
  } catch {
    return [];
  }
}

export function serializeFlags(flags: StoredFlag[]): string {
  return JSON.stringify(flags);
}

export const INJECTION_MESSAGE =
  "Text in this paper is addressed to the grader. It was given to the grader only as paper content, never as instructions. Check the scores before approving.";

/**
 * Teacher-facing wording for a validation flag. The validator's own message
 * is specific (it names the criterion), so it is used when present; the
 * per-code text below is the fallback. Prompt-injection flags always use one
 * fixed sentence and never echo the injected text.
 */
export function describeFlag(flag: StoredFlag, criteria: FlagCriterion[]): FlagDisplay {
  if (flag.code === "POSSIBLE_PROMPT_INJECTION") {
    return { criterionLabel: null, message: INJECTION_MESSAGE };
  }
  if (flag.message.trim()) return { criterionLabel: null, message: flag.message.trim() };

  const index = flag.criterionId ? criteria.findIndex((c) => c.id === flag.criterionId) : -1;
  const criterion = index >= 0 ? criteria[index] : null;
  const criterionLabel = criterion ? `${index + 1}. ${criterion.title}` : null;

  switch (flag.code) {
    case "SCORE_OUT_OF_RANGE":
      return {
        criterionLabel,
        message: criterion
          ? `The AI score was outside 0–${criterion.maxPoints}, so it was discarded. Enter a score.`
          : "An AI score was out of range, so it was discarded. Enter a score.",
      };
    case "EVIDENCE_NOT_FOUND":
      return {
        criterionLabel,
        message: "No supporting quote found in the paper. Check the score against the text.",
      };
    case "WEAK_EVIDENCE":
      return {
        criterionLabel,
        message: "The quote may not support this criterion. Check it against the paper.",
      };
    case "MISSING_CRITERION":
      return { criterionLabel, message: "The AI skipped this criterion. Enter a score." };
    case "UNKNOWN_CRITERION":
      return {
        criterionLabel: null,
        message: "The AI returned a criterion that is not in this rubric. It was ignored.",
      };
    case "SHORT_PAPER":
      return {
        criterionLabel: null,
        message: "This paper is very short, so the suggestion has little to go on.",
      };
    default:
      return { criterionLabel, message: "The AI output needs a closer look before you publish." };
  }
}
