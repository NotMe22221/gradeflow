// Links into the insights pages. Pure: safe for client and server components.

/** The teacher's profile page for one student in one class. */
export function studentProfileHref(classId: string, studentId: string): string {
  return `/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`;
}

/** The class heatmap. */
export function insightsHref(classId: string): string {
  return `/insights?class=${encodeURIComponent(classId)}`;
}
