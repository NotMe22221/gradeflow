import "server-only";

import { parseAssignmentKind, type AssignmentKind } from "@/lib/constants";
import { db } from "@/lib/db";
import type { GradebookData } from "@/lib/gradebook/types";

/**
 * Kinds for the assignments already in a gradebook, so the Grades grid can
 * tell a missing essay from a paper test that is not scanned yet. Call it
 * only with data from getGradebook, which has already checked that the
 * teacher owns the class.
 */
export async function loadAssignmentKinds(data: GradebookData): Promise<Record<string, AssignmentKind>> {
  if (data.assignments.length === 0) return {};
  const rows = await db.assignment.findMany({
    where: { classId: data.class.id, id: { in: data.assignments.map((assignment) => assignment.id) } },
    select: { id: true, kind: true },
  });
  return Object.fromEntries(rows.map((row) => [row.id, parseAssignmentKind(row.kind)]));
}
