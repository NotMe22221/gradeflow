import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { OpenWorkItem, OpenWorkState } from "@/lib/insights/profile";

const MAX_ITEMS = 6;

function StateBadge({ item }: { item: OpenWorkItem }) {
  const map: Record<OpenWorkState, { label: string; variant: "danger" | "warning" | "outline" | "secondary" }> = {
    missing: { label: "Missing", variant: "danger" },
    returned: { label: "Sent back", variant: "outline" },
    in_review: { label: "In review", variant: "warning" },
    ready: { label: "Ready for AI pass", variant: "secondary" },
    awaiting_scan: { label: "Not scanned yet", variant: "outline" },
    upcoming: { label: item.dueDate ? `Due ${formatDate(item.dueDate)}` : "Upcoming", variant: "secondary" },
    not_submitted: { label: "Not submitted", variant: "secondary" },
  };
  const { label, variant } = map[item.state];
  return (
    <Badge variant={variant} className="tabular shrink-0">
      {label}
    </Badge>
  );
}

/** Assignments that are not published yet for this student, most urgent first. */
export function OpenWorkCard({ items }: { items: OpenWorkItem[] }) {
  const shown = items.slice(0, MAX_ITEMS);
  const more = items.length - shown.length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle>
          <h2>Open work</h2>
        </CardTitle>
        <CardDescription>Everything not published yet.</CardDescription>
      </CardHeader>
      {items.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">Nothing open. Every assignment is published.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {shown.map((item) => (
            <li key={item.assignmentId}>
              <Link
                href={`/assignments/${encodeURIComponent(item.assignmentId)}`}
                className="flex items-center justify-between gap-3 px-6 py-3 transition-colors outline-none hover:bg-background focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className="min-w-0 truncate text-sm text-foreground" title={item.title}>
                  {item.title}
                </span>
                <StateBadge item={item} />
              </Link>
            </li>
          ))}
          {more > 0 ? (
            <li className="tabular px-6 py-3 text-xs text-muted-foreground">and {more} more</li>
          ) : null}
        </ul>
      )}
    </Card>
  );
}
