import type { IconComponent } from "@/components/icons";

import { Blob, Ring } from "@/components/decor/decor";
import { cn } from "@/lib/utils";

/**
 * Empty states say what to do next in one plain line, under a bold title. In
 * the Bold look the icon sits on a paint blob with a ring beside it; the
 * decor stays around the icon, never under the words, and goes in Calm.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: IconComponent;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-border bg-card px-6 py-12 text-center",
        className
      )}
    >
      {Icon ? (
        <div className="relative isolate mb-6 flex size-20 shrink-0 items-center justify-center">
          <Blob shape={1} tone="yellow" className="-top-2 -left-7 size-[6.5rem]" />
          <Ring tone="pink" className="-right-3 -bottom-1 size-7" />
          <div className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <Icon className="size-6" aria-hidden />
          </div>
        </div>
      ) : null}
      <p className="max-w-md font-display text-[1.125rem] leading-snug font-extrabold tracking-[-0.015em] text-balance text-foreground sm:text-[1.25rem]">
        {title}
      </p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-pretty text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
