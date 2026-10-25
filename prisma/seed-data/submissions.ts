// Which student submitted which paper, and when. Times are relative to the
// moment the seed runs, so the demo always looks current.

import type { DaysAgoAt } from "./helpers";
import type { PaperKey } from "./papers";
import type { StudentKey } from "./people";
import type { AssignmentKey } from "./rubrics";

export type SeedSubmission = {
  assignmentKey: AssignmentKey;
  studentKey: StudentKey;
  paperKey: PaperKey;
  submittedAt: DaysAgoAt;
  /** Set when the student uploaded a .txt file instead of pasting. */
  fileName: string | null;
};

/**
 * Waiting for the AI first pass (status SUBMITTED, no AiGrade yet), so a
 * judge can run the grading live. The review queue lists papers oldest
 * first, so the strong essay comes up first and Theo's flagged essay is
 * close behind.
 */
export const PENDING_SUBMISSIONS: SeedSubmission[] = [
  {
    assignmentKey: "fourDayWeek",
    studentKey: "ava",
    paperKey: "avaFourDayWeek",
    submittedAt: { daysAgo: 3, hour: 19, minute: 18 },
    fileName: null,
  },
  {
    assignmentKey: "fourDayWeek",
    studentKey: "milo",
    paperKey: "miloFourDayWeek",
    submittedAt: { daysAgo: 3, hour: 21, minute: 47 },
    fileName: null,
  },
  {
    assignmentKey: "willowCreek",
    studentKey: "leo",
    paperKey: "leoWillowCreek",
    submittedAt: { daysAgo: 2, hour: 16, minute: 5 },
    fileName: "ashgrove-willow-creek-lab.txt",
  },
  {
    assignmentKey: "fourDayWeek",
    studentKey: "theo",
    paperKey: "theoFourDayWeek",
    submittedAt: { daysAgo: 2, hour: 22, minute: 31 },
    fileName: null,
  },
  {
    assignmentKey: "willowCreek",
    studentKey: "nadia",
    paperKey: "nadiaWillowCreek",
    submittedAt: { daysAgo: 1, hour: 7, minute: 52 },
    fileName: null,
  },
  {
    assignmentKey: "fourDayWeek",
    studentKey: "priya",
    paperKey: "priyaFourDayWeek",
    submittedAt: { daysAgo: 1, hour: 23, minute: 56 },
    fileName: null,
  },
];
