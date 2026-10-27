"use client";

import { useId } from "react";
import { Info, ScanSearch } from "@/components/icons";

import type { RecheckReason, RecheckReasonCode } from "@/lib/review/recheck";
import type { ReviewItem } from "@/lib/review/types";
import { cn } from "@/lib/utils";

type Unit = { one: string; many: string };
type CriterionRef = { id: string; title: string };

/** One line of the callout: a sentence, or a short label with links to the criteria it names. */
type Line =
  | { key: string; kind: "text"; text: string; muted?: boolean }
  | { key: string; kind: "group"; label: string; criteria: CriterionRef[] }
  | { key: string; kind: "criterion"; criterion: CriterionRef; text: string };

/** Reasons the flags list or a criterion card states in full: the callout names them in a few words. */
const GROUPED: ReadonlySet<RecheckReasonCode> = new Set(["UNSCORED", "NO_QUOTE", "WEAK_QUOTE"]);

/** Reasons that come from the validator's flags, so the flags list below explains them. */
const FROM_FLAGS: ReadonlySet<RecheckReasonCode> = new Set(["INJECTION", "UNSCORED", "NO_QUOTE", "WEAK_QUOTE"]);

function groupLabel(code: RecheckReasonCode, demo: boolean, unit: Unit): string {
  switch (code) {
    case "UNSCORED":
      return demo ? "No usable demo suggestion" : "No usable suggested score";
    case "NO_QUOTE":
      return "No supporting quote";
    default:
      return `Quote may not support the ${unit.one}`;
  }
}

/** "You changed the demo grader's "Voice" score on…" reads as "Voice: You changed the demo grader's score on…". */
function withoutTitle(text: string, title: string): string {
  const quoted = `'s "${title}" score`;
  return text.includes(quoted) ? text.replace(quoted, "'s score") : text;
}

/**
 * The reasons as callout lines. Paper-level reasons stay sentences; reasons
 * of one kind on several criteria collapse into one line ("No supporting
 * quote: Voice, Evidence"), because the flags list and the cards already
 * say each one in full. "Often changed" keeps its numbers, one line per
 * criterion. Low confidence goes last: it counts least.
 */
function toLines(item: ReviewItem, reasons: readonly RecheckReason[], demo: boolean, unit: Unit): Line[] {
  const titles = new Map(item.criteria.map((criterion) => [criterion.id, criterion.title]));
  const lines: Line[] = [];
  const groups = new Map<RecheckReasonCode, Extract<Line, { kind: "group" }>>();
  let lowConfidence: Line | null = null;

  for (const reason of reasons) {
    const title = reason.criterionId ? titles.get(reason.criterionId) : undefined;
    const criterion = reason.criterionId && title !== undefined ? { id: reason.criterionId, title } : null;

    if (reason.code === "LOW_CONFIDENCE") {
      lowConfidence = {
        key: reason.code,
        kind: "text",
        muted: true,
        // The demo grader's confidence is a rule of thumb, not a model's.
        text: demo ? "The demo grader's confidence is low. That is a rule of thumb, not a measured accuracy." : reason.text,
      };
    } else if (reason.code === "NO_AI_DRAFT") {
      // Stands in for the "no suggested score on file" note, in the panel's words.
      lines.push({
        key: reason.code,
        kind: "text",
        text: `There is no suggested score on file for this paper. Score each ${unit.one} yourself.`,
      });
    } else if (criterion && GROUPED.has(reason.code)) {
      const group = groups.get(reason.code);
      if (group) {
        if (!group.criteria.some((entry) => entry.id === criterion.id)) group.criteria.push(criterion);
      } else {
        const line = { key: reason.code, kind: "group" as const, label: groupLabel(reason.code, demo, unit), criteria: [criterion] };
        groups.set(reason.code, line);
        lines.push(line);
      }
    } else if (criterion) {
      lines.push({
        key: `${reason.code}-${criterion.id}`,
        kind: "criterion",
        criterion,
        text: withoutTitle(reason.text, criterion.title),
      });
    } else {
      lines.push({ key: `${reason.code}-${lines.length}`, kind: "text", text: reason.text });
    }
  }
  if (lowConfidence) lines.push(lowConfidence);
  return lines;
}

const LINK =
  "rounded-sm font-medium text-primary underline decoration-primary/40 underline-offset-2 outline-none hover:decoration-primary focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * "Worth rechecking": why this draft is near the top of the queue, from
 * stored data only (lib/review/recheck.ts). Each criterion it names is a
 * button that takes the teacher to that criterion's score. A paper whose
 * only reason is low self-reported confidence gets one muted line instead:
 * that alone is never a warning.
 */
export function RecheckCallout({
  item,
  demo,
  unit,
  flagsBelow = false,
  onGoToCriterion,
}: {
  item: ReviewItem;
  /** The draft came from the demo grader: never call it a model or AI. */
  demo: boolean;
  /** "criterion" for an essay rubric, "question" for a test. */
  unit: Unit;
  /** The flags list follows with the full wording: point to it once rather than repeat it. */
  flagsBelow?: boolean;
  /** Scroll to a criterion's card and focus its score. */
  onGoToCriterion: (criterionId: string) => void;
}) {
  const headingId = useId();
  const recheck = item.recheck;
  if (!recheck || recheck.reasons.length === 0) return null;

  const lines = toLines(item, recheck.reasons, demo, unit);
  if (lines.length === 0) return null;

  if (!recheck.worth) {
    // Only low confidence: a quiet note, not a callout.
    const only = lines[0];
    return only.kind === "text" ? (
      <p className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{only.text}</span>
      </p>
    ) : null;
  }

  const pointToFlags = flagsBelow && recheck.reasons.some((reason) => FROM_FLAGS.has(reason.code));
  const goTo = (criterion: CriterionRef, context?: string) => (
    <button key={criterion.id} type="button" onClick={() => onGoToCriterion(criterion.id)} className={LINK}>
      <span className="sr-only">Go to </span>
      {criterion.title}
      {context ? <span className="sr-only"> ({context})</span> : null}
    </button>
  );

  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-border px-4 py-3">
      <h2 id={headingId} className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ScanSearch className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        Worth rechecking
      </h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-6 text-[0.875rem] leading-relaxed break-words text-foreground marker:text-muted-foreground">
        {lines.map((line) => (
          <li key={line.key} className={cn(line.kind === "text" && line.muted && "text-muted-foreground")}>
            {line.kind === "text" ? (
              line.text
            ) : line.kind === "group" ? (
              <>
                {line.label}:{" "}
                {line.criteria.map((criterion, index) => (
                  <span key={criterion.id}>
                    {index > 0 ? ", " : null}
                    {goTo(criterion, line.label.toLowerCase())}
                  </span>
                ))}
              </>
            ) : (
              <>
                {goTo(line.criterion)}: {line.text}
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        From stored scores and flags, not a new AI check.{pointToFlags ? " The flags below have the details." : null}
      </p>
    </section>
  );
}
