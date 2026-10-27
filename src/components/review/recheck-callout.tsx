"use client";

import { useId } from "react";
import { Info, ScanSearch } from "@/components/icons";

import type { GraderKind } from "@/lib/constants";
import { hasPagePhotos } from "@/lib/review/media";
import {
  describeOverride,
  graderName,
  type CriterionRecheckCode,
  type PaperRecheckCode,
  type RecheckReason,
  type RecheckReasonCode,
} from "@/lib/review/recheck";
import type { ReviewItem } from "@/lib/review/types";
import { cn } from "@/lib/utils";

/** "criterion" / "criteria" on an essay rubric, "question" / "questions" on a test. */
export type RecheckUnit = { one: string; many: string };

type CriterionRef = { id: string; title: string };
type GroupedCode = Exclude<CriterionRecheckCode, "OFTEN_CHANGED">;

/**
 * One line of the callout. Paper-level reasons are recheck.ts's sentences as
 * they are; reasons of one kind on several criteria share a short label with
 * a link per criterion; "often changed" is one line per criterion, worded
 * from its numbers. Nothing here edits a reason's sentence.
 */
export type RecheckLine =
  | { key: string; kind: "paper"; code: PaperRecheckCode; text: string; muted: boolean }
  | { key: string; kind: "group"; code: GroupedCode; label: string; criteria: CriterionRef[] }
  | { key: string; kind: "criterion"; code: "OFTEN_CHANGED"; criterion: CriterionRef; text: string };

/** Reasons that come from the validator's or the camera grader's flags, so the flags list below explains them. */
const FROM_FLAGS: ReadonlySet<RecheckReasonCode> = new Set([
  "INJECTION",
  "LOW_LEGIBILITY",
  "UNSCORED",
  "NO_QUOTE",
  "WEAK_QUOTE",
]);

/** The short label a group of criterion reasons shares. The grader is named as recheck.ts names it. */
function groupLabel(code: GroupedCode, grader: GraderKind, unit: RecheckUnit): string {
  switch (code) {
    case "UNSCORED":
      return `No usable score from ${graderName(grader)}`;
    case "NO_QUOTE":
      return "No supporting quote";
    case "WEAK_QUOTE":
      return `Quote may not support the ${unit.one}`;
  }
}

/**
 * The reasons as callout lines, from their structured fields only (code,
 * criterionTitle, override). Paper-level reasons come first, in recheck.ts's
 * order, except low confidence, which goes last and muted: it counts least.
 * Reasons of one kind on several criteria collapse into one line ("No
 * supporting quote: Voice, Evidence"), because the flags list and the cards
 * say each one in full. "Often changed" keeps its numbers, one line per
 * criterion, and leaves the title to the link in front of it.
 */
export function recheckLines(item: ReviewItem, reasons: readonly RecheckReason[], unit: RecheckUnit): RecheckLine[] {
  // Criterion reasons only exist on a draft with an AI record (toReviewItem already read an unknown grader as demo).
  const grader: GraderKind = item.ai?.grader ?? "demo";
  const lines: RecheckLine[] = [];
  const last: RecheckLine[] = [];
  const groups = new Map<GroupedCode, Extract<RecheckLine, { kind: "group" }>>();

  for (const reason of reasons) {
    if (reason.criterionId === null) {
      const muted = reason.code === "LOW_CONFIDENCE";
      (muted ? last : lines).push({ key: reason.code, kind: "paper", code: reason.code, text: reason.text, muted });
      continue;
    }
    const criterion = { id: reason.criterionId, title: reason.criterionTitle };
    if (reason.code === "OFTEN_CHANGED") {
      lines.push({
        key: `${reason.code}-${criterion.id}`,
        kind: "criterion",
        code: reason.code,
        criterion,
        text: describeOverride(grader, reason.override),
      });
      continue;
    }
    const group = groups.get(reason.code);
    if (!group) {
      const line = {
        key: reason.code,
        kind: "group" as const,
        code: reason.code,
        label: groupLabel(reason.code, grader, unit),
        criteria: [criterion],
      };
      groups.set(reason.code, line);
      lines.push(line);
    } else if (!group.criteria.some((entry) => entry.id === criterion.id)) {
      group.criteria.push(criterion);
    }
  }
  return [...lines, ...last];
}

const LINK =
  "rounded-sm font-medium text-primary underline decoration-primary/40 underline-offset-2 outline-none hover:decoration-primary focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * "Worth rechecking": why this draft is near the top of the queue, from
 * stored data only (lib/review/recheck.ts, which words every reason by the
 * grader and the assignment kind). Each criterion it names is a button that
 * takes the teacher to that criterion's score; unreadable handwriting comes
 * with a button to the photo it should be checked against. A paper whose
 * only reason is low self-reported confidence gets one muted line instead:
 * that alone is never a warning.
 */
export function RecheckCallout({
  item,
  unit,
  flagsBelow = false,
  onGoToCriterion,
  onShowPhotos,
}: {
  item: ReviewItem;
  unit: RecheckUnit;
  /** The flags list follows with the full wording: point to it once rather than repeat it. */
  flagsBelow?: boolean;
  /** Scroll to a criterion's card and focus its score. */
  onGoToCriterion: (criterionId: string) => void;
  /** Show the paper's photos (a scanned test). Without it, or without photos, there is no photo button. */
  onShowPhotos?: () => void;
}) {
  const headingId = useId();
  const recheck = item.recheck;
  if (!recheck || recheck.reasons.length === 0) return null;

  const lines = recheckLines(item, recheck.reasons, unit);
  if (lines.length === 0) return null;

  if (!recheck.worth) {
    // Only low confidence: a quiet note, not a callout.
    const quiet = lines.flatMap((line) => (line.kind === "paper" && line.muted ? [line.text] : []));
    return quiet.length > 0 ? (
      <p className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{quiet.join(" ")}</span>
      </p>
    ) : null;
  }

  const pointToFlags = flagsBelow && recheck.reasons.some((reason) => FROM_FLAGS.has(reason.code));
  const photos = onShowPhotos && hasPagePhotos(item) ? onShowPhotos : null;
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
          <li key={line.key} className={cn(line.kind === "paper" && line.muted && "text-muted-foreground")}>
            {line.kind === "paper" ? (
              <>
                {line.text}
                {line.code === "LOW_LEGIBILITY" && photos ? (
                  <>
                    {" "}
                    <button type="button" onClick={photos} className={cn(LINK, "whitespace-nowrap")}>
                      {item.images.length > 1 ? "Show the photos" : "Show the photo"}
                    </button>
                  </>
                ) : null}
              </>
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
