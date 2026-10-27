"use client";

import { ChevronDown, FlaskConical } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GRADER_LABELS } from "@/lib/constants";
import { SAMPLE_TEST_PHOTOS, type SampleTestPhoto } from "@/lib/scan/samples";
import type { ScanEngineInfo } from "@/lib/scan/types";
import { cn } from "@/lib/utils";

/** Bundled synthetic test photos, for trying the scanner without a real test. */
export function SampleMenu({
  onPick,
  disabled = false,
  engine,
  className,
}: {
  onPick: (sample: SampleTestPhoto) => void;
  disabled?: boolean;
  engine: ScanEngineInfo;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button type="button" variant="outline" disabled={disabled} className={cn("justify-between", className)}>
          <span className="inline-flex items-center gap-2">
            <FlaskConical aria-hidden />
            Use a sample photo
          </span>
          <ChevronDown className="opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Synthetic sample tests (demo)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SAMPLE_TEST_PHOTOS.map((sample) => (
          <DropdownMenuItem key={sample.id} onSelect={() => onPick(sample)} className="gap-3 py-2">
            {/* Plain <img>: a small static file from /public. */}
            <img
              src={sample.src}
              alt=""
              className="h-12 w-9 shrink-0 rounded-sm border border-border bg-muted object-cover"
            />
            <span className="min-w-0">
              <span className="block truncate font-medium text-foreground">{sample.studentName}</span>
              <span className="block truncate text-xs text-muted-foreground">{sample.assignmentTitle}</span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-xs text-pretty text-muted-foreground">
          {engine.kind !== "demo"
            ? `${GRADER_LABELS[engine.kind]} reads these like any other photo.`
            : "The demo scanner recognizes these photos and uses their stored transcriptions."}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
