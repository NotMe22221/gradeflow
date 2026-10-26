"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, CircleCheck, Inbox, MousePointerClick, PartyPopper } from "lucide-react";
import { toast } from "sonner";

import { logStudySession } from "@/app/(student)/student/actions";
import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { EmptyState } from "@/components/empty-state";
import type { InboxRow as InboxRowData } from "@/components/student/inbox-model";
import { InboxPanel } from "@/components/student/inbox-panel";
import { usePlannerBridge } from "@/components/student/planner-bridge";
import {
  defaultTodoTab,
  scoreText,
  TODO_TABS,
  todoCounts,
  todoSortKey,
  todoTabFor,
  WORK_TONE_CLASS,
  workStatus,
  type TodoTab,
} from "@/components/student/todo-model";
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/components/student/underline-tabs";
import { useMediaQuery } from "@/components/student/use-media-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

const EMPTY_COPY: Record<TodoTab, { icon: typeof Inbox; title: string; description: string }> = {
  assigned: {
    icon: CircleCheck,
    title: "No work assigned right now.",
    description: "New work from your teachers shows up here.",
  },
  missing: {
    icon: PartyPopper,
    title: "Nothing missing. Nice work.",
    description: "Work you haven't turned in by its due date shows up here.",
  },
  done: {
    icon: Inbox,
    title: "Nothing turned in yet.",
    description: "Work you turn in, and grades your teacher returns, show up here.",
  },
};

/** Below this many rows the list ends with a summary footer (desktop), so it fills its pane. */
const FOOTER_MAX_ROWS = 5;

/** The end-of-list line for each tab. */
const END_OF_LIST: Record<TodoTab, string> = {
  assigned: "That’s all your assigned work.",
  missing: "That’s all your missing work.",
  done: "That’s everything you’ve turned in.",
};

function rowsFor(rows: readonly InboxRowData[], tab: TodoTab): InboxRowData[] {
  return rows
    .filter((row) => todoTabFor(row) === tab)
    .sort((a, b) => todoSortKey(a, tab) - todoSortKey(b, tab) || a.title.localeCompare(b.title));
}

/**
 * Modular assignment inbox: the student's work on the left, filtered by
 * Classroom's To-do tabs (Assigned / Missing / Done), and quick-launch actions
 * for the selected assignment on the right. On phones the actions open in a
 * bottom sheet.
 */
export function AssignmentInbox({
  rows,
  summary,
  studyLoggedToday: initialStudyLogged,
}: {
  rows: InboxRowData[];
  /** One plain line about what's waiting on the student. */
  summary?: string;
  studyLoggedToday: boolean;
}) {
  const router = useRouter();
  const bridge = usePlannerBridge();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [tab, setTab] = useState<TodoTab>(() => defaultTodoTab(rows));
  const [picked, setPicked] = useState<Partial<Record<TodoTab, string>>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [studyLogged, setStudyLogged] = useState(initialStudyLogged);
  const [studyPending, startStudy] = useTransition();

  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const tabRefs = useRef(new Map<TodoTab, HTMLButtonElement>());
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const keepFocusOnClose = useRef(false);

  const counts = useMemo(() => todoCounts(rows), [rows]);
  const tabRows = useMemo(() => rowsFor(rows, tab), [rows, tab]);
  const pickedId = picked[tab];
  const selected = tabRows.find((row) => row.id === pickedId) ?? tabRows[0] ?? null;

  /** From the end-of-list footer: switch tabs and keep focus on the tab that's now showing. */
  function showTab(next: TodoTab) {
    setTab(next);
    // The footer button is about to unmount; the tab is always there.
    tabRefs.current.get(next)?.focus();
  }

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
    <section aria-labelledby="inbox-heading" className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <h2 id="inbox-heading" className="text-base font-semibold text-foreground">
            Assignment inbox
          </h2>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
            {summary ?? "Pick an assignment for quick actions."}
          </p>
        </div>
        <Button asChild variant="text" size="sm" className="-mr-2 h-10 shrink-0">
          <Link href="/student/todo">View all</Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as TodoTab)} className="gap-0">
        <div className="mt-2 border-b border-border px-2 sm:px-3">
          <UnderlineTabsList aria-label="Filter your work">
            {TODO_TABS.map((item) => (
              <UnderlineTabsTrigger
                key={item.value}
                ref={(element: HTMLButtonElement | null) => {
                  if (element) tabRefs.current.set(item.value, element);
                  else tabRefs.current.delete(item.value);
                }}
                value={item.value}
                count={counts[item.value]}
              >
                {item.label}
              </UnderlineTabsTrigger>
            ))}
          </UnderlineTabsList>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
          {/* The list column is as tall as the quick-actions pane; a short list ends with a footer that fills it. */}
          <div className="flex min-w-0 flex-col">
            {TODO_TABS.map((item) => (
              <TabsContent
                key={item.value}
                value={item.value}
                className="min-w-0 data-[state=active]:flex data-[state=active]:flex-col"
              >
                {item.value !== tab ? null : tabRows.length === 0 ? (
                  <EmptyState
                    icon={EMPTY_COPY[item.value].icon}
                    title={EMPTY_COPY[item.value].title}
                    description={EMPTY_COPY[item.value].description}
                    className="flex-1 border-0 bg-transparent py-12"
                  />
                ) : (
                  <>
                    <ul
                      className="divide-y divide-border lg:max-h-[32rem] lg:overflow-y-auto"
                      aria-label={`${item.label} work`}
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
                    {tabRows.length < FOOTER_MAX_ROWS ? (
                      <div className="hidden flex-1 flex-col items-center justify-center gap-3 border-t border-border bg-secondary/40 px-6 py-8 text-center lg:flex">
                        <p className="text-sm text-muted-foreground">{END_OF_LIST[item.value]}</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {TODO_TABS.filter((other) => other.value !== item.value && counts[other.value] > 0).map(
                            (other) => (
                              <Button
                                key={other.value}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => showTab(other.value)}
                              >
                                Show {other.label.toLowerCase()}
                                <span className="tabular text-muted-foreground">{counts[other.value]}</span>
                              </Button>
                            )
                          )}
                          <Button asChild variant="text" size="sm">
                            <Link href={item.value === "assigned" ? "/student/todo" : `/student/todo?tab=${item.value}`}>
                              Open To-do
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </TabsContent>
            ))}
          </div>

          <section aria-label="Quick actions" className="hidden min-w-0 border-l border-border p-6 lg:block">
            {selected ? (
              <InboxPanel key={selected.id} row={selected} headingRef={panelHeadingRef} {...panelProps} />
            ) : (
              <EmptyState
                icon={MousePointerClick}
                title="Quick actions show up here."
                description="Choose an assignment to turn it in, plan your grade, or log a study session."
                className="h-full border-0 bg-transparent"
              />
            )}
          </section>
        </div>
      </Tabs>

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
                <SheetTitle className="text-base leading-snug font-medium text-balance break-words">
                  {selected.title}
                </SheetTitle>
                <SheetDescription className="tabular">
                  {selected.className} · {selected.dueText}
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
  row: InboxRowData;
  active: boolean;
  onActivate: () => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
}) {
  const status = workStatus(row);
  const score = scoreText(row);
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onActivate}
      aria-current={active ? "true" : undefined}
      tabIndex={active ? 0 : -1}
      className={cn(
        "group flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset sm:px-5",
        active ? "bg-primary-soft/45" : "hover:bg-foreground/[0.04]"
      )}
    >
      <AssignmentIcon
        isTest={row.kind === "TEST"}
        color={classTheme({ name: row.className }).color}
        className="size-9 [&_svg]:size-[18px]"
      />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-medium break-words text-pretty text-foreground">{row.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {row.className}
          <span aria-hidden> · </span>
          <span className={cn("tabular", row.pastDue && "font-medium text-danger")}>{row.dueText}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        {score ? (
          <span className="tabular text-sm font-medium text-foreground">
            <span className="sr-only">Score: </span>
            {score}
          </span>
        ) : null}
        <span className={cn("text-xs font-medium", WORK_TONE_CLASS[status.tone])}>{status.label}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/70 lg:hidden" aria-hidden />
    </button>
  );
}
