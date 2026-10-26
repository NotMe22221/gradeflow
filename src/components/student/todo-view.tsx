"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, CircleCheck, Inbox, PartyPopper } from "@/components/icons";

import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { EmptyState } from "@/components/empty-state";
import {
  groupTodoItems,
  isTodoTab,
  TODO_TABS,
  WORK_TONE_CLASS,
  type TodoGroup,
  type TodoItem,
  type TodoTab,
} from "@/components/student/todo-model";
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/components/student/underline-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

const ALL = "all";

const EMPTY_COPY: Record<TodoTab, { icon: typeof Inbox; title: string; description: string }> = {
  assigned: {
    icon: CircleCheck,
    title: "No work assigned right now.",
    description: "New work from your teachers shows up here, sorted by due date.",
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

/**
 * Google Classroom's To-do page: Assigned / Missing / Done tabs, a class
 * filter, and the student's work grouped by due date. Every label is computed
 * on the server, so the page reads the same before and after hydration.
 *
 * The URL (?tab=…&class=…) is the only source of truth for the tab and the
 * filter. Changes write it with history.replaceState, which Next.js feeds back
 * into useSearchParams, and a link to plain /student/todo (the drawer's To-do)
 * resets the view, so the URL and what's shown never disagree.
 */
export function TodoView({ items, classes }: { items: TodoItem[]; classes: { id: string; name: string }[] }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const classParam = searchParams.get("class");
  const tab: TodoTab = isTodoTab(tabParam) ? tabParam : "assigned";
  const classId = classParam && classes.some((klass) => klass.id === classParam) ? classParam : ALL;
  const selectId = useId();

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
    <Tabs value={tab} onValueChange={(value) => syncUrl(value as TodoTab, classId)} className="gap-0">
      <div className="sticky top-16 z-30 border-b border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-2 sm:px-4 lg:px-6">
          <UnderlineTabsList aria-label="To-do">
            {TODO_TABS.map((item) => (
              <UnderlineTabsTrigger key={item.value} value={item.value} count={counts[item.value]}>
                {item.label}
              </UnderlineTabsTrigger>
            ))}
          </UnderlineTabsList>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[1.625rem] leading-tight font-medium text-foreground sm:text-[1.75rem]">To-do</h1>
          <div className="w-full sm:w-64">
            <label htmlFor={selectId} className="sr-only">
              Filter by class
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
        </div>

        {TODO_TABS.map((item) => (
          <TabsContent key={item.value} value={item.value}>
            {item.value === tab ? (
              <TabBody tab={item.value} items={visible} filtered={selectedClass?.name ?? null} />
            ) : null}
          </TabsContent>
        ))}
      </div>
    </Tabs>
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
    <div className="space-y-4">
      {groups.map((group) => (
        <TodoGroupCard key={group.key} group={group} tab={tab} />
      ))}
    </div>
  );
}

function TodoGroupCard({ group, tab }: { group: TodoGroup; tab: TodoTab }) {
  const [open, setOpen] = useState(true);
  const listId = useId();
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
        >
          <span className="font-display text-base font-medium text-foreground">{group.label}</span>
          <span className="flex items-center gap-3">
            <span className="tabular text-sm text-muted-foreground">
              {group.items.length}
              <span className="sr-only"> {group.items.length === 1 ? "assignment" : "assignments"}</span>
            </span>
            <ChevronDown
              className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")}
              aria-hidden
            />
          </span>
        </button>
      </h2>
      <ul id={listId} hidden={!open} className="divide-y divide-border border-t border-border">
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
  const showStatus = !IMPLIED[tab].includes(item.status.label);
  return (
    <Link
      href={`/student/assignments/${encodeURIComponent(item.id)}`}
      className="group flex min-h-[72px] items-center gap-4 px-4 py-3 transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
    >
      <AssignmentIcon isTest={item.isTest} color={classTheme({ name: item.className }).color} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-medium break-words text-pretty text-foreground group-hover:underline">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {item.className}
          {item.note ? <span className="max-sm:hidden"> · {item.note}</span> : null}
        </span>
      </span>
      <span className="flex max-w-[45%] shrink-0 flex-col items-end gap-0.5 text-right">
        {tab === "done" && item.score ? (
          <span className="tabular text-sm font-medium text-foreground">
            <span className="sr-only">Score: </span>
            {item.score}
          </span>
        ) : (
          <span
            className={cn("tabular text-xs", tab === "missing" ? "font-medium text-danger" : "text-muted-foreground")}
          >
            {item.dueText}
          </span>
        )}
        {showStatus ? (
          <span className={cn("text-xs font-medium", WORK_TONE_CLASS[item.status.tone])}>{item.status.label}</span>
        ) : null}
      </span>
    </Link>
  );
}
