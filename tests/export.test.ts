import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  csvExporter,
  escapeCsvField,
  gradebookToCsv,
  neutralizeFormula,
  slugify,
  toCsvCell,
} from "@/lib/export/csv";
import { getExporter } from "@/lib/export";
import { buildGradebook, cellStateFor, type GradebookSource } from "@/lib/gradebook/types";

// --- Synthetic fixture (all names are fictional) ----------------------------

function source(): GradebookSource {
  return {
    class: { id: "class_1", name: "English 10", section: "Period 2" },
    assignments: [
      { id: "a_essay", title: "Persuasive Essay", dueDate: null, criteria: [{ maxPoints: 10 }, { maxPoints: 15 }] },
      { id: "a_lab", title: 'Lab report, "draft"', dueDate: null, criteria: [{ maxPoints: 20 }] },
    ],
    students: [
      { id: "s_zed", name: "Zed Orrin", email: "zed@students.example" },
      { id: "s_ava", name: "Ava Quillon", email: "ava@students.example" },
      { id: "s_evil", name: "=HYPERLINK(\"http://x\")", email: "+evil@students.example" },
    ],
    submissions: [
      {
        id: "sub_1",
        assignmentId: "a_essay",
        studentId: "s_ava",
        status: "PUBLISHED",
        publishedGrade: { totalScore: 21, maxScore: 25 },
      },
      {
        // An AI draft in the review queue: must never show a score.
        id: "sub_2",
        assignmentId: "a_lab",
        studentId: "s_ava",
        status: "NEEDS_REVIEW",
        publishedGrade: null,
      },
      {
        id: "sub_3",
        assignmentId: "a_essay",
        studentId: "s_zed",
        status: "PUBLISHED",
        publishedGrade: { totalScore: 15.5, maxScore: 25 },
      },
      {
        id: "sub_4",
        assignmentId: "a_lab",
        studentId: "s_zed",
        status: "RETURNED",
        publishedGrade: null,
      },
    ],
  };
}

function parseLines(body: string): string[] {
  assert.ok(body.startsWith("﻿"), "starts with a UTF-8 BOM for Excel");
  assert.ok(body.endsWith("\r\n"), "ends with CRLF");
  return body.slice(1, -2).split("\r\n");
}

// --- RFC 4180 escaping ---------------------------------------------------------

describe("escapeCsvField", () => {
  it("leaves plain fields alone", () => {
    assert.equal(escapeCsvField("Ava Quillon"), "Ava Quillon");
  });

  it("quotes fields with commas, quotes, CR, or LF and doubles inner quotes", () => {
    assert.equal(escapeCsvField("Quillon, Ava"), '"Quillon, Ava"');
    assert.equal(escapeCsvField('The "best" essay'), '"The ""best"" essay"');
    assert.equal(escapeCsvField("line one\nline two"), '"line one\nline two"');
    assert.equal(escapeCsvField("carriage\rreturn"), '"carriage\rreturn"');
  });
});

// --- Formula injection ---------------------------------------------------------

describe("neutralizeFormula", () => {
  it("prefixes a single quote to cells that start with = + - @ tab or CR", () => {
    for (const lead of ["=", "+", "-", "@", "\t", "\r"]) {
      assert.equal(neutralizeFormula(`${lead}SUM(A1:A9)`), `'${lead}SUM(A1:A9)`);
    }
  });

  it("leaves safe text and inner symbols alone", () => {
    assert.equal(neutralizeFormula("Ava = top of class"), "Ava = top of class");
    assert.equal(neutralizeFormula(""), "");
  });

  it("guards before quoting, so a dangerous quoted cell is still neutralized", () => {
    assert.equal(toCsvCell('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`);
    assert.equal(toCsvCell("\rcmd"), `"'\rcmd"`);
  });

  it("formats numbers and blanks null", () => {
    assert.equal(toCsvCell(21), "21");
    assert.equal(toCsvCell(15.5), "15.5");
    assert.equal(toCsvCell(null), "");
  });
});

// --- Gradebook model -----------------------------------------------------------

describe("buildGradebook", () => {
  it("maps statuses to gradebook states, with PublishedGrade as the only source of 'published'", () => {
    assert.equal(cellStateFor(null, false), "missing");
    assert.equal(cellStateFor("SUBMITTED", false), "ready");
    assert.equal(cellStateFor("GRADING_FAILED", false), "ready");
    assert.equal(cellStateFor("GRADING", false), "grading");
    assert.equal(cellStateFor("NEEDS_REVIEW", false), "in_review");
    assert.equal(cellStateFor("APPROVED", false), "in_review");
    assert.equal(cellStateFor("RETURNED", false), "returned");
    assert.equal(cellStateFor("PUBLISHED", true), "published");
    assert.equal(cellStateFor("PUBLISHED", false), "in_review");
  });

  it("sorts students by name and averages published grades only", () => {
    const data = buildGradebook(source());
    assert.deepEqual(
      data.rows.map((row) => row.student.name),
      ['=HYPERLINK("http://x")', "Ava Quillon", "Zed Orrin"]
    );

    const ava = data.rows.find((row) => row.student.id === "s_ava")!;
    assert.equal(ava.cells[0]?.state, "published");
    assert.equal(ava.cells[0]?.score, 21);
    assert.equal(ava.cells[1]?.state, "in_review");
    assert.equal(ava.cells[1]?.score, null);
    assert.equal(ava.cells[1]?.submissionId, "sub_2");
    assert.equal(ava.averagePercent, 84);

    assert.equal(data.assignments[0]?.maxScore, 25);
    assert.equal(data.assignmentAverages.a_essay, (84 + 62) / 2);
    assert.equal(data.assignmentAverages.a_lab, null);
    assert.equal(data.classAverage, (84 + 62) / 2);
  });
});

// --- CSV export ----------------------------------------------------------------

describe("csvExporter", () => {
  it("is registered as the default exporter", () => {
    assert.equal(getExporter("csv"), csvExporter);
    assert.equal(getExporter("CSV"), csvExporter);
    assert.equal(getExporter("canvas"), null);
    assert.equal(csvExporter.contentType, "text/csv; charset=utf-8");
  });

  it("writes a header row and published scores only", () => {
    const lines = parseLines(gradebookToCsv(buildGradebook(source())));
    assert.deepEqual(lines, [
      'Student,Email,Persuasive Essay (/25),"Lab report, ""draft"" (/20)",Average %',
      `"'=HYPERLINK(""http://x"")",'+evil@students.example,,,`,
      "Ava Quillon,ava@students.example,21,,84",
      "Zed Orrin,zed@students.example,15.5,,62",
    ]);
  });

  it("never exports a score for an unpublished cell, even if one is present", () => {
    const data = buildGradebook(source());
    // Simulate a bug upstream putting a number on an in-review cell.
    const ava = data.rows.find((row) => row.student.id === "s_ava")!;
    ava.cells[1] = { ...ava.cells[1]!, score: 19 };
    const avaLine = parseLines(gradebookToCsv(data)).find((line) => line.startsWith("Ava"));
    assert.equal(avaLine, "Ava Quillon,ava@students.example,21,,84");
  });

  it("names the file after the class and the date", () => {
    const { filename } = csvExporter.export(buildGradebook(source()), {
      now: new Date(2026, 9, 25, 12, 0, 0),
    });
    assert.equal(filename, "english-10-period-2-gradebook-2026-10-25.csv");
  });

  it("slugifies safely", () => {
    assert.equal(slugify("Biologie: Période 3 / Lab"), "biologie-periode-3-lab");
    assert.equal(slugify('"; rm -rf /'), "rm-rf");
    assert.equal(slugify("***"), "class");
  });
});
