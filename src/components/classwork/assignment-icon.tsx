import { FileText, ScanLine } from "@/components/icons";

import { cn } from "@/lib/utils";

/**
 * The colored circle that marks a piece of classwork, as in Google
 * Classroom: the class color with a white icon. Essays get a document icon,
 * handwritten tests a scan icon. Decorative: the title next to it names it.
 */
export function AssignmentIcon({
  isTest,
  color,
  className,
}: {
  isTest: boolean;
  /** The class color (classTheme(klass).color). */
  color: string;
  className?: string;
}) {
  const Icon = isTest ? ScanLine : FileText;
  return (
    <span
      aria-hidden
      className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white", className)}
      style={{ backgroundColor: color }}
    >
      <Icon className="size-5" />
    </span>
  );
}
