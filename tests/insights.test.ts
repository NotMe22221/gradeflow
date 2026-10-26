import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { serializeBreakdown, type BreakdownItem } from "@/lib/grades/breakdown";
import { buildBriefPicker } from "@/lib/insights/brief-picker";
import {
  averageDistribution,
  buildHeatmap,
  formatHeatPercent,
  heatBand,
  heatCellLabel,
  rankMostMissed,
  type HeatmapSource,
} from "@/lib/insights/heatmap";
import { buildStudentProfile, computeSkills, openStateFor, type StudentRecord } from "@/lib/insights/profile";
import { scrollStateOf } from "@/lib/insights/scroll";

function item(criterionId: string, title: string, score: number, maxPoints: number, comment = ""): BreakdownItem {
  return { criterionId, title, score, maxPoints, comment };
}

const students = [
  { id: "s-cy", name: "Cyrus Fernwhistle", email: "cyrus@example.test" },
  { id: "s-ava", name: "Ava Quillon", email: "ava@example.test" },
  { id: "s-bo", name: "Bo Larkspur", email: "bo@example.test" },
];

function source(overrides: Partial<HeatmapSource> = {}): HeatmapSource {
  return {
    class: { id: "c1", name: "English 10", section: "Period 2" },
    assignments: [
      {
        id: "a-essay",
        title: "Persuasive Essay",
        criteria: [
          { id: "k-evidence", title: "Evidence", maxPoints: 10, position: 1 },
          { id: "k-claim", title: "Clear position", maxPoints: 5, position: 0 },
        ],
      },
      {
        id: "a-quiz",
        title: "Unit 3 Quiz",
        criteria: [
          { id: "q1", title: "Q1. Watershed", maxPoints: 2, position: 0 },
          { id: "q5", title: "Q5. Vocabulary in context", maxPoints: 4, position: 1 },
        ],
      },
      { id: "a-empty", title: "Lab Report", criteria: [{ id: "l1", title: "Method", maxPoints: 5, position: 0 }] },
    ],
    students,
    grades: [
      {
        assignmentId: "a-essay",
        studentId: "s-ava",
        totalScore: 13,
        maxScore: 15,
        breakdown: serializeBreakdown([item("k-claim", "Clear position", 5, 5), item("k-evidence", "Evidence", 8, 10)]),
      },
      {
        assignmentId: "a-essay",
        studentId: "s-bo",
        totalScore: 7,
        maxScore: 15,
        breakdown: [item("k-claim", "Clear position", 3, 5), item("k-evidence", "Evidence", 4, 10)],
      },
      {
        assignmentId: "a-quiz",
        studentId: "s-ava",
        totalScore: 4,
        maxScore: 6,
        breakdown: [item("q1", "Q1. Watershed", 2, 2), item("q5", "Q5. Vocabulary in context", 2, 4)],
      },
      // A student who left the class: never counted.
      {
        assignmentId: "a-quiz",
        studentId: "s-gone",
        totalScore: 0,
        maxScore: 6,
        breakdown: [item("q1", "Q1. Watershed", 0, 2), item("q5", "Q5. Vocabulary in context", 0, 4)],
      },
    ],
    ...overrides,
  };
}

describe("class heatmap", () => {
  it("builds rows for enrolled students and columns in rubric order, skipping assignments with nothing approved", () => {
    const heatmap = buildHeatmap(source());
    assert.deepEqual(
      heatmap.rows.map((row) => row.student.name),
      ["Ava Quillon", "Bo Larkspur", "Cyrus Fernwhistle"]
    );
    assert.deepEqual(
      heatmap.groups.map((group) => group.title),
      ["Persuasive Essay", "Unit 3 Quiz"]
    );
    assert.deepEqual(
      heatmap.columns.map((column) => column.title),
      ["Clear position", "Evidence", "Q1. Watershed", "Q5. Vocabulary in context"]
    );
    assert.equal(heatmap.hiddenAssignmentCount, 1);
    assert.equal(heatmap.publishedCount, 3);
  });

  it("fills cells with the percent earned and null where nothing is approved", () => {
    const heatmap = buildHeatmap(source());
    const [ava, bo, cyrus] = heatmap.rows;
    assert.deepEqual(ava.cells, [100, 80, 100, 50]);
    assert.deepEqual(bo.cells, [60, 40, null, null]);
    assert.deepEqual(cyrus.cells, [null, null, null, null]);
    assert.equal(cyrus.average, null);
    assert.equal(Math.round(ava.average ?? 0), Math.round((13 / 15 + 4 / 6) * 50));
  });

  it("averages each criterion over graded, enrolled students only", () => {
    const heatmap = buildHeatmap(source());
    const byTitle = new Map(heatmap.columns.map((column) => [column.title, column]));
    assert.equal(byTitle.get("Evidence")?.average, 60);
    assert.equal(byTitle.get("Evidence")?.sampleSize, 2);
    // The departed student's 0/4 is ignored: only Ava's 2/4 counts.
    assert.equal(byTitle.get("Q5. Vocabulary in context")?.average, 50);
    assert.equal(byTitle.get("Q5. Vocabulary in context")?.sampleSize, 1);
  });

  it("ranks most missed by lowest average and requires at least two graded students", () => {
    const heatmap = buildHeatmap(source());
    assert.deepEqual(
      heatmap.mostMissed.map((entry) => [entry.title, entry.average, entry.sampleSize]),
      [
        ["Evidence", 60, 2],
        ["Clear position", 80, 2],
      ]
    );
    assert.equal(heatmap.mostMissed[0]?.className, "English 10");
    assert.equal(heatmap.mostMissed[0]?.assignmentTitle, "Persuasive Essay");
  });

  it("keeps the top five and breaks ties by sample size, then order", () => {
    const columns = Array.from({ length: 8 }, (_, index) => ({
      key: `k${index}`,
      assignmentId: "a",
      assignmentTitle: "A",
      criterionId: `c${index}`,
      title: `C${index}`,
      maxPoints: 4,
      average: index < 2 ? 50 : 60 + index,
      sampleSize: index === 1 ? 5 : 3,
      classId: "c1",
      className: "English 10",
    }));
    const ranked = rankMostMissed(columns);
    assert.equal(ranked.length, 5);
    assert.deepEqual(
      ranked.map((entry) => entry.title),
      ["C1", "C0", "C2", "C3", "C4"]
    );
    assert.equal(rankMostMissed(columns, { minSample: 4 }).length, 1);
  });

  it("reads published breakdowns defensively", () => {
    const heatmap = buildHeatmap(
      source({
        grades: [{ assignmentId: "a-essay", studentId: "s-ava", totalScore: 3, maxScore: 15, breakdown: "not json" }],
      })
    );
    assert.equal(heatmap.groups.length, 1);
    assert.deepEqual(heatmap.rows[0]?.cells, [null, null]);
    assert.deepEqual(heatmap.mostMissed, []);
  });

  it("has nothing to show without approved grades", () => {
    const heatmap = buildHeatmap(source({ grades: [] }));
    assert.equal(heatmap.groups.length, 0);
    assert.equal(heatmap.columns.length, 0);
    assert.equal(heatmap.hiddenAssignmentCount, 3);
    assert.equal(heatmap.classAverage, null);
  });

  it("picks color bands from the rounded percent, so the label and color agree", () => {
    assert.equal(heatBand(null), "empty");
    assert.equal(heatBand(49.4), "lowest");
    assert.equal(heatBand(49.5), "low");
    assert.equal(heatBand(64.4), "low");
    assert.equal(heatBand(65), "mid");
    assert.equal(heatBand(79.4), "mid");
    assert.equal(heatBand(80), "high");
    assert.equal(heatBand(89.5), "highest");
    assert.equal(heatBand(100), "highest");
    assert.equal(formatHeatPercent(49.5), "50%");
    assert.equal(formatHeatPercent(null), "–");
    assert.equal(heatCellLabel("Ava Quillon", "Q5 Vocabulary in context", 50), "Ava Quillon, Q5 Vocabulary in context: 50%");
    assert.equal(heatCellLabel("Ava Quillon", "Q1", null), "Ava Quillon, Q1: no approved grade");
  });
});

const NOW = new Date(2026, 9, 25, 12, 0, 0);
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

function record(): StudentRecord {
  return {
    class: { id: "c1", name: "English 10", section: null, subject: "English" },
    student: { id: "s-ava", name: "Ava Quillon", email: "ava@example.test" },
    assignments: [
      { id: "a1", title: "Persuasive Essay", kind: "ESSAY", dueDate: daysAgo(20), maxScore: 15 },
      { id: "a2", title: "Literary Analysis", kind: "ESSAY", dueDate: daysAgo(10), maxScore: 15 },
      { id: "a3", title: "Lab Report", kind: "ESSAY", dueDate: daysAgo(3), maxScore: 10 },
      // A paper test nobody has scanned yet: the student can't submit it, so it is never missing.
      { id: "a4", title: "Unit 3 Quiz", kind: "TEST", dueDate: daysAgo(2), maxScore: 6 },
      { id: "a5", title: "Research Proposal", kind: "ESSAY", dueDate: daysAgo(-5), maxScore: 10 },
      { id: "a6", title: "Reading Log", kind: "ESSAY", dueDate: daysAgo(4), maxScore: 5 },
      { id: "a7", title: "Four-Day Week Essay", kind: "ESSAY", dueDate: daysAgo(-2), maxScore: 10 },
    ],
    submissions: [
      {
        id: "sub1",
        assignmentId: "a1",
        status: "PUBLISHED",
        updatedAt: daysAgo(15),
        published: {
          totalScore: 12,
          maxScore: 15,
          breakdown: [item("k1", "Evidence", 5, 10, "Needs a second source."), item("k2", "Writing and structure", 5, 5)],
          feedback: "Strong voice.",
          publishedAt: daysAgo(15),
        },
      },
      {
        id: "sub2",
        assignmentId: "a2",
        status: "PUBLISHED",
        updatedAt: daysAgo(5),
        published: {
          totalScore: 13,
          maxScore: 15,
          breakdown: [item("k3", "evidence ", 7, 10), item("k4", "Writing and structure", 5, 5), item("k5", "Interpretation", 1, 0)],
          feedback: null,
          publishedAt: daysAgo(5),
        },
      },
      // An AI draft waiting for review: workflow count only, never a score.
      { id: "sub3", assignmentId: "a3", status: "NEEDS_REVIEW", updatedAt: daysAgo(1), published: null },
      // Submitted, no AI pass yet: not in the review queue.
      { id: "sub7", assignmentId: "a7", status: "SUBMITTED", updatedAt: daysAgo(1), published: null },
    ],
    activity: [
      { createdAt: daysAgo(0), xp: 50, kind: "SUBMIT" },
      { createdAt: daysAgo(1), xp: 15, kind: "STUDY_SESSION" },
      { createdAt: daysAgo(2), xp: 25, kind: "ON_TIME" },
      // The teacher published a grade: XP, but not a study day.
      { createdAt: daysAgo(3), xp: 200, kind: "GRADE_PUBLISHED" },
      { createdAt: daysAgo(6), xp: 10, kind: "GOAL_SET" },
    ],
  };
}

describe("student profile", () => {
  it("counts published, in review, ready, missing, and upcoming work", () => {
    const profile = buildStudentProfile(record(), NOW);
    assert.equal(profile.stats.publishedCount, 2);
    assert.equal(profile.stats.inReviewCount, 1);
    assert.equal(profile.stats.readyCount, 1);
    assert.equal(profile.stats.missingCount, 1);
    assert.equal(Math.round(profile.stats.averagePercent ?? 0), Math.round(((12 / 15 + 13 / 15) / 2) * 100));
    assert.deepEqual(
      profile.grades.map((grade) => grade.title),
      ["Literary Analysis", "Persuasive Essay"]
    );
    assert.deepEqual(
      profile.openWork.map((work) => [work.title, work.state]),
      [
        ["Reading Log", "missing"],
        ["Lab Report", "in_review"],
        ["Four-Day Week Essay", "ready"],
        ["Unit 3 Quiz", "awaiting_scan"],
        ["Research Proposal", "upcoming"],
      ]
    );
  });

  it("never marks a paper test missing before the teacher scans it", () => {
    const testRecord = record();
    testRecord.assignments = [
      { id: "t1", title: "Past quiz", kind: "TEST", dueDate: daysAgo(2), maxScore: 6 },
      { id: "t2", title: "Next quiz", kind: "TEST", dueDate: daysAgo(-3), maxScore: 6 },
      { id: "t3", title: "Undated quiz", kind: "TEST", dueDate: null, maxScore: 6 },
    ];
    testRecord.submissions = [];
    const profile = buildStudentProfile(testRecord, NOW);
    assert.equal(profile.stats.missingCount, 0);
    assert.deepEqual(
      profile.openWork.map((work) => [work.title, work.state]),
      [
        ["Past quiz", "awaiting_scan"],
        ["Undated quiz", "awaiting_scan"],
        ["Next quiz", "upcoming"],
      ]
    );
  });

  it("treats work as missing only after its whole due day, like the student views", () => {
    // Due dates are calendar dates stored at noon UTC; "today" is the viewer's day.
    const due = new Date(Date.UTC(2026, 9, 25, 12, 0, 0));
    const sameEvening = new Date(Date.UTC(2026, 9, 25, 21, 56, 0));
    const lastMoment = new Date(Date.UTC(2026, 9, 25, 23, 59, 59));
    const nextMorning = new Date(Date.UTC(2026, 9, 26, 0, 30, 0));
    assert.equal(openStateFor("missing", due, sameEvening, "ESSAY", "UTC"), "upcoming");
    assert.equal(openStateFor("missing", due, lastMoment, "ESSAY", "UTC"), "upcoming");
    assert.equal(openStateFor("missing", due, nextMorning, "ESSAY", "UTC"), "missing");
    assert.equal(openStateFor("missing", null, nextMorning, "ESSAY", "UTC"), "not_submitted");
    assert.equal(openStateFor("missing", due, nextMorning, "TEST", "UTC"), "awaiting_scan");
    assert.equal(openStateFor("ready", due, nextMorning, "ESSAY", "UTC"), "ready");
    assert.equal(openStateFor("grading", due, nextMorning, "ESSAY", "UTC"), "in_review");
    assert.equal(openStateFor("in_review", due, nextMorning, "ESSAY", "UTC"), "in_review");
    assert.equal(openStateFor("returned", due, nextMorning, "ESSAY", "UTC"), "returned");
    assert.equal(openStateFor("published", due, nextMorning, "ESSAY", "UTC"), null);
    // 5:30 PM on the due day in Los Angeles is still the due day there.
    assert.equal(openStateFor("missing", due, nextMorning, "ESSAY", "America/Los_Angeles"), "upcoming");
    // Auckland reaches the next day while it is still the due day in UTC.
    assert.equal(openStateFor("missing", due, sameEvening, "ESSAY", "Pacific/Auckland"), "missing");
  });

  it("derives strengths and growth areas from per-criterion percentages, merged by title", () => {
    const profile = buildStudentProfile(record(), NOW);
    assert.deepEqual(profile.strengths, [
      { title: "Writing and structure", percent: 100, assignments: ["Persuasive Essay", "Literary Analysis"] },
    ]);
    assert.deepEqual(profile.growthAreas, [
      { title: "Evidence", percent: 60, assignments: ["Persuasive Essay", "Literary Analysis"] },
    ]);
  });

  it("keeps strengths and growth areas disjoint and capped", () => {
    const grades = [
      {
        title: "Quiz",
        breakdown: [80, 95, 79, 10, 20, 30, 90].map((percent, index) => item(`q${index}`, `Q${index}`, percent, 100)),
      },
    ];
    const { strengths, growthAreas } = computeSkills(grades, 2);
    assert.deepEqual(
      strengths.map((skill) => skill.title),
      ["Q1", "Q6"]
    );
    assert.deepEqual(
      growthAreas.map((skill) => skill.title),
      ["Q3", "Q4"]
    );
  });

  it("reports engagement from study activity, separate from grades", () => {
    const profile = buildStudentProfile(record(), NOW);
    // Days 0-2 are the student's own actions. Day 3 is only a published grade, so the streak stops at 3.
    assert.equal(profile.engagement.streak.current, 3);
    assert.equal(profile.engagement.streak.longest, 3);
    assert.equal(profile.engagement.streak.activeToday, true);
    // A published grade still earns XP.
    assert.equal(profile.engagement.level.xp, 300);
    assert.equal(profile.engagement.level.level, 2);
  });

  it("never starts a streak from a grade the teacher published", () => {
    const quiet = record();
    quiet.activity = [{ createdAt: daysAgo(0), xp: 40, kind: "GRADE_PUBLISHED" }];
    const profile = buildStudentProfile(quiet, NOW);
    assert.equal(profile.engagement.streak.current, 0);
    assert.equal(profile.engagement.streak.activeToday, false);
    assert.equal(profile.engagement.level.xp, 40);
  });
});

describe("class snapshot distribution", () => {
  it("counts students per heat band of their average, low to high, plus ungraded students", () => {
    const result = averageDistribution([
      { average: 95 },
      { average: 79.6 }, // reads "80%", so it counts as 80-89%
      { average: 64.4 },
      { average: 30 },
      { average: 90 },
      { average: null },
    ]);
    assert.deepEqual(
      result.bands.map((band) => [band.key, band.count]),
      [
        ["lowest", 1],
        ["low", 1],
        ["mid", 0],
        ["high", 1],
        ["highest", 2],
      ]
    );
    assert.equal(result.graded, 5);
    assert.equal(result.ungraded, 1);
  });

  it("matches the heatmap's own student averages", () => {
    const heatmap = buildHeatmap(source());
    const result = averageDistribution(heatmap.rows);
    assert.equal(result.graded + result.ungraded, heatmap.rows.length);
    assert.equal(result.ungraded, 1); // Cyrus has no approved grade
  });
});

describe("heatmap scroll state", () => {
  it("reports overflow and which sides have hidden columns", () => {
    assert.deepEqual(scrollStateOf(0, 1000, 1000), { overflowing: false, moreLeft: false, moreRight: false });
    // Sub-pixel rounding is not overflow.
    assert.deepEqual(scrollStateOf(0, 1000.5, 1000), { overflowing: false, moreLeft: false, moreRight: false });
    assert.deepEqual(scrollStateOf(0, 1109, 974), { overflowing: true, moreLeft: false, moreRight: true });
    assert.deepEqual(scrollStateOf(60, 1109, 974), { overflowing: true, moreLeft: true, moreRight: true });
    assert.deepEqual(scrollStateOf(135, 1109, 974), { overflowing: true, moreLeft: true, moreRight: false });
  });
});

describe("conference brief picker", () => {
  it("lists students with an approved grade, grouped by class, sorted by name", () => {
    const classes = buildBriefPicker({
      classes: [
        {
          id: "c1",
          name: "English 10",
          section: "Period 2",
          students: [
            { id: "s-theo", name: "Theo Marchwood" },
            { id: "s-ava", name: "Ava Quillon" },
            { id: "s-new", name: "Bea New" },
          ],
        },
        { id: "c2", name: "Environmental Science", section: null, students: [{ id: "s-iris", name: "Iris Thistledown" }] },
        { id: "c3", name: "Empty Class", section: null, students: [{ id: "s-zed", name: "Zed Nograde" }] },
      ],
      published: [
        { classId: "c1", studentId: "s-theo" },
        { classId: "c1", studentId: "s-ava" },
        { classId: "c1", studentId: "s-ava" },
        { classId: "c2", studentId: "s-iris" },
        // A student who left the class is never listed.
        { classId: "c1", studentId: "s-gone" },
        // A grade from another class doesn't count here.
        { classId: "c2", studentId: "s-zed" },
      ],
    });
    assert.deepEqual(classes, [
      {
        id: "c1",
        label: "English 10 · Period 2",
        students: [
          { id: "s-ava", name: "Ava Quillon", publishedCount: 2 },
          { id: "s-theo", name: "Theo Marchwood", publishedCount: 1 },
        ],
      },
      { id: "c2", label: "Environmental Science", students: [{ id: "s-iris", name: "Iris Thistledown", publishedCount: 1 }] },
    ]);
  });
});
