import Link from "next/link";

import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDueDate } from "@/lib/format";
import type { OpenWorkItem, OpenWorkState } from "@/lib/insights/profile";

const MAX_ITEMS = 6;

/** Classroom's words for where a piece of work stands, from the teacher's side. */
function stateDisplay(item: OpenWorkItem): { status: React.ReactNode; meta: string } {
  const due = item.dueDate ? `Due ${formatDueDate(item.dueDate)}` : "No due date";
  const map: Record<OpenWorkState, { status: React.ReactNode; meta: string }> = {
    missing: { status: <span className="font-medium text-danger">Missing</span>, meta: due },
    returned: { status: <span className="font-medium text-foreground">Sent back</span>, meta: "Waiting on student" },
    in_review: { status: <Badge variant="warning">Needs review</Badge>, meta: "AI draft, not returned" },
    ready: { status: <span className="font-medium text-success">Turned in</span>, meta: "Ready for AI pass" },
    awaiting_scan: {
      status: <span className="text-muted-foreground">Not scanned yet</span>,
      meta: item.dueDate ? `Paper test · ${due}` : "Paper test",
    },
    upcoming: { status: <span className="text-muted-foreground">Assigned</span>, meta: due },
    not_submitted: { status: <span className="text-muted-foreground">Assigned</span>, meta: due },
  };
  return map[item.state];
}

/**
 * Assignments not returned to this student yet, most urgent first, as
 * Classroom-style rows. The card is a container: in a narrow side column
 * (under 20rem) the status drops under the due line, so the title keeps
 * enough width to be read instead of shrinking to a letter or two.
 */
export function OpenWorkCard({
  items,
  classColor,
  testAssignmentIds = [],
}: {
  items: OpenWorkItem[];
  /** The class color (classTheme(klass).color) for the row icons. */
  classColor: string;
  /** Assignments that are handwritten paper tests (scan icon instead of a document). */
  testAssignmentIds?: string[];
}) {
  const shown = items.slice(0, MAX_ITEMS);
  const more = items.length - shown.length;
  const tests = new Set(testAssignmentIds);

  return (
    <Card className="@container min-w-0 overflow-hidden">
      <CardHeader className="gap-1 px-5 pt-5 pb-4 sm:px-6">
        <CardTitle>
          <h2>Open work</h2>
        </CardTitle>
        <CardDescription>Everything not returned yet.</CardDescription>
      </CardHeader>
      {items.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted-foreground sm:px-6">Nothing open. Every assignment is returned.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {shown.map((item) => {
            const { status, meta } = stateDisplay(item);
            return (
              <li key={item.assignmentId}>
                <Link
                  href={`/assignments/${encodeURIComponent(item.assignmentId)}`}
                  className="flex min-h-16 items-center gap-3 px-5 py-2.5 transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset sm:px-6"
                >
                  <AssignmentIcon isTest={tests.has(item.assignmentId)} color={classColor} className="size-9 [&_svg]:size-[18px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground" title={item.title}>
                      {item.title}
                    </span>
                    <span className="tabular block truncate text-xs text-muted-foreground">{meta}</span>
                    <span className="mt-1 block text-[13px] @xs:hidden">{status}</span>
                  </span>
                  <span className="hidden shrink-0 text-[13px] @xs:inline">{status}</span>
                </Link>
              </li>
            );
          })}
          {more > 0 ? (
            <li className="tabular px-5 py-3 text-xs text-muted-foreground sm:px-6">and {more} more</li>
          ) : null}
        </ul>
      )}
    </Card>
  );
}
