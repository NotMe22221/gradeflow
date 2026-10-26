import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isPastDueDay as classworkIsPastDueDay } from "@/components/classwork/due";
import { buildStudentStream } from "@/components/student/stream-model";
import { isAwaitingScan, isOverdue, isPastDue } from "@/components/student/student-status";
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
import {
  daysUntil,
  dueLabel,
  isPastDueDay,
  streamTime,
  upcomingWork,
  weekdayIndex,
  zonedDayNumber,
} from "@/lib/classroom/due";
import { buildStream, STREAM_LIMIT, type StreamSource } from "@/lib/classroom/feed";
import { safeTimeZone } from "@/lib/classroom/timezone";
import { formatDueDate } from "@/lib/format";

// Every test names its time zone, so the suite gives the same results under
// TZ=UTC, TZ=America/Los_Angeles and TZ=Pacific/Auckland.
const UTC = "UTC";
const LA = "America/Los_Angeles";
const AUCKLAND = "Pacific/Auckland";

/** A moment in UTC on a day relative to Monday, October 26, 2026 (a Monday). */
function utc(offset: number, hour = 12, minute = 0): Date {
  return new Date(Date.UTC(2026, 9, 26 + offset, hour, minute));
}

/** A due date as the assignment builder stores it: noon UTC on the calendar day. */
function dueOn(offset: number): Date {
  return utc(offset, 12);
}
function due(offset: number): string {
  return dueOn(offset).toISOString();
}

/** Mon Oct 26: 4 PM in UTC, 9 AM in Los Angeles, and already 5 AM Tue Oct 27 in Auckland. */
const NOW = utc(0, 16);
/** 5:30 PM Tue Oct 27 in Los Angeles (00:30 Wed Oct 28 UTC). */
const LA_EVENING = new Date("2026-10-28T00:30:00Z");
/** 1 AM Wed Oct 28 in Los Angeles. */
const LA_AFTER_MIDNIGHT = new Date("2026-10-28T08:00:00Z");

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
    postedAt: utc(-10).toISOString(),
    returnedAt: null,
    ...overrides,
  };
}

describe("due labels", () => {
  it("counts whole calendar days from the viewer's today to the due day", () => {
    assert.equal(daysUntil(dueOn(0), utc(0, 0, 5), UTC), 0);
    assert.equal(daysUntil(dueOn(0), utc(0, 23, 59), UTC), 0);
    assert.equal(daysUntil(dueOn(1), utc(0, 23), UTC), 1);
    assert.equal(daysUntil(dueOn(-1), NOW, UTC), -1);
  });

  it("reads like Classroom", () => {
    assert.equal(dueLabel(dueOn(0), NOW, { timeZone: UTC }), "Due today");
    assert.equal(dueLabel(dueOn(1), NOW, { timeZone: UTC }), "Due tomorrow");
    assert.equal(dueLabel(dueOn(3), NOW, { timeZone: UTC }), "Due Thursday");
    assert.equal(dueLabel(dueOn(3), NOW, { timeZone: UTC, style: "short" }), "Due Thu");
    assert.equal(dueLabel(dueOn(7), NOW, { timeZone: UTC }), "Due Nov 2");
    assert.equal(dueLabel(dueOn(-6), NOW, { timeZone: UTC }), "Due Oct 20");
  });

  it("reads a due date's day from its stored UTC date in every zone", () => {
    const zones = [UTC, LA, AUCKLAND, "Pacific/Kiritimati", "Pacific/Pago_Pago", "Etc/GMT+12", "Asia/Kolkata"];
    for (const zone of zones) {
      assert.equal(formatDueDate(dueOn(0)), "Oct 26", zone);
      // Two weeks out, the label is the absolute date wherever "today" is.
      assert.equal(dueLabel(dueOn(14), NOW, { timeZone: zone }), "Due Nov 9", zone);
      // A weekday label names the due date's own weekday (Thursday, Oct 29).
      assert.match(dueLabel(dueOn(3), utc(1, 12), { timeZone: zone }), /^Due (Thursday|tomorrow)$/, zone);
    }
  });

  it("takes 'today' from the viewer's zone: a Los Angeles evening", () => {
    // Due Tue Oct 27. At 5:30 PM that day in Los Angeles it is already Wed in UTC.
    const dueTuesday = dueOn(1);
    assert.equal(dueLabel(dueTuesday, LA_EVENING, { timeZone: LA }), "Due today");
    assert.equal(upcomingWork([{ title: "Essay", dueDate: dueTuesday }], LA_EVENING, { timeZone: LA }).length, 1);
    assert.equal(isPastDueDay(dueTuesday, LA_EVENING, LA), false);
    assert.equal(isOverdue("ESSAY", "not_submitted", dueTuesday, LA_EVENING, LA), false);
    assert.equal(isAwaitingScan("TEST", "not_submitted", dueTuesday, LA_EVENING, LA), false);

    // The same moment for a viewer in UTC: the due day has ended.
    assert.equal(dueLabel(dueTuesday, LA_EVENING, { timeZone: UTC }), "Due Oct 27");
    assert.equal(isPastDueDay(dueTuesday, LA_EVENING, UTC), true);

    // After midnight in Los Angeles it is past due there too.
    assert.equal(isPastDueDay(dueTuesday, LA_AFTER_MIDNIGHT, LA), true);
    assert.equal(isOverdue("ESSAY", "not_submitted", dueTuesday, LA_AFTER_MIDNIGHT, LA), true);
    assert.equal(isAwaitingScan("TEST", "not_submitted", dueTuesday, LA_AFTER_MIDNIGHT, LA), true);
    assert.equal(upcomingWork([{ title: "Essay", dueDate: dueTuesday }], LA_AFTER_MIDNIGHT, { timeZone: LA }).length, 0);
    assert.equal(dueLabel(dueTuesday, LA_AFTER_MIDNIGHT, { timeZone: LA }), "Due Oct 27");
  });

  it("takes 'today' from the viewer's zone: Auckland is already on Tuesday", () => {
    assert.equal(dueLabel(dueOn(0), NOW, { timeZone: AUCKLAND }), "Due Oct 26");
    assert.equal(isPastDueDay(dueOn(0), NOW, AUCKLAND), true);
    assert.equal(dueLabel(dueOn(1), NOW, { timeZone: AUCKLAND }), "Due today");
    assert.equal(dueLabel(dueOn(2), NOW, { timeZone: AUCKLAND }), "Due tomorrow");
    // Still Monday morning in Los Angeles.
    assert.equal(dueLabel(dueOn(0), NOW, { timeZone: LA }), "Due today");
    assert.equal(isPastDueDay(dueOn(0), NOW, LA), false);
  });

  it("labels a Los Angeles Sunday evening by the local day", () => {
    // 7:30 PM Sun Oct 25 in Los Angeles, already Monday in UTC.
    const sundayEvening = new Date("2026-10-26T02:30:00Z");
    assert.equal(dueLabel(dueOn(1), sundayEvening, { timeZone: LA }), "Due Tuesday");
    assert.equal(dueLabel(dueOn(0), sundayEvening, { timeZone: LA }), "Due tomorrow");
    assert.equal(dueLabel(dueOn(0), sundayEvening, { timeZone: UTC }), "Due today");
    assert.equal(weekdayIndex(sundayEvening, LA), 0);
    assert.equal(weekdayIndex(sundayEvening, UTC), 1);
    assert.equal(weekdayIndex(NOW, AUCKLAND), 2);
    assert.equal(zonedDayNumber(sundayEvening, UTC) - zonedDayNumber(sundayEvening, LA), 1);
  });

  it("has one past-due rule: never 'Due today' and Missing at once, in any zone, at any hour", () => {
    const zones = [UTC, LA, AUCKLAND, "America/New_York", "Asia/Kolkata", "Pacific/Kiritimati", "Etc/GMT+12"];
    const dueDate = dueOn(1);
    for (const zone of zones) {
      for (let hour = -24; hour <= 72; hour++) {
        const now = utc(0, hour);
        const label = dueLabel(dueDate, now, { timeZone: zone });
        const pastDue = isPastDueDay(dueDate, now, zone);
        const upcoming = upcomingWork([{ title: "x", dueDate }], now, { timeZone: zone }).length > 0;
        const context = `${zone} at ${now.toISOString()}`;
        if (label === "Due today" || label === "Due tomorrow") assert.equal(pastDue, false, context);
        assert.equal(upcoming, !pastDue, context);
        assert.equal(isPastDue(dueDate, now, zone), pastDue, context);
        assert.equal(classworkIsPastDueDay(dueDate, now, zone), pastDue, context);
        assert.equal(isOverdue("ESSAY", "not_submitted", dueDate, now, zone), pastDue, context);
      }
    }
  });

  it("treats a missing or unreadable due date as never past due", () => {
    assert.equal(isPastDueDay(null, NOW, UTC), false);
    assert.equal(isPastDueDay("not a date", NOW, UTC), false);
    assert.equal(isPastDueDay(due(-1), NOW, UTC), true);
  });

  it("lists upcoming work soonest first, without past or undated work", () => {
    const items = [
      { title: "B", dueDate: dueOn(5) },
      { title: "Past", dueDate: dueOn(-1) },
      { title: "None", dueDate: null },
      { title: "A", dueDate: dueOn(5) },
      { title: "Today", dueDate: dueOn(0) },
      { title: "Far", dueDate: dueOn(30) },
    ];
    assert.deepEqual(upcomingWork(items, NOW, { timeZone: UTC }).map((item) => item.title), ["Today", "A", "B"]);
    assert.deepEqual(
      upcomingWork(items, NOW, { limit: 2, timeZone: UTC }).map((item) => item.title),
      ["Today", "A"]
    );
    // In Auckland, Monday's work is already past.
    assert.deepEqual(upcomingWork(items, NOW, { timeZone: AUCKLAND }).map((item) => item.title), ["A", "B"]);
  });
});

describe("stream times", () => {
  it("shows a relative time for the last day's items", () => {
    assert.equal(streamTime(new Date(NOW.getTime() - 10_000), NOW, UTC), "just now");
    assert.equal(streamTime(new Date(NOW.getTime() - 5 * 60_000), NOW, UTC), "5m ago");
    assert.equal(streamTime(utc(0, 14), NOW, LA), "2h ago");
    assert.equal(streamTime(utc(-1, 17), NOW, AUCKLAND), "23h ago");
  });

  it("shows the date in the viewer's zone after that, never a server clock time", () => {
    assert.equal(streamTime(utc(-2), NOW, UTC), "Oct 24");
    // 23.5 hours ago: Oct 25 in UTC and Los Angeles, already Oct 26 in Auckland.
    const dayAgo = new Date(NOW.getTime() - 23.5 * 60 * 60 * 1000);
    assert.equal(streamTime(dayAgo, NOW, UTC), "Oct 25");
    assert.equal(streamTime(dayAgo, NOW, LA), "Oct 25");
    assert.equal(streamTime(dayAgo, NOW, AUCKLAND), "Oct 26");
    // Posted at 6:36 PM Sat Oct 24 in Los Angeles (01:36 Sun Oct 25 UTC).
    const posted = new Date("2026-10-25T01:36:00Z");
    assert.equal(streamTime(posted, NOW, LA), "Oct 24");
    assert.equal(streamTime(posted, NOW, UTC), "Oct 25");
    for (let minutes = 0; minutes < 3 * 24 * 60; minutes += 37) {
      assert.doesNotMatch(streamTime(new Date(NOW.getTime() - minutes * 60_000), NOW, LA), /AM|PM|:/);
    }
  });
});

describe("viewer time zone cookie", () => {
  it("accepts real IANA zones and rejects anything else", () => {
    assert.equal(safeTimeZone(LA), LA);
    assert.equal(safeTimeZone(AUCKLAND), AUCKLAND);
    assert.equal(safeTimeZone("UTC"), "UTC");
    assert.equal(safeTimeZone(undefined), undefined);
    assert.equal(safeTimeZone(""), undefined);
    assert.equal(safeTimeZone("Mars/Olympus_Mons"), undefined);
    assert.equal(safeTimeZone("America/Los_Angeles; path=/"), undefined);
    assert.equal(safeTimeZone("<script>"), undefined);
    assert.equal(safeTimeZone("A".repeat(100)), undefined);
  });
});

describe("teacher class stream", () => {
  const source: StreamSource = {
    assignments: [
      { id: "essay", title: "Persuasive essay", kind: "ESSAY", createdAt: utc(-10) },
      { id: "quiz", title: "Unit quiz", kind: "TEST", createdAt: utc(-20) },
    ],
    published: [
      { assignmentId: "essay", publishedAt: utc(-2, 9) },
      { assignmentId: "essay", publishedAt: utc(-2, 15) },
      { assignmentId: "essay", publishedAt: utc(-1) },
      { assignmentId: "ghost", publishedAt: utc(-1) },
    ],
    scans: [
      { assignmentId: "quiz", submittedAt: utc(-3, 10), studentName: "Iris" },
      { assignmentId: "quiz", submittedAt: utc(-3, 11), studentName: "Rafael" },
    ],
    drafts: [
      { assignmentId: "essay", readyAt: utc(0, 8), grader: "demo" },
      { assignmentId: "essay", readyAt: utc(0, 7), grader: "claude" },
    ],
  };

  it("groups returns and scans by assignment and day, newest first", () => {
    const items = buildStream(source, STREAM_LIMIT, UTC);
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

  it("groups by the viewer's calendar day", () => {
    // 8 PM Fri and 2 AM Sat in Los Angeles: one UTC day, two local days.
    const evening: StreamSource = {
      ...source,
      published: [
        { assignmentId: "essay", publishedAt: utc(-2, 3) },
        { assignmentId: "essay", publishedAt: utc(-2, 9) },
      ],
      scans: [],
      drafts: [],
    };
    const returned = (timeZone: string) =>
      buildStream(evening, STREAM_LIMIT, timeZone).filter((item) => item.kind === "returned").length;
    assert.equal(returned(UTC), 1);
    assert.equal(returned(LA), 2);
  });

  it("dates the drafts post by the AI pass, so editing a draft never moves it", () => {
    // Drafts were ready at 8 AM; a grade went back at 9 AM. A later draft edit
    // (Submission.updatedAt) is not part of the source, so nothing moves.
    const items = buildStream(
      {
        ...source,
        published: [{ assignmentId: "essay", publishedAt: utc(0, 9) }],
        scans: [],
      },
      STREAM_LIMIT,
      UTC
    );
    assert.deepEqual(items.slice(0, 2).map((item) => item.kind), ["returned", "drafts"]);
    assert.equal(items[1].at.getTime(), utc(0, 8).getTime());
  });

  it("drops rows for assignments outside the class", () => {
    assert.ok(buildStream(source, STREAM_LIMIT, UTC).every((item) => item.assignmentId !== "ghost"));
  });

  it("caps the feed", () => {
    const many: StreamSource = {
      assignments: Array.from({ length: 30 }, (_, i) => ({ id: `a${i}`, title: `A${i}`, kind: "ESSAY", createdAt: utc(-i) })),
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
    assert.equal(relativeDue(row({ kind: "TEST", dueDate: due(3) }), NOW, UTC), "Test on Thursday");
    assert.equal(relativeDue(row({ kind: "TEST", dueDate: due(1) }), NOW, UTC), "Test tomorrow");
    assert.equal(toTodoItem(row({ kind: "TEST", dueDate: due(3) }), NOW, UTC).note, "Your teacher scans this test");
  });

  it("counts tabs and opens the first tab with work in it", () => {
    const rows = [row({ pastDue: true }), row({ state: "graded" })];
    assert.deepEqual(todoCounts(rows), { assigned: 0, missing: 1, done: 1 });
    assert.equal(defaultTodoTab(rows), "missing");
    assert.equal(defaultTodoTab([]), "assigned");
  });

  it("groups by Sunday-to-Saturday weeks", () => {
    // NOW is Monday Oct 26 in UTC: this week is Sun Oct 25 to Sat Oct 31.
    assert.equal(todoGroupFor({ dueDate: due(5) }, "assigned", NOW, UTC), "this_week");
    assert.equal(todoGroupFor({ dueDate: due(6) }, "assigned", NOW, UTC), "next_week");
    assert.equal(todoGroupFor({ dueDate: due(12) }, "assigned", NOW, UTC), "next_week");
    assert.equal(todoGroupFor({ dueDate: due(13) }, "assigned", NOW, UTC), "later");
    assert.equal(todoGroupFor({ dueDate: null }, "assigned", NOW, UTC), "no_due");
    assert.equal(todoGroupFor({ dueDate: due(-1) }, "missing", NOW, UTC), "this_week");
    assert.equal(todoGroupFor({ dueDate: due(-2) }, "missing", NOW, UTC), "last_week");
    assert.equal(todoGroupFor({ dueDate: due(-9) }, "missing", NOW, UTC), "earlier");
    assert.equal(todoGroupFor({ dueDate: due(2) }, "done", NOW, UTC), "done_early");
  });

  it("starts the week on the viewer's Sunday", () => {
    // 8 PM Sat Oct 24 in Los Angeles is already Sunday in UTC.
    const saturdayEvening = new Date("2026-10-25T03:00:00Z");
    assert.equal(todoGroupFor({ dueDate: due(0) }, "assigned", saturdayEvening, LA), "next_week");
    assert.equal(relativeDue(row({ dueDate: due(0) }), saturdayEvening, LA), "Due Monday");
    assert.equal(todoGroupFor({ dueDate: due(0) }, "assigned", saturdayEvening, UTC), "this_week");
    assert.equal(relativeDue(row({ dueDate: due(0) }), saturdayEvening, UTC), "Due tomorrow");
  });

  it("keeps Missing and 'Due today' on the same day boundary", () => {
    const dueTuesday = dueOn(1);
    const itemAt = (now: Date) =>
      toTodoItem(
        row({ dueDate: dueTuesday.toISOString(), pastDue: isOverdue("ESSAY", "not_submitted", dueTuesday, now, LA) }),
        now,
        LA
      );
    const evening = itemAt(LA_EVENING);
    assert.equal(evening.tab, "assigned");
    assert.equal(evening.dueText, "Due today");
    assert.equal(evening.status.label, "Assigned");
    const nextDay = itemAt(LA_AFTER_MIDNIGHT);
    assert.equal(nextDay.tab, "missing");
    assert.equal(nextDay.dueText, "Due Oct 27");
    assert.equal(nextDay.status.label, "Missing");
    assert.equal(nextDay.group, "this_week");
  });

  it("puts papers sent back first and skips empty groups", () => {
    const items = [
      row({ id: "later", title: "Later", dueDate: due(20) }),
      row({ id: "soon", title: "Soon", dueDate: due(2) }),
      row({ id: "back", title: "Sent back", dueDate: due(4), state: "returned" }),
    ].map((r) => toTodoItem(r, NOW, UTC));
    const groups = groupTodoItems(items, "assigned");
    assert.deepEqual(groups.map((group) => group.key), ["this_week", "later"]);
    assert.deepEqual(groups[0].items.map((item) => item.id), ["back", "soon"]);
  });

  it("lists only Assigned work as due soon", () => {
    const rows = [
      row({ id: "x", title: "X", dueDate: due(3) }),
      row({ id: "y", title: "Y", dueDate: due(1), state: "submitted" }),
      row({ id: "z", title: "Z", dueDate: due(40) }),
      row({ id: "w", title: "W", dueDate: due(0) }),
    ];
    assert.deepEqual(dueSoon(rows, NOW, 5, { timeZone: UTC }).map((r) => r.id), ["w", "x"]);
    // Monday's work is already past in Auckland.
    assert.deepEqual(dueSoon(rows, NOW, 5, { timeZone: AUCKLAND }).map((r) => r.id), ["x"]);
  });
});

describe("student class stream", () => {
  it("shows posts, returned grades and send-backs, newest first", () => {
    const items = buildStudentStream([
      row({ id: "a", postedAt: utc(-5).toISOString(), state: "graded", publishedAt: utc(-1).toISOString(), score: { total: 18, max: 25 } }),
      row({ id: "b", postedAt: utc(-4).toISOString(), state: "returned", returnedAt: utc(-2).toISOString() }),
    ]);
    assert.deepEqual(items.map((item) => `${item.kind}:${item.assignmentId}`), [
      "graded:a",
      "sent_back:b",
      "posted:b",
      "posted:a",
    ]);
  });

  it("never shows a grade that has not been returned", () => {
    const items = buildStudentStream([row({ state: "submitted", publishedAt: utc(-1).toISOString() })]);
    assert.ok(items.every((item) => item.kind !== "graded"));
  });

  it("keeps a send-back as history, open only while the paper is still sent back", () => {
    // undefined: no send-back item at all.
    const openOf = (state: StudentWorkRow["state"]) => {
      const items = buildStudentStream([
        row({
          state,
          returnedAt: utc(-2).toISOString(),
          publishedAt: state === "graded" ? utc(-1).toISOString() : null,
        }),
      ]);
      const item = items.find((entry) => entry.kind === "sent_back");
      return item?.kind === "sent_back" ? item.open : undefined;
    };
    assert.equal(openOf("returned"), true);
    assert.equal(openOf("submitted"), false);
    assert.equal(openOf("graded"), false);
  });
});
