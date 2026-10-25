import { cn } from "@/lib/utils";

/** Initials avatar. Demo users never have photos. */
function Avatar({
  name,
  className,
  ...props
}: React.ComponentProps<"span"> & { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      data-slot="avatar"
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border",
        className
      )}
      {...props}
    >
      {initials}
    </span>
  );
}

export { Avatar };
