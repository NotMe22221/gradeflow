import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Plain download link to the export route (a real anchor, not a client
 * fetch, so the browser handles the file). The route re-checks the teacher
 * and class ownership on every request.
 */
export function ExportCsvButton({
  classId,
  classTitle,
  className,
}: {
  classId: string;
  /** Used in the accessible label, e.g. "English 10". */
  classTitle: string;
  className?: string;
}) {
  const href = `/api/classes/${encodeURIComponent(classId)}/gradebook/export?format=csv`;
  return (
    <div className={cn("flex flex-col items-start gap-1.5 sm:items-end", className)}>
      <Button asChild variant="outline">
        <a href={href} download aria-label={`Export CSV of the ${classTitle} gradebook`}>
          <Download aria-hidden />
          Export CSV
        </a>
      </Button>
      <p className="text-xs text-muted-foreground">CSV is the stand-in for an LMS sync.</p>
    </div>
  );
}
