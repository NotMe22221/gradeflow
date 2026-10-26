"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, CircleCheck, ClipboardList, Inbox, MousePointerClick } from "@/components/icons";
import { toast } from "sonner";

import { logStudySession } from "@/app/(student)/student/actions";
import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { EmptyState } from "@/components/empty-state";
import { SectionHeading } from "@/components/layout-editor/section-heading";
import type { InboxRow as InboxRowData } from "@/components/student/inbox-model";
import { InboxPanel } from "@/components/student/inbox-panel";
import { usePlannerBridge } from "@/components/student/planner-bridge";
import {
  defaultTodoTab,
  dueWhenText,
  scoreText,
  TODO_TABS,
  todoCounts,
  todoSortKey,
  todoTabFor,
  workStatus,
  type DueWhen,
  type TodoTab,
} from "@/components/student/todo-model";
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/components/student/underline-tabs";
import { useMediaQuery } from "@/components/student/use-media-query";
import { WorkStatusChip } from "@/components/student/work-status-chip";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

const EMPTY_COPY: Record<TodoTab, { icon: typeof Inbox; title: string; description: string }> = {
  assigned: {
    icon: ClipboardList,
    title: "No work assigned right now.",
    description: "New work from your teachers shows up here.",
  },
  missing: {
    icon: CircleCheck,
    title: "Nothing missing. Nice work.",
    description: "Work you haven't turned in by its due date shows up here.",
  },
  done: {
    icon: Inbox,
    title: "Nothing turned in yet.",
    description: "Work you turn in, and grades your teacher returns, show up here.",
  },
};

/** Below this many rows the list ends with a short summary (split view), so it fills its pane. */
const FOOTER_MAX_ROWS = 5;

/** The end-of-list line for each tab. */
const END_OF_LIST: Record<TodoTab, string> = {
  assigned: "That’s all your assigned work.",
  missing: "That’s all your missing work.",
  done: "That’s everything you’ve turned in.",
};

/** Statuses a tab already implies, so a row doesn't repeat them. */
const IMPLIED: Record<TodoTab, string[]> = { assigned: ["Assigned"], missing: ["Missing"], done: [] };

function rowsFor(rows: readonly InboxRowData[], tab: TodoTab): InboxRowData[] {
  return rows
    .filter((row) => todoTabFor(row) === tab)
    .sort((a, b) => todoSortKey(a, tab) - todoSortKey(b, tab) || a.title.localeCompare(b.title));
}

/** The row's due date said two ways, or its relative label alone for older callers. */
export function inboxDue(row: Pick<InboxRowData, "due" | "dueText">): DueWhen {
  return row.due ?? { relative: row.dueText, absolute: null };
}

/**
 * Modular assignment inbox: the student's work filtered by Classroom's
 * To-do tabs (Assigned / Missing / Done), and quick actions for the selected
 * assignment beside it. The split view depends on the inbox's own width (a
 * container query), not the window's, so it adapts wherever the student puts
 * it on Home. Without room for the split, a row opens its actions in a sheet:
 * from the bottom on phones, from the side on wider screens.
 */
export function AssignmentInbox({
  rows,
  summary,
  studyLoggedToday: initialStudyLogged,
}: {
  rows: InboxRowData[];
  /** One plain line under the title; defaults to what the inbox is for. */
  summary?: string;
  studyLoggedToday: boolean;
}) {
  const router = useRouter();
  const bridge = usePlannerBridge();
  // "Plan my grade" only while the goal planner is on Home to receive it (it can be hidden).
  const canPlan = Boolean(bridge?.available);
  const wideWindow = useMediaQuery("(min-width: 768px)");
  const headingId = useId();

  const [tab, setTab] = useState<TodoTab>(() => defaultTodoTab(rows));
  const [picked, setPicked] = useState<Partial<Record<TodoTab, string>>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [studyLogged, setStudyLogged] = useState(initialStudyLogged);
  const [studyPending, startStudy] = useTransition();

  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const tabRefs = useRef(new Map<TodoTab, HTMLButtonElement>());
  const panelRef = useRef<HTMLElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const keepFocusOnClose = useRef(false);

  const counts = useMemo(() => todoCounts(rows), [rows]);
  const tabRows = useMemo(() => rowsFor(rows, tab), [rows, tab]);
  const pickedId = picked[tab];
  const selected = tabRows.find((row) => row.id === pickedId) ?? tabRows[0] ?? null;

  /** Whether the side-by-side actions pane is showing (CSS decides, from the inbox's width). */
  function panelShown(): boolean {
    return (panelRef.current?.getClientRects().length ?? 0) > 0;
  }

  /** From the end-of-list summary: switch tabs and keep focus on the tab that's now showing. */
  function showTab(next: TodoTab) {
    setTab(next);
    // The summary's button is about to unmount; the tab is always there.
    tabRefs.current.get(next)?.focus();
  }

  function select(id: string) {
    setPicked((previous) => ({ ...previous, [tab]: id }));
  }

  function activate(id: string) {
    select(id);
    if (!panelShown()) setSheetOpen(true);
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
        // Split view: jump into the quick actions.
        if (panelShown()) {
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
    if (!bridge || !canPlan) return;
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
    onPlan: canPlan ? planFor : undefined,
    onLogStudy: logStudy,
    studyPending,
    studyLoggedToday: studyLogged,
  };

  return (
    <section aria-labelledby={headingId} className="@container/inbox min-w-0">
      <SectionHeading
        id={headingId}
        title="Assignment inbox"
        description={
          summary ??
          (canPlan
            ? "Choose an assignment to open it, plan your grade, or log a study session."
            : "Choose an assignment to open it or log a study session.")
        }
        action={{ href: "/student/todo", label: "Open To-do" }}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Tabs value={tab} onValueChange={(value) => setTab(value as TodoTab)} className="gap-0">
          <div className="border-b border-border px-2 sm:px-3">
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
                  countTone={item.value === "missing" ? "attention" : "neutral"}
                >
                  {item.label}
                </UnderlineTabsTrigger>
              ))}
            </UnderlineTabsList>
          </div>

          <div className="grid @min-[48rem]/inbox:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
            {/* The list column is as tall as the quick-actions pane; a short list ends with a summary that fills it. */}
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
                        className="divide-y divide-border @min-[48rem]/inbox:max-h-[32rem] @min-[48rem]/inbox:overflow-y-auto"
                        aria-label={`${item.label} work`}
                        onKeyDown={onListKeyDown}
                      >
                        {tabRows.map((row) => (
                          <li key={row.id}>
                            <InboxRow
                              row={row}
                              tab={item.value}
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
                        <div className="hidden flex-1 flex-col items-center justify-center gap-2 border-t border-border px-6 py-8 text-center @min-[48rem]/inbox:flex">
                          <p className="text-[0.875rem] text-muted-foreground">{END_OF_LIST[item.value]}</p>
                          <div className="flex flex-wrap justify-center gap-1">
                            {TODO_TABS.filter((other) => other.value !== item.value && counts[other.value] > 0).map(
                              (other) => (
                                <Button
                                  key={other.value}
                                  type="button"
                                  variant="text"
                                  size="sm"
                                  className="h-10"
                                  onClick={() => showTab(other.value)}
                                >
                                  Show {other.label.toLowerCase()}
                                  <span className="tabular font-normal text-muted-foreground">{counts[other.value]}</span>
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </TabsContent>
              ))}
            </div>

            <section
              ref={panelRef}
              aria-label="Quick actions"
              className="hidden min-w-0 border-l border-border p-6 @min-[48rem]/inbox:block"
            >
              {selected ? (
                <InboxPanel key={selected.id} row={selected} headingRef={panelHeadingRef} {...panelProps} />
              ) : (
                <EmptyState
                  icon={MousePointerClick}
                  title="Quick actions show up here."
                  description={
                    canPlan
                      ? "Choose an assignment to turn it in, plan your grade, or log a study session."
                      : "Choose an assignment to turn it in or log a study session."
                  }
                  className="h-full border-0 bg-transparent"
                />
              )}
            </section>
          </div>
        </Tabs>
      </div>

      <Sheet open={sheetOpen && selected !== null} onOpenChange={setSheetOpen}>
        <SheetContent
          side={wideWindow ? "right" : "bottom"}
          className={cn("gap-0 overflow-y-auto", wideWindow && "w-full sm:max-w-md")}
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
                <SheetTitle className="text-[1.0625rem] leading-snug font-medium text-balance break-words">
                  {selected.title}
                </SheetTitle>
                <SheetDescription className="tabular">
                  {selected.className} · {dueWhenText(inboxDue(selected))}
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
  tab,
  active,
  onActivate,
  buttonRef,
}: {
  row: InboxRowData;
  tab: TodoTab;
  active: boolean;
  onActivate: () => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
}) {
  const status = workStatus(row);
  const score = scoreText(row);
  const due = inboxDue(row);
  const showStatus = !IMPLIED[tab].includes(status.label);
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onActivate}
      aria-current={active ? "true" : undefined}
      tabIndex={active ? 0 : -1}
      className={cn(
        "group relative flex min-h-16 w-full items-center gap-3 px-4 py-row text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-hidden forced-colors:focus-visible:-outline-offset-2 compact:min-h-14 sm:gap-4 sm:px-5 motion-reduce:transition-none",
        // Selection only shows in the split view, where the pane beside the list follows it.
        active
          ? "hover:bg-foreground/[0.04] @min-[48rem]/inbox:bg-primary-soft/45 @min-[48rem]/inbox:hover:bg-primary-soft/45"
          : "hover:bg-foreground/[0.04]"
      )}
    >
      {/* The selected row's marker, visible in the split view where the pane beside it changes. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2 left-0 hidden w-[3px] rounded-r-full bg-primary @min-[48rem]/inbox:block",
          !active && "opacity-0"
        )}
      />
      <AssignmentIcon
        isTest={row.kind === "TEST"}
        color={classTheme({ name: row.className }).color}
        className="size-9 [&_svg]:size-[1.125rem] compact:size-8"
      />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[0.9375rem] leading-6 font-medium break-words text-pretty text-foreground">
          {row.title}
        </span>
        <span className="block truncate text-[0.8125rem] leading-5 text-muted-foreground">{row.className}</span>
      </span>
      <span className="flex max-w-[45%] shrink-0 flex-col items-end gap-1 text-right">
        {tab === "done" ? (
          <>
            {score ? (
              <span className="tabular text-[0.9375rem] leading-5 font-semibold text-foreground">
                <span className="sr-only">Score: </span>
                {score}
              </span>
            ) : null}
            <WorkStatusChip status={status} />
          </>
        ) : (
          <>
            <span className="tabular text-[0.8125rem] leading-5 font-medium text-foreground">{due.relative}</span>
            {due.absolute ? (
              <span className="tabular text-[0.75rem] leading-4 text-muted-foreground">{due.absolute}</span>
            ) : null}
            {showStatus ? <WorkStatusChip status={status} className="mt-0.5" /> : null}
          </>
        )}
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground @min-[48rem]/inbox:hidden"
        aria-hidden
      />
    </button>
  );
}
