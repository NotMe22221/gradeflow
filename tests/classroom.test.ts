import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { daysUntil, dueLabel, streamTime, upcomingWork } from "@/lib/classroom/due";
import { buildStream, STREAM_LIMIT, type StreamSource } from "@/lib/classroom/feed";
import { buildStudentStream } from "@/components/student/stream-model";
import {
  defaultTodoTab,
  dueSoon,
  groupTodoItems,
  relativeDue,
  todoCounts,
  todoGroupFor,
  todoTabFor,
  toTodoItem,
  workStatus,
  type StudentWorkRow,
} from "@/components/student/todo-model";

/** Local noon on a day relative to Monday, October 26, 2026 (a Monday). */
function day(offset: number, hour = 12): Date {
  return new Date(2026, 9, 26 + offset, hour);
}
const NOW = day(0, 9);

/** Due dates are stored at noon UTC on their calendar day. */
function due(offset: number): string {
  const local = day(offset);
  return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), 12)).toISOString();
}

function row(overrides: Partial<StudentWorkRow> = {}): StudentWorkRow {
  return {
    id: "a1",
    title: "Essay",
    classId: "c1",
    className: "English 10",
    kind: "ESSAY",
    dueDate: null,
    submittedAt: null,
    publishedAt: null,
    pastDue: false,
    awaitingScan: false,
    state: "not_submitted",
    score: null,
    totalPoints: 25,
    criteria: [],
    postedAt: day(-10).toISOString(),
    returnedAt: null,
    ...overrides,
  };
}

describe("due labels", () => {
  it("counts whole calendar days", () => {
    assert.equal(daysUntil(day(0, 23), day(0, 1)), 0);
    assert.equal(daysUntil(day(1, 1), day(0, 23)), 1);
    assert.equal(daysUntil(day(-1), NOW), -1);
  });

  it("reads like Classroom", () => {
    assert.equal(dueLabel(day(0), NOW), "Due today");
    assert.equal(dueLabel(day(1), NOW), "Due tomorrow");
    assert.equal(dueLabel(day(3), NOW), "Due Thursday");
    assert.equal(dueLabel(day(3), NOW, "short"), "Due Thu");
    assert.equal(dueLabel(day(7), NOW), "Due Nov 2");
    assert.equal(dueLabel(day(-6), NOW), "Due Oct 20");
  });

  it("shows a time for today's stream items and a date otherwise", () => {
    assert.match(streamTime(day(0, 7), NOW), /7:00\sAM/);
    assert.equal(streamTime(day(-2), NOW), "Oct 24");
  });

  it("lists upcoming work soonest first, without past or undated work", () => {
    const items = [
      { title: "B", dueDate: day(5) },
      { title: "Past", dueDate: day(-1) },
      { title: "None", dueDate: null },
      { title: "A", dueDate: day(5) },
      { title: "Today", dueDate: day(0) },
      { title: "Far", dueDate: day(30) },
    ];
    assert.deepEqual(upcomingWork(items, NOW).map((item) => item.title), ["Today", "A", "B"]);
    assert.deepEqual(upcomingWork(items, NOW, { limit: 2 }).map((item) => item.title), ["Today", "A"]);
  });
});

describe("teacher class stream", () => {
  const source: StreamSource = {
    assignments: [
      { id: "essay", title: "Persuasive essay", kind: "ESSAY", createdAt: day(-10) },
      { id: "quiz", title: "Unit quiz", kind: "TEST", createdAt: day(-20) },
    ],
    published: [
      { assignmentId: "essay", publishedAt: day(-2, 9) },
      { assignmentId: "essay", publishedAt: day(-2, 15) },
      { assignmentId: "essay", publishedAt: day(-1) },
      { assignmentId: "ghost", publishedAt: day(-1) },
    ],
    scans: [
      { assignmentId: "quiz", submittedAt: day(-3, 10), studentName: "Iris" },
      { assignmentId: "quiz", submittedAt: day(-3, 11), studentName: "Rafael" },
    ],
    drafts: [
      { assignmentId: "essay", updatedAt: day(0, 8), grader: "demo" },
      { assignmentId: "essay", updatedAt: day(0, 7), grader: "claude" },
    ],
  };

  it("groups returns and scans by assignment and day, newest first", () => {
    const items = buildStream(source);
    assert.deepEqual(
      items.map((item) => item.kind),
      ["drafts", "returned", "returned", "scanned", "posted", "posted"]
    );
    const [drafts, latestReturn, earlierReturn, scanned] = items;
    assert.equal(drafts.kind === "drafts" && drafts.count, 2);
    assert.equal(drafts.kind === "drafts" && drafts.demoCount, 1);
    assert.equal(latestReturn.kind === "returned" && latestReturn.count, 1);
    assert.equal(earlierReturn.kind === "returned" && earlierReturn.count, 2);
    assert.deepEqual(scanned.kind === "scanned" && scanned.studentNames, ["Rafael", "Iris"]);
    assert.equal(scanned.isTest, true);
  });

  it("drops rows for assignments outside the class", () => {
    assert.ok(buildStream(source).every((item) => item.assignmentId !== "ghost"));
  });

  it("caps the feed", () => {
    const many: StreamSource = {
      assignments: Array.from({ length: 30 }, (_, i) => ({ id: `a${i}`, title: `A${i}`, kind: "ESSAY", createdAt: day(-i) })),
      published: [],
      scans: [],
      drafts: [],
    };
    assert.equal(buildStream(many).length, STREAM_LIMIT);
    assert.equal(buildStream(many, 0).length, 0);
  });
});

describe("student to-do", () => {
  it("splits work into Assigned, Missing and Done", () => {
    assert.equal(todoTabFor(row()), "assigned");
    assert.equal(todoTabFor(row({ pastDue: true })), "missing");
    assert.equal(todoTabFor(row({ state: "returned" })), "assigned");
    assert.equal(todoTabFor(row({ state: "submitted" })), "done");
    assert.equal(todoTabFor(row({ state: "graded" })), "done");
  });

  it("never marks a paper test Missing", () => {
    const waiting = row({ kind: "TEST", awaitingScan: true, dueDate: due(-3) });
    assert.equal(todoTabFor(waiting), "done");
    assert.equal(workStatus(waiting).label, "Waiting for scan");
    assert.equal(workStatus(row({ kind: "TEST" })).label, "Paper test");
    assert.equal(relativeDue(row({ kind: "TEST", dueDate: due(3) }), NOW), "Test on Thursday");
    assert.equal(relativeDue(row({ kind: "TEST", dueDate: due(1) }), NOW), "Test tomorrow");
    assert.equal(toTodoItem(row({ kind: "TEST", dueDate: due(3) }), NOW).note, "Your teacher scans this test");
  });

  it("counts tabs and opens the first tab with work in it", () => {
    const rows = [row({ pastDue: true }), row({ state: "graded" })];
    assert.deepEqual(todoCounts(rows), { assigned: 0, missing: 1, done: 1 });
    assert.equal(defaultTodoTab(rows), "missing");
    assert.equal(defaultTodoTab([]), "assigned");
  });

  it("groups by Sunday-to-Saturday weeks", () => {
    // NOW is Monday Oct 26: this week is Sun Oct 25 to Sat Oct 31.
    assert.equal(todoGroupFor({ dueDate: due(5) }, "assigned", NOW), "this_week");
    assert.equal(todoGroupFor({ dueDate: due(6) }, "assigned", NOW), "next_week");
    assert.equal(todoGroupFor({ dueDate: due(12) }, "assigned", NOW), "next_week");
    assert.equal(todoGroupFor({ dueDate: due(13) }, "assigned", NOW), "later");
    assert.equal(todoGroupFor({ dueDate: null }, "assigned", NOW), "no_due");
    assert.equal(todoGroupFor({ dueDate: due(-1) }, "missing", NOW), "this_week");
    assert.equal(todoGroupFor({ dueDate: due(-2) }, "missing", NOW), "last_week");
    assert.equal(todoGroupFor({ dueDate: due(-9) }, "missing", NOW), "earlier");
    assert.equal(todoGroupFor({ dueDate: due(2) }, "done", NOW), "done_early");
  });

  it("puts papers sent back first and skips empty groups", () => {
    const items = [
      row({ id: "later", title: "Later", dueDate: due(20) }),
      row({ id: "soon", title: "Soon", dueDate: due(2) }),
      row({ id: "back", title: "Sent back", dueDate: due(4), state: "returned" }),
    ].map((r) => toTodoItem(r, NOW));
    const groups = groupTodoItems(items, "assigned");
    assert.deepEqual(groups.map((group) => group.key), ["this_week", "later"]);
    assert.deepEqual(groups[0].items.map((item) => item.id), ["back", "soon"]);
  });

  it("lists only Assigned work as due soon", () => {
    const rows = [
      row({ id: "x", title: "X", dueDate: due(3) }),
      row({ id: "y", title: "Y", dueDate: due(1), state: "submitted" }),
      row({ id: "z", title: "Z", dueDate: due(40) }),
    ];
    assert.deepEqual(dueSoon(rows, NOW, 5).map((r) => r.id), ["x"]);
  });
});

describe("student class stream", () => {
  it("shows posts, returned grades and send-backs, newest first", () => {
    const items = buildStudentStream([
      row({ id: "a", postedAt: day(-5).toISOString(), state: "graded", publishedAt: day(-1).toISOString(), score: { total: 18, max: 25 } }),
      row({ id: "b", postedAt: day(-4).toISOString(), state: "returned", returnedAt: day(-2).toISOString() }),
    ]);
    assert.deepEqual(items.map((item) => `${item.kind}:${item.assignmentId}`), [
      "graded:a",
      "sent_back:b",
      "posted:b",
      "posted:a",
    ]);
  });

  it("never shows a grade that has not been returned", () => {
    const items = buildStudentStream([row({ state: "submitted", publishedAt: day(-1).toISOString() })]);
    assert.ok(items.every((item) => item.kind !== "graded"));
  });
});
