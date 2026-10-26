// Shapes shared by the search endpoint, the pure helpers and the command
// palette. Pure (no React, no DOM, no database).

export type SearchRole = "TEACHER" | "STUDENT";

/**
 * What /api/search returns for the signed-in user. Built by
 * buildSearchIndex() from rows already scoped by the database query, and
 * scoped again there: only ids, names, titles, kinds and due dates. Never
 * emails, scores, AI drafts, flags or other students' work.
 */
export type SearchIndex = {
  role: SearchRole;
  classes: SearchClass[];
  assignments: SearchAssignment[];
  /** Teachers only: students enrolled in the teacher's own classes. Always empty for students. */
  students: SearchStudent[];
};

export type SearchClass = { id: string; name: string; section: string | null; subject: string | null };

export type SearchAssignment = {
  id: string;
  title: string;
  classId: string;
  className: string;
  kind: "ESSAY" | "TEST";
  /** ISO date (a due date is a calendar day, stored at noon UTC). */
  dueDate: string | null;
};

/** One row per enrollment, so a student in two of the teacher's classes appears once per class. */
export type SearchStudent = { id: string; name: string; classId: string; className: string };

export type SearchKind = "class" | "assignment" | "student" | "page" | "action";

/** Icons for pages and actions, mapped to components by the palette. */
export type SearchIcon =
  | "home"
  | "classes"
  | "review"
  | "todo"
  | "goals"
  | "gradebook"
  | "insights"
  | "scanner"
  | "create"
  | "create-test"
  | "theme-dark"
  | "theme-light"
  | "theme-system"
  | "customize"
  | "arrange";

/** Client-side commands an action can run instead of navigating. */
export type SearchCommand = { type: "theme"; theme: "system" | "light" | "dark" } | { type: "customize" };

/** Anything the palette can show, in one flat shape for ranking. */
export type SearchItem = {
  /** Unique across kinds, stable across loads: "class:<id>", "page:todo". */
  key: string;
  kind: SearchKind;
  title: string;
  /** Second line (class name, section). */
  subtitle?: string;
  /** Extra words that match but are not shown (subject, "essay", "dark mode"). */
  keywords?: string[];
  href?: string;
  command?: SearchCommand;
  icon?: SearchIcon;
  /** Shown before any typing (empty query). */
  suggested?: boolean;
  /** Display data. */
  classId?: string;
  className?: string;
  assignmentKind?: "ESSAY" | "TEST";
  dueDate?: string | null;
};

export type SearchGroupId = "recent" | "class" | "assignment" | "student" | "page" | "action";

export type SearchGroup = { id: SearchGroupId; heading: string; items: SearchItem[] };
