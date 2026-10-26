// Scoping for the search index. Pure: the database query in server.ts
// already limits rows to the viewer (a teacher's own classes, a student's
// enrolled classes), and this second pass keeps that true even if a query
// ever returns more than it should: only rows tied to an allowed class
// survive, students never see other students, and only whitelisted fields
// are copied (no emails, scores, drafts or flags, whatever the rows carry).

import type { SearchAssignment, SearchClass, SearchIndex, SearchRole, SearchStudent } from "@/lib/search/types";

/** Caps keep the payload small for very large rosters. */
export const MAX_SEARCH_CLASSES = 100;
export const MAX_SEARCH_ASSIGNMENTS = 600;
export const MAX_SEARCH_STUDENTS = 1500;

export type SearchRows = {
  classes: readonly { id: string; name: string; section?: string | null; subject?: string | null }[];
  assignments: readonly { id: string; title: string; classId: string; kind?: string | null; dueDate?: Date | string | null }[];
  /** Enrolled students per class (teachers only). */
  students?: readonly { id: string; name: string; classId: string }[];
};

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * The search index a viewer may see, from rows loaded for them. `rows.classes`
 * defines the allowed classes; assignments and students outside them are
 * dropped, duplicates are removed, and students are dropped entirely for a
 * student viewer.
 */
export function buildSearchIndex(role: SearchRole, rows: SearchRows): SearchIndex {
  const classes: SearchClass[] = [];
  const classNames = new Map<string, string>();
  for (const row of rows.classes) {
    if (classNames.has(row.id) || classes.length >= MAX_SEARCH_CLASSES) continue;
    classNames.set(row.id, row.name);
    classes.push({ id: row.id, name: row.name, section: row.section ?? null, subject: row.subject ?? null });
  }

  const assignments: SearchAssignment[] = [];
  const seenAssignments = new Set<string>();
  for (const row of rows.assignments) {
    const className = classNames.get(row.classId);
    if (className === undefined || seenAssignments.has(row.id)) continue;
    if (assignments.length >= MAX_SEARCH_ASSIGNMENTS) break;
    seenAssignments.add(row.id);
    assignments.push({
      id: row.id,
      title: row.title,
      classId: row.classId,
      className,
      kind: row.kind === "TEST" ? "TEST" : "ESSAY",
      dueDate: iso(row.dueDate),
    });
  }

  const students: SearchStudent[] = [];
  if (role === "TEACHER") {
    const seen = new Set<string>();
    for (const row of rows.students ?? []) {
      const className = classNames.get(row.classId);
      const key = `${row.id}:${row.classId}`;
      if (className === undefined || seen.has(key)) continue;
      if (students.length >= MAX_SEARCH_STUDENTS) break;
      seen.add(key);
      students.push({ id: row.id, name: row.name, classId: row.classId, className });
    }
  }

  return { role, classes, assignments, students };
}
