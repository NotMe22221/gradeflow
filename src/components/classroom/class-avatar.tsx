import { classInitial, classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

/**
 * Colored circle with the class initial, as in Classroom's class list. Uses
 * the class accent: the classic color with white in light, a lighter tone
 * with dark text in dark, so it stands out on dark surfaces without glare.
 */
export function ClassAvatar({ name, className }: { name: string; className?: string }) {
  const theme = classTheme({ name });
  return (
    <span
      aria-hidden
      className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium", className)}
      style={{ backgroundColor: theme.accent, color: theme.onAccent }}
    >
      {classInitial(name)}
    </span>
  );
}
