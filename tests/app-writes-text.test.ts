import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parsePayload, parseReturnNote, ReviewError } from "@/lib/grades/review-input";
import { normalizePaperText } from "@/lib/paper";
import { MAX_COMMENT_CHARS, MAX_FEEDBACK_CHARS } from "@/lib/review/model";
import { stripNul, stripNulOptional } from "@/lib/text/sanitize";
import { parseAssignmentInput } from "@/lib/validation/assignment";
import { classInputSchema, studentInputSchema } from "@/lib/validation/class";

// Postgres `text` can't store U+0000, so every write path drops it.
const NUL = "\u0000";

function hasNul(value: unknown): boolean {
  return JSON.stringify(value).includes("\\u0000");
}

describe("stripNul", () => {
  it("removes every NUL and leaves other text alone", () => {
    assert.equal(stripNul(`a${NUL}b${NUL}${NUL}c`), "abc");
    assert.equal(stripNul(NUL), "");
    assert.equal(stripNul("Café\tnaïve\n✓"), "Café\tnaïve\n✓");
  });

  it("passes null and undefined through for optional columns", () => {
    assert.equal(stripNulOptional(null), null);
    assert.equal(stripNulOptional(undefined), undefined);
    assert.equal(stripNulOptional(`x${NUL}y`), "xy");
  });

  it("is applied to papers and transcriptions", () => {
    assert.equal(normalizePaperText(`${NUL}﻿Strong data table.${NUL} Check units.\r\n`), "Strong data table. Check units.");
  });
});

describe("class and roster input", () => {
  it("drops NUL from the class name, section, and subject", () => {
    const parsed = classInputSchema.parse({ name: `Bio${NUL}logy`, section: `P${NUL}2`, subject: `${NUL}` });
    assert.deepEqual(parsed, { name: "Biology", section: "P2", subject: "" });
  });

  it("still requires a name when it was only NUL", () => {
    const result = classInputSchema.safeParse({ name: `${NUL} ${NUL}`, section: "", subject: "" });
    assert.equal(result.success, false);
    assert.equal(result.error?.issues[0]?.message, "Give the class a name.");
  });

  it("drops NUL from student names before the name rule", () => {
    assert.deepEqual(studentInputSchema.parse({ firstName: `Ze${NUL}ra`, lastName: `Moss${NUL}` }), {
      firstName: "Zera",
      lastName: "Moss",
    });
  });
});

describe("assignment input", () => {
  const base = {
    kind: "ESSAY",
    title: `Cells${NUL} essay`,
    instructions: `Explain${NUL} how cells divide.`,
    dueDate: "",
    criteria: [{ title: `Th${NUL}esis`, description: `A clear${NUL} claim.`, maxPoints: 10 }],
  };

  it("drops NUL from the title, instructions, and rubric text", () => {
    const result = parseAssignmentInput(base);
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.title, "Cells essay");
    assert.equal(result.data.instructions, "Explain how cells divide.");
    assert.deepEqual(result.data.criteria, [{ title: "Thesis", description: "A clear claim.", maxPoints: 10 }]);
    assert.equal(hasNul(result.data), false);
  });

  it("drops NUL from a test's answer key too", () => {
    const result = parseAssignmentInput({ ...base, kind: "TEST", criteria: [{ title: "Q1", description: `4${NUL}2`, maxPoints: 1 }] });
    assert.equal(result.success && result.data.criteria[0].description, "42");
  });

  it("keeps field paths and messages for the form", () => {
    const empty = parseAssignmentInput({ ...base, title: NUL });
    assert.equal(empty.success, false);
    assert.deepEqual(empty.success ? null : [empty.error.issues[0].path, empty.error.issues[0].message], [
      ["title"],
      "Give the assignment a title.",
    ]);

    const long = parseAssignmentInput({ ...base, criteria: [{ title: "Thesis", description: "x".repeat(601), maxPoints: 10 }] });
    assert.equal(long.success, false);
    assert.deepEqual(long.success ? null : long.error.issues[0].path, ["criteria", 0, "description"]);

    // NUL doesn't count toward the limit.
    const atLimit = parseAssignmentInput({ ...base, title: `${"t".repeat(120)}${NUL}` });
    assert.equal(atLimit.success, true);
  });
});

describe("review input", () => {
  const criterionId = "cm0000000000000000000001";

  it("drops NUL from comments and the overall note", () => {
    const payload = parsePayload({
      scores: [{ criterionId, score: 7.5, comment: `Check${NUL} units.` }],
      feedback: `Strong data table.${NUL} Check units.`,
    });
    assert.deepEqual(payload, {
      scores: [{ criterionId, score: 7.5, comment: "Check units." }],
      feedback: "Strong data table. Check units.",
    });
  });

  it("does not count NUL toward the limits, and keeps the limit messages", () => {
    const atLimit = parsePayload({ scores: [], feedback: `${"a".repeat(MAX_FEEDBACK_CHARS)}${NUL}` });
    assert.equal(atLimit.feedback.length, MAX_FEEDBACK_CHARS);

    assert.throws(
      () => parsePayload({ scores: [], feedback: "a".repeat(MAX_FEEDBACK_CHARS + 1) }),
      (error) => error instanceof ReviewError && error.message.startsWith("The overall note is limited")
    );
    assert.throws(
      () => parsePayload({ scores: [{ criterionId, score: 1, comment: "a".repeat(MAX_COMMENT_CHARS + 1) }], feedback: "" }),
      (error) => error instanceof ReviewError && error.message.startsWith("Feedback for each criterion is limited")
    );
    assert.throws(
      () => parsePayload({ scores: [{ criterionId, score: 7.25, comment: "" }], feedback: "" }),
      (error) => error instanceof ReviewError && error.message.startsWith("Scores must be whole or half points")
    );
  });

  it("drops NUL from the send-back note and still requires a note", () => {
    assert.equal(parseReturnNote(`  Please${NUL} revise. `), "Please revise.");
    assert.throws(
      () => parseReturnNote(` ${NUL} `),
      (error) => error instanceof ReviewError && error.message === "Add a note so the student knows what to revise."
    );
    assert.throws(() => parseReturnNote(42), ReviewError);
  });
});
