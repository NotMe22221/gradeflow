// Paper intake rules shared by the teacher "Add submission" dialog, the
// student submit form, and the server (src/lib/submissions.ts). Pure: safe
// for client components, server code, and unit tests.

export const MIN_PAPER_CHARS = 20;
export const MAX_PAPER_CHARS = 40_000;
/** Generous byte cap for a .txt upload holding MAX_PAPER_CHARS characters. */
export const MAX_PAPER_FILE_BYTES = MAX_PAPER_CHARS * 4;

/** Normalize pasted or uploaded text without changing its meaning. */
export function normalizePaperText(raw: string): string {
  return raw
    .replace(/^﻿/, "") // byte-order mark
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Problem with normalized paper text, or null when it is acceptable. */
export function validatePaperText(text: string): string | null {
  if (text.length < MIN_PAPER_CHARS) return "That paper looks empty. Paste the full text or upload a .txt file.";
  if (text.length > MAX_PAPER_CHARS) return `Papers are limited to ${MAX_PAPER_CHARS.toLocaleString("en-US")} characters.`;
  return null;
}

/** Problem with a chosen upload, or null for an acceptable .txt file. */
export function txtFileProblem(file: { name: string; type: string; size: number }): string | null {
  const name = file.name || "paper.txt";
  if (!name.toLowerCase().endsWith(".txt") || (file.type && file.type !== "text/plain")) {
    return "Upload a plain-text .txt file.";
  }
  if (file.size > MAX_PAPER_FILE_BYTES) return "That file is too large for one paper.";
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
