"use client";

import { useId } from "react";
import { CheckCheck, CornerUpLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AutosaveStatus } from "@/components/review/autosave-status";
import type { SaveState } from "@/components/review/use-review-drafts";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

type ActionBarProps = {
  saveState: SaveState;
  onRetrySave: () => void;
  onSendBack: () => void;
  onApprove: () => void;
  /** Why approval is blocked (missing or invalid scores), or null. */
  blockedReason: string | null;
  busy: boolean;
};

function ApproveButton({
  blockedReason,
  busy,
  onApprove,
  showKbd,
  className,
}: {
  blockedReason: string | null;
  busy: boolean;
  onApprove: () => void;
  showKbd: boolean;
  className?: string;
}) {
  const reasonId = useId();
  // data-review-approve marks the focusable control (the button, or the
  // tooltip wrapper while blocked): the workspace returns focus to it after
  // a dialog closes on a handled paper.
  const button = (
    <Button
      type="button"
      onClick={onApprove}
      disabled={busy || blockedReason !== null}
      aria-describedby={blockedReason ? reasonId : undefined}
      data-review-approve={blockedReason ? undefined : ""}
      className={blockedReason ? "h-full w-full" : className}
    >
      <CheckCheck aria-hidden className="max-sm:hidden" />
      Approve &amp; publish
      {showKbd ? (
        <Kbd
          aria-hidden
          className="hidden border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground shadow-none xl:inline-flex"
        >
          A
        </Kbd>
      ) : null}
    </Button>
  );

  if (!blockedReason) return button;

  // A disabled button gets no pointer events, so the tooltip lives on a wrapper.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          data-review-approve=""
          className={cn(
            "inline-flex rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
            className
          )}
        >
          {button}
          <span id={reasonId} className="sr-only">
            {blockedReason}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{blockedReason}</TooltipContent>
    </Tooltip>
  );
}

/** Desktop footer pinned under the rubric. */
export function DesktopActionBar({
  saveState,
  onRetrySave,
  onSendBack,
  onApprove,
  blockedReason,
  busy,
}: ActionBarProps) {
  return (
    // From xl (1280px) the save status takes only the room the buttons leave
    // and truncates, so the footer stays one row. Narrower, it wraps above.
    <div className="hidden shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-card px-4 py-3 lg:flex xl:px-6">
      <AutosaveStatus state={saveState} onRetry={onRetrySave} className="min-w-0 flex-1 basis-32 xl:basis-0" />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button type="button" variant="outline" onClick={onSendBack} disabled={busy}>
          <CornerUpLeft aria-hidden />
          Send back
          <Kbd aria-hidden className="hidden xl:inline-flex">
            S
          </Kbd>
        </Button>
        <ApproveButton blockedReason={blockedReason} busy={busy} onApprove={onApprove} showKbd />
      </div>
    </div>
  );
}

/** Phone and tablet: sticky bottom bar, visible on both the Paper and Rubric tabs. */
export function MobileActionBar({
  saveState,
  onRetrySave,
  onSendBack,
  onApprove,
  blockedReason,
  busy,
  total,
  maxTotal,
}: ActionBarProps & { total: number | null; maxTotal: number }) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-border bg-card/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="tabular text-sm font-semibold text-foreground">
          {formatPoints(total)}
          <span className="font-medium text-muted-foreground"> / {formatPoints(maxTotal)}</span>
          <span className="sr-only"> points</span>
        </p>
        <AutosaveStatus state={saveState} onRetry={onRetrySave} className="flex justify-end" />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onSendBack} disabled={busy} className="h-10 flex-1">
          <CornerUpLeft aria-hidden className="max-sm:hidden" />
          Send back
        </Button>
        <ApproveButton
          blockedReason={blockedReason}
          busy={busy}
          onApprove={onApprove}
          showKbd={false}
          className="h-10 flex-[1.4]"
        />
      </div>
    </div>
  );
}
