// Links into the camera grader (/scan). Pure: safe for server and client components.

/** Where the camera grader opens for this assignment, optionally preselecting a student. */
export function scanHref(assignmentId: string, studentId?: string): string {
  const params = new URLSearchParams({ assignment: assignmentId });
  if (studentId) params.set("student", studentId);
  return `/scan?${params.toString()}`;
}
