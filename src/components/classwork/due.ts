// Due-date helpers shared by Classwork, Grades, and the assignment page.
// Pure: safe for server and client components and unit tests.

/**
 * Due dates are calendar days (stored at noon UTC by the assignment builder),
 * so work is only past due once its whole due day has ended.
 */
export function isPastDueDay(dueDate: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const endOfDueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate(), 23, 59, 59, 999);
  return now.getTime() > endOfDueDay;
}
