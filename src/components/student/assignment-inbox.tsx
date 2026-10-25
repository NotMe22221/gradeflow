"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, CircleCheck, ClipboardList, FileText, Inbox, MousePointerClick, Send } from "lucide-react";
import { toast } from "sonner";

import { logStudySession } from "@/app/(student)/student/actions";
import { EmptyState } from "@/components/empty-state";
import {
  defaultInboxTab,
  dueLabel,
  INBOX_TABS,
  inboxCounts,
  rowsForTab,
  type InboxAssignment,
  type InboxTab,
} from "@/components/student/inbox-model";
import { InboxPanel } from "@/components/student/inbox-panel";
import { usePlannerBridge } from "@/components/student/planner-bridge";
import { StudentStateBadge } from "@/components/student/student-state-badge";
import { useMediaQuery } from "@/components/student/use-media-query";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";

const EMPTY_COPY: Record<InboxTab, { icon: typeof Inbox; title: string; description: string }> = {
  todo: {
    icon: CircleCheck,
    title: "Nothing to do right now.",
    description: "New assignments from your teachers land here.",
  },
  submitted: {
    icon: Send,
    title: "No papers waiting on your teacher.",
    description: "Papers you submit wait here until your teacher approves a grade.",
  },
  graded: {
    icon: Inbox,
    title: "No grades yet.",
    description: "Grades show up here as soon as your teacher approves them.",
  },
};

/**
 * Modular assignment inbox: the student's assignments on the left (filtered
 * by To do / Submitted / Graded) and quick-launch actions for the selected
 * one on the right. On phones the actions open in a bottom sheet.
 */
export function AssignmentInbox({
  rows,
  studyLoggedToday: initialStudyLogged,
}: {
  rows: InboxAssignment[];
  studyLoggedToday: boolean;
}) {
  const router = useRouter();
  const bridge = usePlannerBridge();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [tab, setTab] = useState<InboxTab>(() => defaultInboxTab(rows));
  const [picked, setPicked] = useState<Partial<Record<InboxTab, string>>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [studyLogged, setStudyLogged] = useState(initialStudyLogged);
  const [studyPending, startStudy] = useTransition();

  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const keepFocusOnClose = useRef(false);

  const counts = useMemo(() => inboxCounts(rows), [rows]);
  const tabRows = useMemo(() => rowsForTab(rows, tab), [rows, tab]);
  const pickedId = picked[tab];
  const selected = tabRows.find((row) => row.id === pickedId) ?? tabRows[0] ?? null;

  function select(id: string) {
    setPicked((previous) => ({ ...previous, [tab]: id }));
  }

  function activate(id: string) {
    select(id);
    if (!isDesktop) setSheetOpen(true);
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    if (!selected || tabRows.length === 0) return;
    const index = tabRows.findIndex((row) => row.id === selected.id);
    let next = index;
    switch (event.key) {
      case "ArrowDown":
        next = Math.min(tabRows.length - 1, index + 1);
        break;
      case "ArrowUp":
        next = Math.max(0, index - 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = tabRows.length - 1;
        break;
      case "ArrowRight":
        // Desktop: jump into the quick-launch panel.
        if (isDesktop) {
          event.preventDefault();
          panelHeadingRef.current?.focus();
        }
        return;
      default:
        return;
    }
    event.preventDefault();
    const target = tabRows[next];
    select(target.id);
    optionRefs.current.get(target.id)?.focus();
  }

  function planFor(classId: string) {
    if (!bridge) return;
    if (sheetOpen) {
      // Let the sheet close (and release its scroll lock) before scrolling to the planner.
      keepFocusOnClose.current = true;
      setSheetOpen(false);
      window.setTimeout(() => bridge.planFor(classId), 220);
      return;
    }
    bridge.planFor(classId);
  }

  function logStudy(assignmentId: string) {
    startStudy(async () => {
      const result = await logStudySession(assignmentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setStudyLogged(true);
      if (result.xpAwarded > 0) {
        toast.success(`+${result.xpAwarded} XP. Streak safe for today.`);
        router.refresh();
      } else {
        toast("Already logged today", { description: "Your streak is safe. Come back tomorrow for more XP." });
      }
    });
  }

  const panelProps = {
    onPlan: bridge ? planFor : undefined,
    onLogStudy: logStudy,
    studyPending,
    studyLoggedToday: studyLogged,
  };

  return (
    <section aria-labelledby="inbox-heading">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:px-6">
          <h2 id="inbox-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <Inbox className="size-4 text-muted-foreground" aria-hidden />
            Assignment inbox
          </h2>
          <p className="text-sm text-muted-foreground">
            Pick an assignment to see what&apos;s next. Use the arrow keys to move through the list.
          </p>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
          <Tabs value={tab} onValueChange={(value) => setTab(value as InboxTab)} className="min-w-0 gap-0">
            <div className="px-4 pt-4 sm:px-5">
              <TabsList className="w-full" aria-label="Filter assignments">
                {INBOX_TABS.map((item) => (
                  <TabsTrigger key={item.value} value={item.value} className="gap-1.5 px-2">
                    {item.label}
                    <span
                      className={cn(
                        "tabular min-w-5 rounded-full px-1.5 text-[11px] leading-[18px] font-semibold",
                        tab === item.value ? "bg-secondary text-foreground" : "bg-background/70 text-muted-foreground"
                      )}
                    >
                      {counts[item.value]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {INBOX_TABS.map((item) => (
              <TabsContent key={item.value} value={item.value} className="min-w-0 p-2 sm:p-3">
                {item.value !== tab ? null : tabRows.length === 0 ? (
                  <EmptyState
                    icon={EMPTY_COPY[item.value].icon}
                    title={EMPTY_COPY[item.value].title}
                    description={EMPTY_COPY[item.value].description}
                    className="m-2 border-0 bg-transparent py-10"
                  />
                ) : (
                  <ul
                    className="flex flex-col gap-1 p-1 lg:max-h-[30rem] lg:overflow-y-auto"
                    aria-label={`${item.label} assignments`}
                    onKeyDown={onListKeyDown}
                  >
                    {tabRows.map((row) => (
                      <li key={row.id}>
                        <InboxRow
                          row={row}
                          active={row.id === selected?.id}
                          onActivate={() => activate(row.id)}
                          buttonRef={(element) => {
                            if (element) optionRefs.current.set(row.id, element);
                            else optionRefs.current.delete(row.id);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <section aria-label="Quick actions" className="hidden min-w-0 border-l border-border bg-muted/30 p-6 lg:block">
            {selected ? (
              <InboxPanel key={selected.id} row={selected} headingRef={panelHeadingRef} {...panelProps} />
            ) : (
              <EmptyState
                icon={MousePointerClick}
                title="Quick actions show up here."
                description="Choose an assignment to submit it, plan your grade, or log a study session."
                className="h-full border-0 bg-transparent"
              />
            )}
          </section>
        </div>
      </Card>

      <Sheet open={sheetOpen && !isDesktop && selected !== null} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="gap-0 overflow-y-auto"
          onCloseAutoFocus={(event) => {
            if (keepFocusOnClose.current) {
              keepFocusOnClose.current = false;
              event.preventDefault();
            }
          }}
        >
          {selected ? (
            <>
              <SheetHeader className="px-5 pt-5 pr-12 pb-4">
                <SheetTitle className="text-base leading-snug text-balance break-words">{selected.title}</SheetTitle>
                <SheetDescription className="tabular">
                  {selected.className} · {dueLabel(selected)}
                </SheetDescription>
              </SheetHeader>
              <div className="px-5 pb-8">
                <InboxPanel row={selected} showHeading={false} {...panelProps} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function InboxRow({
  row,
  active,
  onActivate,
  buttonRef,
}: {
  row: InboxAssignment;
  active: boolean;
  onActivate: () => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
}) {
  const Icon = row.kind === "TEST" ? ClipboardList : FileText;
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onActivate}
      aria-current={active ? "true" : undefined}
      tabIndex={active ? 0 : -1}
      className={cn(
        "group flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        active ? "bg-accent ring-1 ring-border" : "hover:bg-accent/60"
      )}
    >
      <span
        className={cn(
          "mt-0.5 hidden size-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:flex",
          active ? "bg-card text-foreground ring-border" : "bg-secondary text-muted-foreground ring-border"
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "line-clamp-2 text-sm break-words text-pretty text-foreground",
            active ? "font-semibold" : "font-medium"
          )}
        >
          {row.title}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
          {row.className}
          <span aria-hidden> · </span>
          <span className={cn("tabular", row.pastDue && "font-medium text-danger-soft-foreground")}>
            {row.pastDue ? `Overdue · ${formatDate(row.dueDate)}` : dueLabel(row)}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
        <StudentStateBadge state={row.state} />
        {row.state === "graded" && row.score ? (
          <span className="tabular text-xs font-semibold text-foreground">
            <span className="sr-only">Score: </span>
            {formatScore(row.score.total, row.score.max)}
          </span>
        ) : null}
      </span>
      <ChevronRight className="mt-1.5 size-4 shrink-0 text-muted-foreground/70 lg:hidden" aria-hidden />
    </button>
  );
}
