import { classInitial, classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

/** Colored circle with the class initial, as in Classroom's class list. */
export function ClassAvatar({ name, className }: { name: string; className?: string }) {
  const theme = classTheme({ name });
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white",
        className
      )}
      style={{ backgroundColor: theme.color }}
    >
      {classInitial(name)}
    </span>
  );
}
