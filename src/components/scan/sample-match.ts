// Where a sample photo's scan goes. Pure: safe for client components and unit tests.

import {
  paperKey,
  type ScanAssignmentOption,
  type ScanClassOption,
  type ScanPaperState,
} from "@/components/scan/types";
import { firstName } from "@/lib/format";
import type { SampleTestPhoto } from "@/lib/scan/samples";

export type SampleSelection = {
  assignmentId: string;
  /** "" when no student can take the scan. */
  studentId: string;
  /** Says what was selected, and why when it isn't the photo's own student. */
  notice: string;
};

/**
 * The seeded assignment and student a sample photo belongs to. On a shared
 * demo someone may already have approved that student's paper, which a scan
 * never replaces. The photo then goes to the first classmate with no paper,
 * or else the first whose paper can be replaced. The demo scanner recognizes
 * the photo by its bytes, not by the student, so it grades and flags it the
 * same way. null when the sample's assignment isn't on this teacher's list.
 */
export function sampleSelection(
  sample: SampleTestPhoto,
  assignments: ScanAssignmentOption[],
  classes: ScanClassOption[],
  papers: Record<string, ScanPaperState>
): SampleSelection | null {
  // The picker lists handwritten tests only.
  const match = assignments.find((option) => option.title === sample.assignmentTitle);
  if (!match) return null;
  const students = classes.find((option) => option.id === match.classId)?.students ?? [];
  const paperOf = (studentId: string) => papers[paperKey(match.id, studentId)];

  const own = students.find((option) => option.name === sample.studentName);
  if (!own) return { assignmentId: match.id, studentId: "", notice: `Selected ${match.title} to match the sample photo.` };
  const ownPaper = paperOf(own.id);
  if (!ownPaper || ownPaper.replaceable) {
    return {
      assignmentId: match.id,
      studentId: own.id,
      notice: `Selected ${sample.studentName} and ${match.title} to match the sample photo.`,
    };
  }

  const reason = `${firstName(sample.studentName)}'s paper is already ${ownPaper.label.toLowerCase()}`;
  const fallback =
    students.find((option) => !paperOf(option.id)) ?? students.find((option) => paperOf(option.id)?.replaceable);
  if (!fallback) {
    return {
      assignmentId: match.id,
      studentId: "",
      notice: `Selected ${match.title}. ${reason}, and every other student in this class already has a paper on it that can't be replaced, so no student is selected.`,
    };
  }
  return {
    assignmentId: match.id,
    studentId: fallback.id,
    notice: `Selected ${fallback.name} and ${match.title}. ${reason}, so the sample photo goes to ${firstName(fallback.name)} instead.`,
  };
}
