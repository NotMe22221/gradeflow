import { ExternalLink } from "@/components/icons";

import { cn } from "@/lib/utils";

/**
 * A link that leaves the site: opens in a new tab, safely, and says so to
 * screen readers. Used by the judges section and its comparison table.
 */
export function ExternalAnchor({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "rounded-sm text-primary underline underline-offset-4 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
      <ExternalLink aria-hidden className="ml-0.5 inline size-[1.05em] align-[-0.175em]" />
    </a>
  );
}
