import { cn } from "@/lib/utils";

/** Standard page container: generous whitespace on an 8pt rhythm. */
export function PageContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10", className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <div className="text-[0.8125rem] font-medium text-muted-foreground">{eyebrow}</div>
        ) : null}
        <h1 className="text-[1.625rem] leading-tight font-medium text-balance text-foreground sm:text-[1.75rem]">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-[0.9375rem] text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:max-w-[60%] md:shrink-0 md:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
