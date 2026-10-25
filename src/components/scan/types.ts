import type { AssignmentKind } from "@/lib/constants";

/** A student enrolled in a class, as offered by the /scan student picker. */
export type ScanStudentOption = { id: string; name: string };

export type ScanClassOption = {
  id: string;
  /** "Environmental Science · Period 4" */
  label: string;
  students: ScanStudentOption[];
};

export type ScanAssignmentOption = {
  id: string;
  title: string;
  kind: AssignmentKind;
  classId: string;
  questionCount: number;
  totalPoints: number;
};

/** The student's current paper for an assignment, if any. */
export type ScanPaperState = {
  status: string;
  /** Short status label: "In review", "Published". */
  label: string;
  /** false when a scan would be refused (published, approved, or being graded). */
  replaceable: boolean;
};

/** Key for ScanPaperState lookups. */
export function paperKey(assignmentId: string, studentId: string): string {
  return `${assignmentId}:${studentId}`;
}

/** One photo in the scan, ready to upload. */
export type ScanPage = {
  id: string;
  blob: Blob;
  /** Object URL for the thumbnail; revoked when the page is removed. */
  url: string;
  name: string;
  /** Set when the bytes are a bundled sample photo (the demo scanner can read those). */
  sampleId: string | null;
  width: number;
  height: number;
  /** true when the photo was downscaled or re-encoded before upload. */
  resized: boolean;
};
