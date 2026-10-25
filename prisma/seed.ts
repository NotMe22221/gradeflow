// GradeFlow demo seed: `npm run seed` (prisma db push, then this script).
//
// Idempotent and self-resetting. It deletes every row, children first, and
// inserts the fully synthetic demo dataset in one transaction, so running it
// twice leaves the same demo state and a failed run leaves the old data intact.
// Every person, school, place, survey, and story in the dataset is fictional.

import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { DEMO_STUDENT_EMAIL, DEMO_TEACHER_EMAIL } from "../src/lib/constants";
import { findEvidenceSpan } from "../src/lib/grading/evidence";
import { createClock, sum, type Clock } from "./seed-data/helpers";
import { PUBLISHED_HISTORY, type PublishedHistoryEntry } from "./seed-data/history";
import { PAPERS } from "./seed-data/papers";
import { CLASSES, DEMO_TEACHER, STUDENTS, type ClassKey, type StudentKey } from "./seed-data/people";
import { ASSIGNMENTS, type AssignmentKey, type SeedAssignment } from "./seed-data/rubrics";
import { PENDING_SUBMISSIONS, type SeedSubmission } from "./seed-data/submissions";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

// --- Validation ----------------------------------------------------------------
// The dataset is checked before anything is deleted, so a typo in a paper or
// rubric fails loudly instead of seeding inconsistent demo data.

function assignmentByKey(key: AssignmentKey): SeedAssignment {
  const assignment = ASSIGNMENTS.find((candidate) => candidate.key === key);
  if (!assignment) throw new Error(`Unknown assignment "${key}".`);
  return assignment;
}

function validateDataset() {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const submission of [...PENDING_SUBMISSIONS, ...PUBLISHED_HISTORY]) {
    const assignment = assignmentByKey(submission.assignmentKey);
    const klass = CLASSES.find((candidate) => candidate.key === assignment.classKey);
    const pair = `${submission.assignmentKey}/${submission.studentKey}`;
    if (seen.has(pair)) problems.push(`${pair}: duplicate submission.`);
    seen.add(pair);
    if (!klass?.studentKeys.includes(submission.studentKey)) {
      problems.push(`${pair}: student is not enrolled in ${assignment.classKey}.`);
    }
    if (submission.submittedAt.daysAgo < 1) problems.push(`${pair}: submittedAt must be at least a day ago.`);
  }

  for (const entry of PUBLISHED_HISTORY) {
    const pair = `${entry.assignmentKey}/${entry.studentKey}`;
    const content = PAPERS[entry.paperKey];
    const criteria = assignmentByKey(entry.assignmentKey).criteria;
    const rubricKeys = criteria.map((criterion) => criterion.key);
    const extra = Object.keys(entry.scores).filter((key) => !rubricKeys.includes(key));
    if (extra.length > 0) problems.push(`${pair}: scores for unknown criteria ${extra.join(", ")}.`);

    let adjusted = false;
    for (const criterion of criteria) {
      const score = entry.scores[criterion.key];
      if (!score) {
        problems.push(`${pair}: missing a score for "${criterion.key}".`);
        continue;
      }
      for (const [label, value] of [
        ["aiScore", score.aiScore],
        ["finalScore", score.finalScore],
      ] as const) {
        if (!Number.isFinite(value) || value < 0 || value > criterion.maxPoints) {
          problems.push(`${pair}/${criterion.key}: ${label} ${value} is outside 0-${criterion.maxPoints}.`);
        }
      }
      if (score.aiScore !== score.finalScore) adjusted = true;
      // The quote must be a verbatim substring AND pass the app's own matcher,
      // so the review and student views highlight it exactly.
      if (!content.includes(score.aiEvidence) || !findEvidenceSpan(content, score.aiEvidence)) {
        problems.push(`${pair}/${criterion.key}: evidence is not a verbatim quote from the paper.`);
      }
    }
    if (!adjusted) problems.push(`${pair}: the teacher review should adjust at least one score.`);
  }

  if (problems.length > 0) {
    throw new Error(`The demo dataset is inconsistent:\n  - ${problems.join("\n  - ")}`);
  }
}

// --- Seeding -------------------------------------------------------------------

type Tx = Prisma.TransactionClient;

type SeededAssignment = {
  id: string;
  criteria: { id: string; key: string; title: string; maxPoints: number }[];
};

type Ids = {
  teacherId: string;
  students: Map<StudentKey, string>;
  assignments: Map<AssignmentKey, SeededAssignment>;
};

function lookup<K, V>(map: Map<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Seed lookup failed for "${String(key)}".`);
  return value;
}

async function resetDatabase(tx: Tx) {
  // Children first. PublishedGrade.approvedBy has no cascade, so it goes first.
  await tx.publishedGrade.deleteMany();
  await tx.criterionScore.deleteMany();
  await tx.aiGrade.deleteMany();
  await tx.submission.deleteMany();
  await tx.rubricCriterion.deleteMany();
  await tx.assignment.deleteMany();
  await tx.enrollment.deleteMany();
  await tx.class.deleteMany();
  await tx.user.deleteMany();
}

async function seedPeopleAndClasses(tx: Tx, clock: Clock) {
  // Accounts and classes date from the start of the term, about six weeks ago.
  const termStart = clock.at({ daysAgo: 40, hour: 8, minute: 0 });

  const teacher = await tx.user.create({
    data: { name: DEMO_TEACHER.name, email: DEMO_TEACHER.email, role: "TEACHER", createdAt: termStart },
  });

  const students = new Map<StudentKey, string>();
  for (const [index, student] of STUDENTS.entries()) {
    const created = await tx.user.create({
      data: {
        name: student.name,
        email: student.email,
        role: "STUDENT",
        createdAt: clock.plusSeconds(termStart, 60 * (index + 1)),
      },
    });
    students.set(student.key, created.id);
  }

  const classes = new Map<ClassKey, string>();
  for (const [index, klass] of CLASSES.entries()) {
    // Spaced apart so the dashboard's createdAt ordering is stable.
    const createdAt = clock.plusSeconds(termStart, 60 * 60 * (index + 1));
    const created = await tx.class.create({
      data: {
        name: klass.name,
        section: klass.section,
        subject: klass.subject,
        teacherId: teacher.id,
        createdAt,
        enrollments: {
          create: klass.studentKeys.map((key, position) => ({
            studentId: lookup(students, key),
            createdAt: clock.plusSeconds(createdAt, 60 * (position + 1)),
          })),
        },
      },
    });
    classes.set(klass.key, created.id);
  }

  return { teacherId: teacher.id, students, classes };
}

async function seedAssignments(
  tx: Tx,
  clock: Clock,
  classes: Map<ClassKey, string>
): Promise<Map<AssignmentKey, SeededAssignment>> {
  const assignments = new Map<AssignmentKey, SeededAssignment>();
  for (const assignment of ASSIGNMENTS) {
    const created = await tx.assignment.create({
      data: {
        classId: lookup(classes, assignment.classKey),
        title: assignment.title,
        instructions: assignment.instructions,
        dueDate: clock.dueInDays(assignment.dueInDays),
        createdAt: clock.at({ daysAgo: assignment.createdDaysAgo, hour: 7, minute: 45 }),
        criteria: {
          create: assignment.criteria.map((criterion, position) => ({
            title: criterion.title,
            description: criterion.description,
            maxPoints: criterion.maxPoints,
            position,
          })),
        },
      },
      include: { criteria: { orderBy: { position: "asc" } } },
    });
    assignments.set(assignment.key, {
      id: created.id,
      criteria: created.criteria.map((criterion) => ({
        id: criterion.id,
        key: assignment.criteria[criterion.position].key,
        title: criterion.title,
        maxPoints: criterion.maxPoints,
      })),
    });
  }
  return assignments;
}

/** Papers waiting for the AI first pass: no AiGrade or CriterionScore rows. */
async function seedPendingSubmission(tx: Tx, clock: Clock, ids: Ids, submission: SeedSubmission) {
  const submittedAt = clock.at(submission.submittedAt);
  await tx.submission.create({
    data: {
      assignmentId: lookup(ids.assignments, submission.assignmentKey).id,
      studentId: lookup(ids.students, submission.studentKey),
      content: PAPERS[submission.paperKey],
      fileName: submission.fileName,
      submittedAt,
      status: "SUBMITTED",
      updatedAt: submittedAt,
    },
  });
}

/**
 * A past teacher approval, recreated: the AI suggestion, the teacher's final
 * values, the approval, and the published snapshot, shaped exactly as
 * approveAndPublish() and publishApprovedGrade() would have left them.
 */
async function seedPublishedHistory(tx: Tx, clock: Clock, ids: Ids, entry: PublishedHistoryEntry) {
  const assignment = lookup(ids.assignments, entry.assignmentKey);
  const content = PAPERS[entry.paperKey];
  const submittedAt = clock.at(entry.submittedAt);
  const aiGradedAt = clock.at(entry.aiGradedAt);
  const approvedAt = clock.at(entry.approvedAt);

  // In rubric order. The approved comment is the teacher's own, or the AI
  // justification the review screen pre-fills when the teacher keeps it.
  const rows = assignment.criteria.map((criterion) => {
    const score = entry.scores[criterion.key];
    return {
      criterion,
      score,
      comment: (score.finalComment ?? score.aiJustification).trim(),
      evidenceFound: findEvidenceSpan(content, score.aiEvidence) !== null,
    };
  });

  const submission = await tx.submission.create({
    data: {
      assignmentId: assignment.id,
      studentId: lookup(ids.students, entry.studentKey),
      content,
      fileName: entry.fileName,
      submittedAt,
      status: "PUBLISHED",
      teacherFeedback: entry.feedback,
      approvedAt,
      approvedById: ids.teacherId,
      updatedAt: approvedAt,
    },
  });

  await tx.aiGrade.create({
    data: {
      submissionId: submission.id,
      grader: "demo",
      model: null,
      confidence: entry.confidence,
      overallComment: entry.overallComment,
      flags: "[]",
      createdAt: aiGradedAt,
    },
  });

  await tx.criterionScore.createMany({
    data: rows.map(({ criterion, score, comment, evidenceFound }) => ({
      submissionId: submission.id,
      criterionId: criterion.id,
      aiScore: score.aiScore,
      aiJustification: score.aiJustification,
      aiEvidence: score.aiEvidence,
      evidenceFound,
      finalScore: score.finalScore,
      finalComment: comment,
    })),
  });

  const breakdown = rows.map(({ criterion, score, comment }) => ({
    criterionId: criterion.id,
    title: criterion.title,
    maxPoints: criterion.maxPoints,
    score: score.finalScore,
    comment,
  }));

  await tx.publishedGrade.create({
    data: {
      submissionId: submission.id,
      totalScore: sum(rows.map(({ score }) => score.finalScore)),
      maxScore: sum(rows.map(({ criterion }) => criterion.maxPoints)),
      breakdown: JSON.stringify(breakdown),
      feedback: entry.feedback,
      aiTotalScore: sum(rows.map(({ score }) => score.aiScore)),
      approvedById: ids.teacherId,
      approvedAt,
      // Approving publishes in the same step, so both share one timestamp.
      publishedAt: approvedAt,
    },
  });
}

async function seed() {
  validateDataset();
  const clock = createClock();

  await prisma.$transaction(
    async (tx) => {
      await resetDatabase(tx);
      const { classes, ...people } = await seedPeopleAndClasses(tx, clock);
      const ids: Ids = { ...people, assignments: await seedAssignments(tx, clock, classes) };
      for (const submission of PENDING_SUBMISSIONS) await seedPendingSubmission(tx, clock, ids, submission);
      for (const entry of PUBLISHED_HISTORY) await seedPublishedHistory(tx, clock, ids, entry);
    },
    { maxWait: 10_000, timeout: 60_000 }
  );

  const [teachers, students, classCount, assignments, criteria, waiting, published, publishedGrades] =
    await Promise.all([
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.class.count(),
      prisma.assignment.count(),
      prisma.rubricCriterion.count(),
      prisma.submission.count({ where: { status: "SUBMITTED" } }),
      prisma.submission.count({ where: { status: "PUBLISHED" } }),
      prisma.publishedGrade.count(),
    ]);

  console.log(
    [
      "",
      "GradeFlow demo data is ready.",
      `  ${teachers} teacher: ${DEMO_TEACHER.name} <${DEMO_TEACHER_EMAIL}>`,
      `  ${students} students in ${classCount} classes (demo student: ${DEMO_STUDENT_EMAIL})`,
      `  ${assignments} assignments with ${criteria} rubric criteria`,
      `  ${waiting + published} submissions: ${waiting} waiting for the AI first pass, ${published} published (${publishedGrades} grades in the gradebook)`,
      "",
      "Run npm run dev and click View the demo.",
      "",
    ].join("\n")
  );
}

try {
  await seed();
} catch (error) {
  console.error("\nSeeding failed. The previous data was left unchanged.\n");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
