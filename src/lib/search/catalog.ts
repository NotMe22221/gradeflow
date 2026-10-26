// What the command palette can find: the viewer's classes, assignments and
// (teachers) students from the search index, plus the pages and actions for
// their role. Pure: the palette maps icons and runs commands.

import type { SearchIndex, SearchItem, SearchRole } from "@/lib/search/types";

/** The search field's name and placeholder, per role. */
export const SEARCH_LABELS: Record<SearchRole, string> = {
  TEACHER: "Search classes, assignments, students",
  STUDENT: "Search classes and assignments",
};

/** Where each kind of result lives, per role. */
export const SEARCH_HREFS = {
  TEACHER: {
    class: (id: string) => `/classes/${id}`,
    assignment: (id: string) => `/assignments/${id}`,
    student: (id: string, classId: string) => `/classes/${classId}/students/${id}`,
  },
  STUDENT: {
    class: (id: string) => `/student/classes/${id}`,
    assignment: (id: string) => `/student/assignments/${id}`,
  },
} as const;

/** The student goal planner is a section of Home (see GoalPlanner's id). */
export const GOAL_PLANNER_HREF = "/student#goal-planner";

/** Pages, in the order the navigation shows them. */
export function pagesFor(role: SearchRole): SearchItem[] {
  if (role === "TEACHER") {
    return [
      { key: "page:home", kind: "page", title: "Home", href: "/dashboard", icon: "home", keywords: ["dashboard", "start"] },
      { key: "page:classes", kind: "page", title: "Classes", href: "/classes", icon: "classes", keywords: ["teaching", "all classes"] },
      {
        key: "page:review",
        kind: "page",
        title: "To review",
        href: "/review",
        icon: "review",
        keywords: ["grading", "drafts", "approve", "queue", "papers", "suggested scores"],
      },
      {
        key: "page:gradebook",
        kind: "page",
        title: "Gradebook",
        href: "/gradebook",
        icon: "gradebook",
        keywords: ["grades", "scores", "marks", "export", "csv"],
      },
      {
        key: "page:insights",
        kind: "page",
        title: "Insights",
        href: "/insights",
        icon: "insights",
        keywords: ["heatmap", "most missed", "conference briefs", "trends"],
      },
    ];
  }
  return [
    { key: "page:home", kind: "page", title: "Home", href: "/student", icon: "home", keywords: ["start", "inbox", "streak"] },
    {
      key: "page:todo",
      kind: "page",
      title: "To-do",
      href: "/student/todo",
      icon: "todo",
      keywords: ["todo", "assigned", "missing", "done", "due", "homework"],
    },
    { key: "page:classes", kind: "page", title: "Classes", href: "/student/classes", icon: "classes", keywords: ["enrolled", "all classes"] },
    {
      key: "page:goals",
      kind: "page",
      title: "Goal planner",
      href: GOAL_PLANNER_HREF,
      icon: "goals",
      keywords: ["goals", "plan", "target grade"],
    },
  ];
}

/**
 * Actions for the role. `resolvedTheme` is what the page shows now, so the
 * theme action always offers the other one; `theme` is the saved setting.
 */
export function actionsFor(
  role: SearchRole,
  classes: readonly { id: string; name: string }[],
  { theme, resolvedTheme }: { theme: "system" | "light" | "dark"; resolvedTheme: "light" | "dark" }
): SearchItem[] {
  const actions: SearchItem[] = [];
  if (role === "TEACHER") {
    actions.push({
      key: "action:scanner",
      kind: "action",
      title: "Open Paper Scanner",
      href: "/scan",
      icon: "scanner",
      suggested: true,
      keywords: ["scan", "camera", "photo", "handwritten test", "paper"],
    });
    for (const klass of classes) {
      actions.push({
        key: `action:create:${klass.id}`,
        kind: "action",
        title: `Create assignment in ${klass.name}`,
        href: `/classes/${klass.id}/assignments/new`,
        icon: "create",
        keywords: ["new assignment", "essay", "rubric", "add"],
      });
      actions.push({
        key: `action:create-test:${klass.id}`,
        kind: "action",
        title: `Create handwritten test in ${klass.name}`,
        href: `/classes/${klass.id}/assignments/new?kind=TEST`,
        icon: "create-test",
        keywords: ["new handwritten test", "quiz", "answer key", "paper", "add"],
      });
    }
  }

  const next = resolvedTheme === "dark" ? "light" : "dark";
  actions.push({
    key: "action:theme",
    kind: "action",
    title: `Switch to ${next} theme`,
    command: { type: "theme", theme: next },
    icon: next === "dark" ? "theme-dark" : "theme-light",
    suggested: true,
    keywords: ["dark mode", "light mode", "night", "appearance", "colors"],
  });
  if (theme !== "system") {
    actions.push({
      key: "action:theme-system",
      kind: "action",
      title: "Match my device's theme",
      command: { type: "theme", theme: "system" },
      icon: "theme-system",
      keywords: ["system theme", "automatic", "dark mode", "light mode", "appearance"],
    });
  }
  actions.push({
    key: "action:customize",
    kind: "action",
    title: "Customize",
    command: { type: "customize" },
    icon: "customize",
    suggested: true,
    keywords: ["appearance", "accent color", "text size", "font size", "density", "compact", "settings", "preferences"],
  });
  actions.push({
    key: "action:arrange",
    kind: "action",
    title: "Arrange Home",
    href: role === "TEACHER" ? "/dashboard?customize=1" : "/student?customize=1",
    icon: "arrange",
    keywords: ["move sections", "reorder", "layout", "hide sections", "dashboard"],
  });
  return actions;
}

function kindWord(kind: "ESSAY" | "TEST"): string {
  return kind === "TEST" ? "handwritten test" : "essay assignment";
}

/** Classes, assignments and students from the index, as palette items. */
export function indexItems(index: SearchIndex): SearchItem[] {
  const items: SearchItem[] = [];
  if (index.role === "TEACHER") {
    const hrefs = SEARCH_HREFS.TEACHER;
    for (const klass of index.classes) {
      items.push(classItem(klass, hrefs.class(klass.id)));
    }
    for (const assignment of index.assignments) {
      items.push(assignmentItem(assignment, hrefs.assignment(assignment.id)));
    }
    for (const student of index.students) {
      items.push({
        key: `student:${student.id}:${student.classId}`,
        kind: "student",
        title: student.name,
        subtitle: student.className,
        keywords: [student.className, "student"],
        href: hrefs.student(student.id, student.classId),
        classId: student.classId,
        className: student.className,
      });
    }
    return items;
  }
  const hrefs = SEARCH_HREFS.STUDENT;
  for (const klass of index.classes) items.push(classItem(klass, hrefs.class(klass.id)));
  for (const assignment of index.assignments) items.push(assignmentItem(assignment, hrefs.assignment(assignment.id)));
  return items;
}

function classItem(klass: SearchIndex["classes"][number], href: string): SearchItem {
  const details = [klass.section, klass.subject].filter((part): part is string => Boolean(part));
  return {
    key: `class:${klass.id}`,
    kind: "class",
    title: klass.name,
    subtitle: details.join(" · ") || undefined,
    keywords: [...details, "class"],
    href,
    classId: klass.id,
    className: klass.name,
  };
}

function assignmentItem(assignment: SearchIndex["assignments"][number], href: string): SearchItem {
  return {
    key: `assignment:${assignment.id}`,
    kind: "assignment",
    title: assignment.title,
    subtitle: assignment.className,
    keywords: [assignment.className, kindWord(assignment.kind)],
    href,
    classId: assignment.classId,
    className: assignment.className,
    assignmentKind: assignment.kind,
    dueDate: assignment.dueDate,
  };
}
