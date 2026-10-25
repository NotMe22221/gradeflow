// Plain-text and display helpers for a conference brief ("Copy as text",
// the basis line). Pure: safe for client components and unit tests.

import type { BriefBasis, BriefEngine, ConferenceBrief } from "@/lib/briefs/types";
import { pluralize } from "@/lib/format";

/** "Based on 3 approved grades · average 84%", computed in code, never by the model. */
export function formatBriefBasis(basis: BriefBasis): string {
  const count = `Based on ${pluralize(basis.publishedCount, "approved grade")}`;
  return basis.averagePercent === null ? count : `${count} · average ${Math.round(basis.averagePercent)}%`;
}

/** "AI draft · gpt-4o-mini" or "Demo brief". The model name comes from the server response. */
export function briefEngineLabel(engine: BriefEngine, model: string | null): string {
  if (engine === "demo") return "Demo brief";
  return model ? `AI draft · ${model}` : "AI draft";
}

export type BriefTextMeta = {
  studentName: string;
  classTitle: string;
  /** Preformatted, e.g. "Oct 25, 2026". */
  dateLabel: string;
  basis: BriefBasis;
  engine: BriefEngine;
  model: string | null;
};

const SECTIONS: { key: keyof Omit<ConferenceBrief, "headline" | "summary">; title: string; numbered: boolean }[] = [
  { key: "strengths", title: "Strengths", numbered: false },
  { key: "growthAreas", title: "Growth areas", numbered: false },
  { key: "talkingPoints", title: "Talking points", numbered: true },
  { key: "nextSteps", title: "Next steps", numbered: false },
  { key: "questionsForFamily", title: "Questions for the family", numbered: false },
];

/** The brief's sections in display order, shared by the on-screen, print, and text views. */
export const BRIEF_SECTIONS = SECTIONS;

/** The whole brief as plain text for pasting into an email or a document. */
export function briefToPlainText(brief: ConferenceBrief, meta: BriefTextMeta): string {
  const lines: string[] = [
    "Parent-teacher conference brief",
    `${meta.studentName} · ${meta.classTitle} · ${meta.dateLabel}`,
    formatBriefBasis(meta.basis),
    "",
    brief.headline,
    "",
    brief.summary,
  ];
  for (const section of SECTIONS) {
    lines.push("", section.title);
    brief[section.key].forEach((item, index) => {
      lines.push(section.numbered ? `${index + 1}. ${item}` : `- ${item}`);
    });
  }
  lines.push(
    "",
    meta.engine === "demo"
      ? "Demo brief from a local template over teacher-approved grades. Review before sharing with families."
      : `${briefEngineLabel(meta.engine, meta.model)} from teacher-approved grades. Review before sharing with families.`
  );
  return lines.join("\n");
}
