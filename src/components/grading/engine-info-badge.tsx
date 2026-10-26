"use client";

import { useId } from "react";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type EngineBadgeVariant = "default" | "secondary" | "outline";

const HOVER: Record<EngineBadgeVariant, string> = {
  default: "hover:bg-primary-soft/80",
  secondary: "hover:bg-secondary/70",
  outline: "hover:bg-secondary",
};

/**
 * A chip that names the engine behind a result ("Demo scanner", "GPT-4o",
 * "Demo brief"…) and explains it on click or tap. A popover rather than a
 * tooltip, so the explanation also opens on touch screens (Radix tooltips
 * ignore taps), and the trigger is a real button. The visible label stays
 * the accessible name, so a demo engine is labelled whether or not the
 * popover is ever opened.
 */
export function EngineInfoBadge({
  variant = "default",
  dashed = false,
  icon,
  label,
  explanation,
  align = "start",
  className,
}: {
  variant?: EngineBadgeVariant;
  /** Dashed border: the convention for demo engines. */
  dashed?: boolean;
  icon: React.ReactNode;
  label: string;
  explanation: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  // Radix renders the popover as role="dialog"; name it by its heading.
  const headingId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          asChild
          variant={variant}
          className={cn(
            "cursor-pointer transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
            HOVER[variant],
            dashed && "border-dashed",
            className
          )}
        >
          <button type="button">
            {icon}
            {label}
          </button>
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        aria-labelledby={headingId}
        className="w-[min(20rem,calc(100vw-2rem))] text-xs leading-relaxed"
      >
        <p id={headingId} className="mb-1 text-sm font-medium text-foreground">
          {label}
        </p>
        <p className="text-pretty text-muted-foreground">{explanation}</p>
      </PopoverContent>
    </Popover>
  );
}
