import { Download } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** What the export UI needs about a registered exporter (plain data from listExporters()). */
export type ExportFormatOption = {
  id: string;
  label: string;
  description?: string;
};

export function gradebookExportHref(classId: string, formatId: string): string {
  return `/api/classes/${encodeURIComponent(classId)}/gradebook/export?format=${encodeURIComponent(formatId)}`;
}

/**
 * One download link per registered exporter (real anchors, not client
 * fetches, so the browser handles the file). With only CSV registered this is
 * a single "Export CSV" button. The route re-checks the teacher and class
 * ownership on every request.
 */
export function ExportButtons({
  classId,
  classTitle,
  formats,
  className,
}: {
  classId: string;
  /** Used in the accessible label, e.g. "English 10 · Period 2". */
  classTitle: string;
  formats: readonly ExportFormatOption[];
  className?: string;
}) {
  if (formats.length === 0) return null;

  const note = formats.length === 1 ? formats[0]?.description : "Exports include published grades only.";

  return (
    <div className={cn("flex flex-col items-start gap-1.5 sm:items-end", className)}>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {formats.map((format) => (
          <Button key={format.id} asChild variant="outline">
            <a
              href={gradebookExportHref(classId, format.id)}
              download
              aria-label={`Export ${format.label}: ${classTitle} gradebook`}
            >
              <Download aria-hidden />
              Export {format.label}
            </a>
          </Button>
        ))}
      </div>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
