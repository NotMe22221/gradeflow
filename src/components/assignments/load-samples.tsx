"use client";

import { unstable_rethrow } from "next/navigation";
import { useTransition } from "react";
import { FlaskConical, Loader2 } from "@/components/icons";
import { toast } from "sonner";

import { loadSamplePapers } from "@/app/(teacher)/assignments/actions";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";

export const LOAD_SAMPLES_HINT = "Adds synthetic papers so you can try the AI pass.";

/** Demo helper: fill empty submission slots with synthetic papers. */
export function useLoadSamples(assignmentId: string) {
  const [pending, startTransition] = useTransition();

  function load() {
    if (pending) return;
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof loadSamplePapers>>;
      try {
        result = await loadSamplePapers(assignmentId);
      } catch (error) {
        // Next's own signals go back to Next; anything else means the server was out of reach.
        unstable_rethrow(error);
        toast.error("Couldn't reach the server", { description: "Check your connection and try again." });
        return;
      }
      if (result.ok) {
        toast.success(`Added ${pluralize(result.count, "sample paper")}`, {
          description: "Run the AI first pass to grade them.",
        });
      } else {
        toast.error(result.error);
      }
    });
  }

  return { load, pending };
}

export function LoadSamplesButton({
  assignmentId,
  disabled = false,
  variant = "outline",
}: {
  assignmentId: string;
  disabled?: boolean;
  variant?: "outline" | "secondary" | "tonal";
}) {
  const { load, pending } = useLoadSamples(assignmentId);
  return (
    <Button type="button" variant={variant} onClick={load} disabled={disabled || pending}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <FlaskConical aria-hidden />}
      {pending ? "Adding papers…" : "Load sample papers (demo)"}
    </Button>
  );
}
