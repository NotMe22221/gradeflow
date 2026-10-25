// CSV gradebook export. Pure (no "server-only", no database) so it is unit
// tested directly; the route handler feeds it GradebookData.

import type { ExportOptions, ExportResult, GradebookExporter } from "@/lib/export/types";
import type { GradebookData } from "@/lib/gradebook/types";

/** Leading characters that spreadsheet apps may treat as a formula. */
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

/** Excel needs a byte-order mark to read UTF-8 names correctly. */
const UTF8_BOM = "﻿";

/** RFC 4180 records end with CRLF. */
const CRLF = "\r\n";

/**
 * Stop CSV / formula injection: a cell that starts with = + - @ tab or CR is
 * prefixed with a single quote so spreadsheets show it as text instead of
 * evaluating it. Names, emails, and assignment titles are user-controlled.
 */
export function neutralizeFormula(value: string): string {
  return value.length > 0 && FORMULA_TRIGGERS.has(value[0]!) ? `'${value}` : value;
}

/** RFC 4180: quote fields containing a comma, quote, CR, or LF; double inner quotes. */
export function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Make any value safe for one CSV cell: injection guard first, then quoting. */
export function toCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "number" ? formatNumber(value) : value;
  return escapeCsvField(neutralizeFormula(text));
}

export function toCsvRow(values: readonly (string | number | null | undefined)[]): string {
  return values.map(toCsvCell).join(",");
}

/** Up to two decimals, no trailing zeros: 21, 21.5, 83.33. */
function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

/** One decimal for percentages: 84, 83.3. */
function formatPercentValue(value: number | null): number | null {
  return value === null || !Number.isFinite(value) ? null : Math.round(value * 10) / 10;
}

export function slugify(value: string, fallback = "class"): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || fallback;
}

/** Local calendar date as YYYY-MM-DD. */
function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function gradebookFilename(data: GradebookData, extension: string, now: Date = new Date()): string {
  const base = slugify([data.class.name, data.class.section].filter(Boolean).join(" "));
  return `${base}-gradebook-${isoDate(now)}.${extension}`;
}

/** The CSV text: header row, then one row per student. Published scores only. */
export function gradebookToCsv(data: GradebookData): string {
  const header = [
    "Student",
    "Email",
    ...data.assignments.map((assignment) => `${assignment.title} (/${formatNumber(assignment.maxScore)})`),
    "Average %",
  ];

  const rows = data.rows.map((row) => [
    row.student.name,
    row.student.email,
    ...row.cells.map((cell) => (cell.state === "published" ? cell.score : null)),
    formatPercentValue(row.averagePercent),
  ]);

  return UTF8_BOM + [header, ...rows].map(toCsvRow).join(CRLF) + CRLF;
}

/** Synchronous: `satisfies` keeps its precise return type for direct callers. */
export const csvExporter = {
  id: "csv",
  label: "CSV",
  description: "CSV is the stand-in for an LMS sync.",
  contentType: "text/csv; charset=utf-8",
  fileExtension: "csv",
  export(data: GradebookData, options?: ExportOptions): ExportResult {
    return {
      filename: gradebookFilename(data, "csv", options?.now ?? new Date()),
      body: gradebookToCsv(data),
    };
  },
} satisfies GradebookExporter;
