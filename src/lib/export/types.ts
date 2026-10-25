// Pure contract for gradebook exports. Safe to import anywhere.

import type { GradebookData } from "@/lib/gradebook/types";

export type ExportOptions = {
  /** Clock for the filename date. Defaults to the current time. */
  now?: Date;
};

export type ExportResult = {
  filename: string;
  body: string;
};

/**
 * Turns a class gradebook into something that can leave GradeSmart AI.
 *
 * GradebookData only ever contains teacher-approved PublishedGrade scores, so
 * every exporter inherits the approval gate: nothing the AI suggested can be
 * exported, only what a teacher published.
 *
 * CSV is the stand-in for an LMS integration today. A real Canvas or Google
 * Classroom exporter would implement the same contract, roughly:
 *
 *   1. Map each GradebookData student to the LMS user id (Canvas user id, or
 *      Classroom userId), e.g. via a stored roster link or SIS id, and each
 *      assignment to the LMS assignment / courseWork id it mirrors.
 *   2. Push only cells with state "published": Canvas via the Submissions API
 *      (`PUT /api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id`
 *      with `submission[posted_grade]`), Classroom via
 *      `courses.courseWork.studentSubmissions.patch` (assignedGrade) followed
 *      by `return`.
 *   3. Return a summary body (what was pushed, what was skipped and why) so the
 *      teacher sees exactly what happened.
 *
 * A network-backed exporter returns a Promise from export(); the route awaits
 * every exporter, and each one runs behind the same teacher-only,
 * ownership-checked route. Registering it in ./index.ts is all it takes to
 * add its button to the gradebook page. No LMS calls exist in this codebase;
 * they are intentionally out of scope for the demo.
 */
export interface GradebookExporter {
  /** Stable id used in `?format=<id>` on the export route. */
  id: string;
  /** Human-readable name for buttons and menus, e.g. "CSV" (shown as "Export CSV"). */
  label: string;
  /** Optional one-line note shown under the export control when it is the only format. */
  description?: string;
  /** Response Content-Type, including the charset. */
  contentType: string;
  /** File extension without the dot, e.g. "csv". */
  fileExtension: string;
  /** Build the export. May be async (return a Promise), e.g. to call an LMS API. */
  export(data: GradebookData, options?: ExportOptions): ExportResult | Promise<ExportResult>;
}
