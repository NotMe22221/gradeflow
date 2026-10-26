"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, CircleAlert, CircleCheck, ClipboardList, Inbox } from "@/components/icons";

import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { EmptyState } from "@/components/empty-state";
import {
  groupTodoItems,
  isTodoTab,
  TODO_TABS,
  type TodoGroup,
  type TodoItem,
  type TodoTab,
} from "@/components/student/todo-model";
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/components/student/underline-tabs";
import { WorkStatusChip } from "@/components/student/work-status-chip";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

const ALL = "all";

const EMPTY_COPY: Record<TodoTab, { icon: typeof Inbox; title: string; description: string }> = {
  assigned: {
    icon: ClipboardList,
    title: "No work assigned right now.",
    description: "New work from your teachers shows up here, soonest due first.",
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

/**
 * Google Classroom's To-do page: Assigned / Missing / Done tabs, a class
 * filter, and the student's work grouped by due date, soonest first. Every
 * label is computed on the server, so the page reads the same before and
 * after hydration.
 *
 * The URL (?tab=…&class=…) is the only source of truth for the tab and the
 * filter. Changes write it with history.replaceState, which Next.js feeds back
 * into useSearchParams, and a link to plain /student/todo (the nav's To-do)
 * resets the view, so the URL and what's shown never disagree.
 */
export function TodoView({ items, classes }: { items: TodoItem[]; classes: { id: string; name: string }[] }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const classParam = searchParams.get("class");
  const tab: TodoTab = isTodoTab(tabParam) ? tabParam : "assigned";
  const classId = classParam && classes.some((klass) => klass.id === classParam) ? classParam : ALL;
  const selectId = useId();
  const tabRefs = useRef(new Map<TodoTab, HTMLButtonElement>());

  const visible = useMemo(
    () => (classId === ALL ? items : items.filter((item) => item.classId === classId)),
    [items, classId]
  );
  const counts = useMemo(() => {
    const result: Record<TodoTab, number> = { assigned: 0, missing: 0, done: 0 };
    for (const item of visible) result[item.tab]++;
    return result;
  }, [visible]);

  /** Keep the URL in step so a reload (or a shared link) opens the same view. */
  function syncUrl(nextTab: TodoTab, nextClass: string) {
    const params = new URLSearchParams();
    if (nextTab !== "assigned") params.set("tab", nextTab);
    if (nextClass !== ALL) params.set("class", nextClass);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  const selectedClass = classes.find((klass) => klass.id === classId);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-[1.625rem] leading-tight font-medium text-foreground sm:text-[1.75rem]">To-do</h1>
          <p className="mt-1 text-[0.9375rem] text-pretty text-muted-foreground">
            {selectedClass ? `Your work in ${selectedClass.name}.` : "Your work from every class, soonest due first."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-60 sm:shrink-0">
          <label htmlFor={selectId} className="text-[0.8125rem] font-medium text-muted-foreground">
            Class
          </label>
          <Select value={classId} onValueChange={(value) => syncUrl(tab, value)}>
            <SelectTrigger id={selectId} className="w-full">
              <SelectValue>{selectedClass?.name ?? "All classes"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All classes</SelectItem>
              {classes.map((klass) => (
                <SelectItem key={klass.id} value={klass.id}>
                  {klass.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(value) => syncUrl(value as TodoTab, classId)} className="mt-6 gap-0">
        {/* Sticky under the app bar, so the tabs stay in reach on a long list. */}
        <div className="sticky top-[var(--app-bar-h,4rem)] z-20 -mx-4 border-b border-border bg-background px-2 sm:mx-0 sm:px-0">
          <UnderlineTabsList aria-label="To-do">
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

        {TODO_TABS.map((item) => (
          <TabsContent key={item.value} value={item.value} className="pt-6">
            {item.value === tab ? (
              <>
                {tab !== "missing" && counts.missing > 0 ? (
                  <MissingNotice
                    count={counts.missing}
                    onShow={() => {
                      syncUrl("missing", classId);
                      // The notice is about to unmount; the Missing tab is always there.
                      tabRefs.current.get("missing")?.focus();
                    }}
                  />
                ) : null}
                <TabBody tab={item.value} items={visible} filtered={selectedClass?.name ?? null} />
              </>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/** A calm pointer to missing work from the other tabs: a word, an icon, and one way to get there. */
function MissingNotice({ count, onShow }: { count: number; onShow: () => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-secondary py-2 pr-2 pl-4">
      <CircleAlert className="size-5 shrink-0 text-danger-soft-foreground" aria-hidden />
      <p className="min-w-0 flex-1 basis-48 text-[0.875rem] text-pretty text-foreground">
        {count === 1 ? "1 assignment is missing." : `${count} assignments are missing.`}{" "}
        <span className="text-muted-foreground">You can still turn {count === 1 ? "it" : "them"} in.</span>
      </p>
      <Button type="button" variant="text" size="sm" onClick={onShow} className="h-10">
        Show missing
      </Button>
    </div>
  );
}

function TabBody({ tab, items, filtered }: { tab: TodoTab; items: TodoItem[]; filtered: string | null }) {
  const groups = groupTodoItems(items, tab);
  if (groups.length === 0) {
    const copy = EMPTY_COPY[tab];
    return (
      <EmptyState
        icon={copy.icon}
        title={copy.title}
        description={filtered ? `Showing ${filtered} only. ${copy.description}` : copy.description}
        className="rounded-xl py-14"
      />
    );
  }
  return (
    <div className="space-y-6 compact:space-y-4">
      {groups.map((group) => (
        <TodoGroupSection key={group.key} group={group} tab={tab} />
      ))}
    </div>
  );
}

function TodoGroupSection({ group, tab }: { group: TodoGroup; tab: TodoTab }) {
  const [open, setOpen] = useState(true);
  const listId = useId();
  return (
    <section>
      <h2 className="font-sans">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className="-mx-2 flex min-h-10 w-[calc(100%+1rem)] items-center gap-2 rounded-lg px-2 text-left transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <span className="font-display text-[1rem] font-medium text-foreground">{group.label}</span>
          <span className="tabular text-[0.8125rem] text-muted-foreground">
            {group.items.length}
            <span className="sr-only"> {group.items.length === 1 ? "assignment" : "assignments"}</span>
          </span>
          <ChevronDown
            className={cn(
              "ml-auto size-5 text-muted-foreground transition-transform motion-reduce:transition-none",
              !open && "-rotate-90"
            )}
            aria-hidden
          />
        </button>
      </h2>
      <ul
        id={listId}
        hidden={!open}
        className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
      >
        {group.items.map((item) => (
          <li key={item.id}>
            <TodoRow item={item} tab={tab} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Statuses a tab already implies, so the row doesn't repeat them. */
const IMPLIED: Record<TodoTab, string[]> = { assigned: ["Assigned"], missing: ["Missing"], done: [] };

function TodoRow({ item, tab }: { item: TodoItem; tab: TodoTab }) {
  // The note ("Your teacher scans this test") already says what the status would.
  const showStatus = !IMPLIED[tab].includes(item.status.label) && !item.note;
  const { due } = item;
  return (
    <Link
      href={`/student/assignments/${encodeURIComponent(item.id)}`}
      className="group flex min-h-[4.5rem] items-center gap-4 px-4 py-row transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset compact:min-h-14 sm:px-5 motion-reduce:transition-none"
    >
      <AssignmentIcon
        isTest={item.isTest}
        color={classTheme({ name: item.className }).color}
        className="compact:size-9 compact:[&_svg]:size-[1.125rem]"
      />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[0.9375rem] leading-6 font-medium break-words text-pretty text-foreground group-hover:underline">
          {item.title}
        </span>
        <span className="block text-[0.8125rem] leading-5 text-pretty text-muted-foreground">
          {item.className}
          {item.note ? <> · {item.note}</> : null}
        </span>
      </span>
      <span className="flex max-w-[45%] shrink-0 flex-col items-end gap-1 text-right">
        {tab === "done" ? (
          <>
            {item.score ? (
              <span className="tabular text-[0.9375rem] leading-5 font-semibold text-foreground">
                <span className="sr-only">Score: </span>
                {item.score}
              </span>
            ) : null}
            <WorkStatusChip status={item.status} />
          </>
        ) : (
          <>
            <span className="tabular text-[0.8125rem] leading-5 font-medium text-foreground">{due.relative}</span>
            {due.absolute ? (
              <span className="tabular text-[0.75rem] leading-4 text-muted-foreground">{due.absolute}</span>
            ) : null}
            {showStatus ? <WorkStatusChip status={item.status} className="mt-0.5" /> : null}
          </>
        )}
      </span>
    </Link>
  );
}

