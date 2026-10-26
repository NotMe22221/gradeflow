"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The assignment prompt. Below lg, a long prompt is capped with a fade and a
 * "Show full prompt" toggle so it never looks cut off mid-sentence. On lg it
 * sits beside the taller rubric and is shown in full.
 */
export function PromptText({ text }: { text: string }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const clipped = overflowing && !expanded;

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        id={id}
        className={cn(
          "text-sm leading-relaxed break-words whitespace-pre-line text-foreground",
          !expanded && "max-h-96 overflow-hidden lg:max-h-none",
          clipped && "[mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
        )}
      >
        {text}
      </div>
      {overflowing || expanded ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2.5"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
          {expanded ? "Show less" : "Show full prompt"}
        </Button>
      ) : null}
    </div>
  );
}
