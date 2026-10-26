import type { Metadata } from "next";

import { ReviewWorkspace } from "@/components/review/review-workspace";
import { requireTeacherPage } from "@/lib/auth/session";
import { getOwnedAssignmentTitle, getReviewQueue } from "@/lib/grades/review";

export const metadata: Metadata = { title: "To review" };

function single(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first && first.length <= 64 ? first : null;
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const teacher = await requireTeacherPage();
  const params = await searchParams;
  const requestedAssignment = single(params.assignment);
  const requestedSubmission = single(params.s);

  const items = await getReviewQueue(teacher.id);

  // Only honour an assignment filter the teacher owns; anything else shows
  // the whole queue.
  let assignmentId: string | null = null;
  let assignmentTitle: string | null = null;
  if (requestedAssignment) {
    const inQueue = items.find((item) => item.assignment.id === requestedAssignment);
    assignmentTitle = inQueue
      ? inQueue.assignment.title
      : await getOwnedAssignmentTitle(teacher.id, requestedAssignment);
    if (assignmentTitle !== null) assignmentId = requestedAssignment;
  }

  // An unknown ?s= simply falls back to the first paper in the queue.
  const selectedId = items.some((item) => item.id === requestedSubmission) ? requestedSubmission : null;

  return (
    <ReviewWorkspace
      items={items}
      initialAssignmentId={assignmentId}
      initialSelectedId={selectedId}
      filterTitle={assignmentTitle}
    />
  );
}
