// Score granularity shared by the review screen, the review server logic, and
// publishing. Pure: safe for client components, server code, and unit tests.

/**
 * Scores are whole or half points. This matches the score input's step and
 * the AI validator, which rounds suggestions to the nearest half point, so a
 * published score always reads the same in the app, the student view, and
 * the CSV export.
 */
export const SCORE_STEP = 0.5;

export function isOnScoreStep(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value / SCORE_STEP);
}
