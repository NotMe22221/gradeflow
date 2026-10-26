import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isStaleGradingClaim, STALE_GRADING_CLAIM_MS } from "@/lib/constants";
import { buildGradebook, cellStateFor, gradebookColumnOrder } from "@/lib/gradebook/types";

const now = Date.UTC(2026, 9, 25, 12, 0, 0);
const fresh = new Date(now - 60_000);
const stale = new Date(now - STALE_GRADING_CLAIM_MS - 1);

describe("gradebook cell state", () => {
  it("only teacher-approved grades count as published", () => {
    assert.equal(cellStateFor("PUBLISHED", true), "published");
    assert.equal(cellStateFor("NEEDS_REVIEW", false), "in_review");
    assert.equal(cellStateFor(null, false), "missing");
  });

  it("treats an abandoned GRADING claim as ready for another AI pass", () => {
    assert.equal(isStaleGradingClaim("GRADING", stale, now), true);
    assert.equal(isStaleGradingClaim("GRADING", fresh, now), false);
    assert.equal(isStaleGradingClaim("SUBMITTED", stale, now), false);
    assert.equal(cellStateFor("GRADING", false, stale, now), "ready");
    assert.equal(cellStateFor("GRADING", false, fresh, now), "grading");
    assert.equal(cellStateFor("GRADING", false), "grading");
  });

  it("a published grade wins over any status", () => {
    assert.equal(cellStateFor("GRADING", true, stale, now), "published");
  });
});

describe("gradebook column order", () => {
  // The query sorts assignments oldest due date first (undated last); the builder must keep that order.
  const source = {
    class: { id: "c1", name: "English 10", section: null },
    assignments: [
      { id: "a-oct", title: "Due Oct 8", dueDate: new Date(Date.UTC(2026, 9, 8, 12)), criteria: [{ maxPoints: 10 }] },
      { id: "a-nov", title: "Due Nov 9", dueDate: new Date(Date.UTC(2026, 10, 9, 12)), criteria: [{ maxPoints: 5 }] },
      { id: "a-none", title: "No due date", dueDate: null, criteria: [{ maxPoints: 4 }] },
    ],
    students: [
      { id: "s2", name: "Zed", email: "zed@example.test" },
      { id: "s1", name: "Ava", email: "ava@example.test" },
    ],
    submissions: [
      { id: "sub1", assignmentId: "a-nov", studentId: "s1", status: "PUBLISHED", publishedGrade: { totalScore: 4, maxScore: 5 } },
    ],
  };

  it("keeps the query's order for assignments and every row's cells (the CSV order)", () => {
    const data = buildGradebook(source, now);
    assert.deepEqual(
      data.assignments.map((assignment) => assignment.id),
      ["a-oct", "a-nov", "a-none"]
    );
    for (const row of data.rows) {
      assert.deepEqual(
        row.cells.map((cell) => cell.assignmentId),
        ["a-oct", "a-nov", "a-none"]
      );
    }
  });

  it("shows columns newest first on screen, with each cell still under its own assignment", () => {
    const data = buildGradebook(source, now);
    const order = gradebookColumnOrder(data);
    assert.deepEqual(
      order.map((index) => data.assignments[index]?.id),
      ["a-none", "a-nov", "a-oct"]
    );
    const ava = data.rows.find((row) => row.student.id === "s1");
    assert.ok(ava);
    const shown = order.map((index) => ava.cells[index]);
    assert.deepEqual(
      shown.map((cell) => [cell?.assignmentId, cell?.score]),
      [
        ["a-none", null],
        ["a-nov", 4],
        ["a-oct", null],
      ]
    );
    assert.deepEqual(gradebookColumnOrder({ assignments: [] }), []);
  });
});
