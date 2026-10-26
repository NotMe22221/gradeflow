import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded border border-border bg-card px-1 font-sans text-[0.6875rem] font-medium text-muted-foreground shadow-[0_1px_0_0_var(--border)] select-none",
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
