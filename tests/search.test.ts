import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { actionsFor, GOAL_PLANNER_HREF, indexItems, pagesFor } from "@/lib/search/catalog";
import {
  canBeRecent,
  countResults,
  highlight,
  matchScore,
  normalize,
  parseRecent,
  pushRecent,
  searchGroups,
} from "@/lib/search/rank";
import { buildSearchIndex, MAX_SEARCH_STUDENTS } from "@/lib/search/scope";
import { modifierLabel, paletteShortcut } from "@/lib/search/shortcut";
import type { SearchItem } from "@/lib/search/types";

// --- Fixtures (synthetic) -------------------------------------------------------

const CLASSES = [
  { id: "c-eng", name: "English 10", section: "Period 2", subject: "English Language Arts" },
  { id: "c-env", name: "Environmental Science", section: "Period 4", subject: "Science" },
];

const ASSIGNMENTS = [
  { id: "a-1", title: "Persuasive Essay: Should Our School Adopt a Four-Day Week?", classId: "c-eng", kind: "ESSAY", dueDate: new Date("2026-10-29T12:00:00Z") },
  { id: "a-2", title: "Lab Report: Testing Water Quality in Willow Creek", classId: "c-env", kind: "ESSAY", dueDate: null },
  { id: "a-3", title: "Unit 2 Quiz: The Water Cycle", classId: "c-env", kind: "TEST", dueDate: "2026-10-16T12:00:00Z" },
];

const STUDENTS = [
  { id: "s-ava", name: "Ava Quillon", classId: "c-eng" },
  { id: "s-ava", name: "Ava Quillon", classId: "c-env" },
  { id: "s-milo", name: "Milo Brightwater", classId: "c-env" },
];

function teacherItems(): SearchItem[] {
  const index = buildSearchIndex("TEACHER", { classes: CLASSES, assignments: ASSIGNMENTS, students: STUDENTS });
  return [
    ...indexItems(index),
    ...pagesFor("TEACHER"),
    ...actionsFor("TEACHER", index.classes, { theme: "system", resolvedTheme: "light" }),
  ];
}

// --- Scoping ------------------------------------------------------------------------

describe("search index scoping", () => {
  it("keeps only rows tied to the viewer's own classes", () => {
    const index = buildSearchIndex("TEACHER", {
      classes: CLASSES,
      assignments: [...ASSIGNMENTS, { id: "a-x", title: "Someone else's quiz", classId: "c-other", kind: "TEST", dueDate: null }],
      students: [...STUDENTS, { id: "s-x", name: "Not In Your Class", classId: "c-other" }],
    });
    assert.deepEqual(
      index.assignments.map((a) => a.id),
      ["a-1", "a-2", "a-3"]
    );
    assert.ok(!index.students.some((s) => s.id === "s-x"));
    assert.equal(index.assignments[0].className, "English 10");
  });

  it("never gives a student other students, whatever the rows hold", () => {
    const index = buildSearchIndex("STUDENT", { classes: CLASSES, assignments: ASSIGNMENTS, students: STUDENTS });
    assert.deepEqual(index.students, []);
    assert.equal(indexItems(index).filter((item) => item.kind === "student").length, 0);
  });

  it("copies only whitelisted fields (no emails, scores or drafts)", () => {
    const leaky = {
      classes: [{ ...CLASSES[0], teacherId: "t-1", joinCode: "SECRET" }],
      assignments: [{ ...ASSIGNMENTS[0], instructions: "Answer key: 42", aiGrade: { score: 9 } }],
      students: [{ ...STUDENTS[0], email: "ava.quillon@students.gradesmart.example", score: 14 }],
    };
    const json = JSON.stringify(buildSearchIndex("TEACHER", leaky));
    for (const secret of ["SECRET", "Answer key", "aiGrade", "@", "score", "teacherId", "instructions"]) {
      assert.ok(!json.includes(secret), `index leaked ${secret}`);
    }
  });

  it("dedupes rows, normalizes kinds and dates, and caps students", () => {
    const index = buildSearchIndex("TEACHER", {
      classes: [...CLASSES, CLASSES[0]],
      assignments: [ASSIGNMENTS[2], ASSIGNMENTS[2], { ...ASSIGNMENTS[1], kind: "WEIRD", dueDate: "not a date" }],
      students: Array.from({ length: MAX_SEARCH_STUDENTS + 20 }, (_, i) => ({ id: `s-${i}`, name: `Student ${i}`, classId: "c-eng" })),
    });
    assert.equal(index.classes.length, 2);
    assert.equal(index.assignments.length, 2);
    assert.equal(index.assignments[0].kind, "TEST");
    assert.equal(index.assignments[0].dueDate, "2026-10-16T12:00:00.000Z");
    assert.equal(index.assignments[1].kind, "ESSAY");
    assert.equal(index.assignments[1].dueDate, null);
    assert.equal(index.students.length, MAX_SEARCH_STUDENTS);
  });

  it("links each result to the role's own routes", () => {
    const teacher = indexItems(buildSearchIndex("TEACHER", { classes: CLASSES, assignments: ASSIGNMENTS, students: STUDENTS }));
    assert.equal(teacher.find((i) => i.key === "class:c-eng")?.href, "/classes/c-eng");
    assert.equal(teacher.find((i) => i.key === "assignment:a-3")?.href, "/assignments/a-3");
    assert.equal(teacher.find((i) => i.key === "student:s-milo:c-env")?.href, "/classes/c-env/students/s-milo");
    // A student in two of the teacher's classes is listed once per class, with distinct keys.
    assert.equal(teacher.filter((i) => i.title === "Ava Quillon").length, 2);

    const student = indexItems(buildSearchIndex("STUDENT", { classes: CLASSES, assignments: ASSIGNMENTS }));
    assert.equal(student.find((i) => i.key === "class:c-env")?.href, "/student/classes/c-env");
    assert.equal(student.find((i) => i.key === "assignment:a-1")?.href, "/student/assignments/a-1");
  });
});

// --- Catalog ------------------------------------------------------------------------

describe("pages and actions", () => {
  it("give each role its own pages", () => {
    assert.deepEqual(
      pagesFor("TEACHER").map((p) => p.href),
      ["/dashboard", "/classes", "/review", "/gradebook", "/insights"]
    );
    assert.deepEqual(
      pagesFor("STUDENT").map((p) => p.href),
      ["/student", "/student/todo", "/student/classes", GOAL_PLANNER_HREF]
    );
  });

  it("offer create actions per class to teachers only", () => {
    const teacher = actionsFor("TEACHER", CLASSES, { theme: "system", resolvedTheme: "light" });
    assert.ok(teacher.some((a) => a.title === "Create assignment in English 10" && a.href === "/classes/c-eng/assignments/new"));
    assert.ok(teacher.some((a) => a.href === "/classes/c-env/assignments/new?kind=TEST"));
    assert.ok(teacher.some((a) => a.title === "Open Paper Scanner"));
    const student = actionsFor("STUDENT", CLASSES, { theme: "system", resolvedTheme: "light" });
    assert.ok(!student.some((a) => a.href?.includes("/assignments/new") || a.href === "/scan"));
  });

  it("offer the other theme, and the device theme once one is chosen", () => {
    const light = actionsFor("STUDENT", [], { theme: "system", resolvedTheme: "light" });
    assert.ok(light.some((a) => a.title === "Switch to dark theme" && a.command?.type === "theme"));
    assert.ok(!light.some((a) => a.key === "action:theme-system"));
    const dark = actionsFor("STUDENT", [], { theme: "dark", resolvedTheme: "dark" });
    assert.ok(dark.some((a) => a.title === "Switch to light theme"));
    assert.ok(dark.some((a) => a.key === "action:theme-system"));
    assert.ok(dark.some((a) => a.title === "Customize" && a.command?.type === "customize"));
  });

  it("uses no AI wording in result names", () => {
    for (const item of teacherItems()) assert.doesNotMatch(item.title, /\b(AI|magic|smart)\b/i);
  });
});

// --- Matching and ranking --------------------------------------------------------------

describe("matching and ranking", () => {
  it("normalizes case, accents and punctuation", () => {
    assert.equal(normalize("  Lab Report: Testing — Café!  "), "lab report testing cafe");
  });

  it("requires every query word to match", () => {
    const item = { title: "Unit 2 Quiz: The Water Cycle", subtitle: "Environmental Science" };
    assert.ok(matchScore("water quiz", item) > 0);
    assert.ok(matchScore("water environmental", item) > 0);
    assert.equal(matchScore("water essay", item), 0);
    assert.equal(matchScore("", item), 0);
  });

  it("ranks exact, then prefix, then word starts, then text inside words", () => {
    const exact = matchScore("gradebook", { title: "Gradebook" });
    const prefix = matchScore("grade", { title: "Gradebook" });
    const wordStart = matchScore("book", { title: "Grade book report" });
    const inside = matchScore("book", { title: "Gradebook" });
    const secondaryOnly = matchScore("science", { title: "Lab Report", subtitle: "Environmental Science" });
    assert.ok(exact > prefix && prefix > wordStart && wordStart > inside && inside > secondaryOnly && secondaryOnly > 0);
  });

  it("matches a class by its initials", () => {
    assert.ok(matchScore("es", { title: "Environmental Science" }) > 0);
    assert.equal(matchScore("xz", { title: "Environmental Science" }), 0);
  });

  it("doesn't match single letters inside words", () => {
    assert.equal(matchScore("e", { title: "Gradebook" }), 0);
    assert.ok(matchScore("g", { title: "Gradebook" }) > 0);
  });

  it("groups results by kind and puts the best group first", () => {
    const groups = searchGroups(teacherItems(), "water");
    assert.equal(groups[0].id, "assignment");
    // Equal matches keep the index's order.
    assert.deepEqual(
      groups[0].items.map((i) => i.key),
      ["assignment:a-2", "assignment:a-3"]
    );
    const students = searchGroups(teacherItems(), "ava");
    assert.equal(students[0].id, "student");
    assert.equal(students[0].items.length, 2);
    const theme = searchGroups(teacherItems(), "dark");
    assert.equal(theme[0].id, "action");
    assert.equal(theme[0].items[0].title, "Switch to dark theme");
  });

  it("lists each item once, with unique keys", () => {
    for (const query of ["", "e", "english", "create", "ava"]) {
      const keys = searchGroups(teacherItems(), query, { recent: ["class:c-eng", "page:review"] }).flatMap((g) =>
        g.items.map((i) => i.key)
      );
      assert.equal(new Set(keys).size, keys.length, `duplicate keys for "${query}"`);
    }
  });

  it("keeps the class order for equal matches", () => {
    const groups = searchGroups(teacherItems(), "create assignment");
    assert.deepEqual(
      groups[0].items.map((i) => i.title),
      ["Create assignment in English 10", "Create assignment in Environmental Science"]
    );
  });

  it("caps results per group", () => {
    const many: SearchItem[] = Array.from({ length: 30 }, (_, i) => ({
      key: `assignment:${i}`,
      kind: "assignment",
      title: `Reading log ${i}`,
    }));
    const groups = searchGroups(many, "reading");
    assert.equal(countResults(groups), 8);
  });

  it("shows recent items, classes, pages and suggested actions before typing", () => {
    const groups = searchGroups(teacherItems(), "", { recent: ["assignment:a-2", "action:theme", "assignment:gone"] });
    assert.deepEqual(
      groups.map((g) => g.id),
      ["recent", "class", "page", "action"]
    );
    // Commands and ids no longer in the index never show as recent.
    assert.deepEqual(
      groups[0].items.map((i) => i.key),
      ["assignment:a-2"]
    );
    assert.ok(groups[3].items.every((i) => i.suggested));
    assert.ok(!groups[3].items.some((i) => i.title.startsWith("Create assignment")));
  });
});

describe("recent items", () => {
  it("moves the latest to the front without duplicates", () => {
    assert.deepEqual(pushRecent(["a", "b", "c"], "b"), ["b", "a", "c"]);
    assert.deepEqual(pushRecent(["a", "b", "c", "d", "e", "f"], "g").length, 6);
  });

  it("reads stored values defensively", () => {
    assert.deepEqual(parseRecent(null), []);
    assert.deepEqual(parseRecent({ a: 1 }), []);
    assert.deepEqual(parseRecent(["a", 3, "a", "", "b"]), ["a", "b"]);
  });

  it("never remembers commands", () => {
    assert.equal(canBeRecent({ command: { type: "customize" } }), false);
    assert.equal(canBeRecent({ href: "/review" }), true);
  });
});

describe("highlight", () => {
  it("marks the matched words, preferring word starts", () => {
    assert.deepEqual(highlight("Water Cycle", "cyc"), [
      { text: "Water ", match: false },
      { text: "Cyc", match: true },
      { text: "le", match: false },
    ]);
    assert.deepEqual(
      highlight("Gradebook book", "book").map((s) => s.match),
      [false, true]
    );
  });

  it("leaves text alone without a query", () => {
    assert.deepEqual(highlight("Home", ""), [{ text: "Home", match: false }]);
  });
});

// --- Keyboard shortcut --------------------------------------------------------------

describe("palette shortcut", () => {
  const body = { tagName: "BODY", getAttribute: () => null, closest: () => null };
  const input = { tagName: "INPUT", getAttribute: () => null, closest: () => null };
  const textarea = { tagName: "TEXTAREA", getAttribute: () => null, closest: () => null };
  const editable = { tagName: "DIV", isContentEditable: true, getAttribute: () => null, closest: () => null };
  const closed = { paletteOpen: false, overlayOpen: false };

  it("opens with Ctrl+K, Cmd+K and /", () => {
    assert.equal(paletteShortcut({ key: "k", ctrlKey: true, target: body }, closed), "open");
    assert.equal(paletteShortcut({ key: "K", metaKey: true, target: body }, closed), "open");
    assert.equal(paletteShortcut({ key: "/", target: body }, closed), "open");
  });

  it("never fires while typing", () => {
    for (const target of [input, textarea, editable]) {
      assert.equal(paletteShortcut({ key: "/", target }, closed), null);
      assert.equal(paletteShortcut({ key: "k", ctrlKey: true, target }, closed), null);
    }
    // Focus in a field even when the event comes from elsewhere.
    assert.equal(paletteShortcut({ key: "/", target: body }, { ...closed, activeElement: input }), null);
  });

  it("stays out of the way of dialogs and review shortcuts", () => {
    const overlay = { paletteOpen: false, overlayOpen: true };
    assert.equal(paletteShortcut({ key: "/", target: body }, overlay), null);
    assert.equal(paletteShortcut({ key: "k", ctrlKey: true, target: body }, overlay), null);
    // Plain K is the review queue's "previous paper"; Shift+/ is "?" (shortcuts help).
    assert.equal(paletteShortcut({ key: "k", target: body }, closed), null);
    assert.equal(paletteShortcut({ key: "?", shiftKey: true, target: body }, closed), null);
    assert.equal(paletteShortcut({ key: "/", target: body, repeat: true }, closed), null);
    assert.equal(paletteShortcut({ key: "/", target: body, defaultPrevented: true }, closed), null);
    assert.equal(paletteShortcut({ key: "k", ctrlKey: true, altKey: true, target: body }, closed), null);
  });

  it("closes with Ctrl/Cmd+K and types / inside the open palette", () => {
    const open = { paletteOpen: true, overlayOpen: true, activeElement: input };
    assert.equal(paletteShortcut({ key: "k", metaKey: true, target: input }, open), "close");
    assert.equal(paletteShortcut({ key: "/", target: input }, open), null);
  });

  it("labels the modifier per platform", () => {
    assert.equal(modifierLabel("MacIntel"), "⌘");
    assert.equal(modifierLabel("iPhone"), "⌘");
    assert.equal(modifierLabel("Win32"), "Ctrl");
    assert.equal(modifierLabel(undefined), "Ctrl");
  });
});
