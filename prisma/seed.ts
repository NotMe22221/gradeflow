// Markwise demo seed.
//
//   npm run seed            (= tsx prisma/seed.ts --push-schema) resets the demo on
//                           Prisma's local dev server: `prisma db push`, then this script.
//   --if-empty              (the Vercel build) seeds only a database with no users
//                           yet and never erases anything, so redeploys keep data.
//
// Idempotent and self-resetting. It deletes every row, children first, and
// inserts the fully synthetic demo dataset in one transaction, so running it
// twice leaves the same demo state and a failed run leaves the old data intact.
// Every person, school, place, survey, quiz answer, and story in the dataset
// is fictional.
//
// It never erases a database other than Prisma's local dev server: a hosted or
// shared one (say, after `vercel env pull`) can only be seeded while empty
// (--if-empty). There is deliberately no override. To start a hosted demo
// over, point the app at a new, empty database instead (see the README).

import "./load-env";

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { DEMO_STUDENT_EMAIL, DEMO_TEACHER_EMAIL } from "../src/lib/constants";
import { DATABASE_URL, poolSettings, USES_LOCAL_DATABASE } from "../src/lib/db-url";
import { serializeBreakdown, type BreakdownItem } from "../src/lib/grades/breakdown";
import { findEvidenceSpan } from "../src/lib/grading/evidence";
import { SAMPLE_TEST_PHOTOS } from "../src/lib/scan/samples";
import {
  assignmentByKey,
  PENDING,
  PUBLISHED,
  publishedTotals,
  submissionKey,
  TERM_START,
  type SeedPending,
  type SeedPublished,
} from "./seed-data/dataset";
import { STUDENT_GOALS, type ActivityRef, type SeedActivity } from "./seed-data/engagement";
import { createClock, type Clock } from "./seed-data/helpers";
import { CLASSES, DEMO_TEACHER, STUDENTS, type ClassKey, type StudentKey } from "./seed-data/people";
import { ASSIGNMENTS, type AssignmentKey } from "./seed-data/rubrics";
import { engagementFor, questionAverage, validateDataset } from "./seed-data/validate";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL, ...poolSettings(DATABASE_URL, USES_LOCAL_DATABASE) }),
});

const ARGS = process.argv.slice(2);
/** Seed only a database with no users yet; never erase anything. */
const IF_EMPTY = ARGS.includes("--if-empty");
/** Run `prisma db push` first (npm run seed), once the target is confirmed. */
const PUSH_SCHEMA = ARGS.includes("--push-schema");

/**
 * Concurrent seeds (two Vercel builds on one empty database) take turns on
 * this transaction-scoped advisory lock. Released at commit or rollback, so it
 * also works through a transaction-mode pooler such as Neon's.
 */
const SEED_LOCK_KEY = 724_242;

type Tx = Prisma.TransactionClient;

type SeededAssignment = {
  id: string;
  criteria: { id: string; key: string; title: string; maxPoints: number }[];
};

type Ids = {
  teacherId: string;
  students: Map<StudentKey, string>;
  classes: Map<ClassKey, string>;
  assignments: Map<AssignmentKey, SeededAssignment>;
  /** Keyed by submissionKey(assignmentKey, studentKey). */
  submissions: Map<string, string>;
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
  await tx.submissionImage.deleteMany();
  await tx.studyActivity.deleteMany();
  await tx.studentGoal.deleteMany();
  await tx.userPreferences.deleteMany();
  await tx.submission.deleteMany();
  await tx.rubricCriterion.deleteMany();
  await tx.assignment.deleteMany();
  await tx.enrollment.deleteMany();
  await tx.class.deleteMany();
  await tx.user.deleteMany();
}

async function seedPeopleAndClasses(tx: Tx, clock: Clock) {
  // Accounts and classes date from the start of the term, about six weeks ago.
  const termStart = clock.at(TERM_START);

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
        kind: assignment.kind,
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
async function seedPendingSubmission(tx: Tx, clock: Clock, ids: Ids, submission: SeedPending) {
  const submittedAt = clock.at(submission.submittedAt);
  const created = await tx.submission.create({
    data: {
      assignmentId: lookup(ids.assignments, submission.assignmentKey).id,
      studentId: lookup(ids.students, submission.studentKey),
      content: submission.content,
      fileName: submission.fileName,
      source: "TEXT",
      submittedAt,
      status: "SUBMITTED",
      updatedAt: submittedAt,
    },
  });
  ids.submissions.set(submissionKey(submission.assignmentKey, submission.studentKey), created.id);
}

/**
 * A past teacher approval, recreated: the AI suggestion, the teacher's final
 * values, the approval, and the published snapshot, shaped exactly as
 * approveAndPublish() and publishApprovedGrade() would have left them. For a
 * scanned quiz the content is the transcription; history keeps no photos.
 */
async function seedPublished(tx: Tx, clock: Clock, ids: Ids, record: SeedPublished) {
  const assignment = lookup(ids.assignments, record.assignmentKey);
  const submittedAt = clock.at(record.submittedAt);
  const aiGradedAt = clock.at(record.aiGradedAt);
  const approvedAt = clock.at(record.approvedAt);

  // In rubric order. The approved comment is the teacher's own, or the AI
  // justification the review screen pre-fills when the teacher keeps it.
  const rows = assignment.criteria.map((criterion) => {
    const score = record.scores[criterion.key];
    return {
      criterion,
      score,
      comment: (score.finalComment ?? score.aiJustification).trim(),
      evidenceFound: findEvidenceSpan(record.content, score.aiEvidence) !== null,
    };
  });

  const submission = await tx.submission.create({
    data: {
      assignmentId: assignment.id,
      studentId: lookup(ids.students, record.studentKey),
      content: record.content,
      fileName: record.fileName,
      source: record.source,
      submittedAt,
      status: "PUBLISHED",
      teacherFeedback: record.feedback,
      approvedAt,
      approvedById: ids.teacherId,
      updatedAt: approvedAt,
    },
  });
  ids.submissions.set(submissionKey(record.assignmentKey, record.studentKey), submission.id);

  await tx.aiGrade.create({
    data: {
      submissionId: submission.id,
      grader: "demo",
      model: null,
      confidence: record.confidence,
      overallComment: record.overallComment,
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

  const breakdown: BreakdownItem[] = rows.map(({ criterion, score, comment }) => ({
    criterionId: criterion.id,
    title: criterion.title,
    maxPoints: criterion.maxPoints,
    score: score.finalScore,
    comment,
  }));
  const totals = publishedTotals(record);

  await tx.publishedGrade.create({
    data: {
      submissionId: submission.id,
      totalScore: totals.total,
      maxScore: totals.max,
      breakdown: serializeBreakdown(breakdown),
      feedback: record.feedback,
      aiTotalScore: totals.aiTotal,
      approvedById: ids.teacherId,
      approvedAt,
      // Approving publishes in the same step, so both share one timestamp.
      publishedAt: approvedAt,
    },
  });
}

function resolveRef(ids: Ids, ref: ActivityRef): string {
  switch (ref.type) {
    case "submission":
      return lookup(ids.submissions, submissionKey(ref.assignmentKey, ref.studentKey));
    case "assignment":
      return lookup(ids.assignments, ref.assignmentKey).id;
    case "class":
      return lookup(ids.classes, ref.classKey);
  }
}

/** XP history, written as awardXp() would have: one row per earning action. */
async function seedActivities(tx: Tx, ids: Ids, activities: SeedActivity[]) {
  await tx.studyActivity.createMany({
    data: activities.map((activity) => ({
      studentId: lookup(ids.students, activity.studentKey),
      kind: activity.kind,
      xp: activity.xp,
      refId: resolveRef(ids, activity.ref),
      createdAt: activity.at,
    })),
  });
}

/** Saved planner goals, as the goal planner's upsert would have left them. */
async function seedGoals(tx: Tx, clock: Clock, ids: Ids) {
  for (const goal of STUDENT_GOALS) {
    await tx.studentGoal.create({
      data: {
        studentId: lookup(ids.students, goal.studentKey),
        classId: lookup(ids.classes, goal.classKey),
        rawText: goal.rawText,
        targetPercent: goal.targetPercent,
        targetLabel: goal.targetLabel,
        createdAt: clock.at(goal.createdAt),
        updatedAt: clock.at(goal.updatedAt),
      },
    });
  }
}

// --- Summary -----------------------------------------------------------------------

function percent(value: number | null): string {
  return value === null ? "n/a" : `${Math.round(value)}%`;
}

/** "Q5 25%, Q7 39%": the most missed questions of a seeded quiz. */
function mostMissed(key: AssignmentKey, limit: number): string {
  return assignmentByKey(key)
    .criteria.map((criterion, index) => ({ label: `Q${index + 1}`, average: questionAverage(key, criterion.key) ?? 100 }))
    .sort((a, b) => a.average - b.average)
    .slice(0, limit)
    .map((entry) => `${entry.label} ${percent(entry.average)}`)
    .join(", ");
}

async function printSummary(clock: Clock, activities: SeedActivity[]) {
  const [
    teachers,
    students,
    classCount,
    essays,
    tests,
    criteria,
    waiting,
    published,
    scanned,
    publishedGrades,
    images,
    activityCount,
    goals,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.class.count(),
    prisma.assignment.count({ where: { kind: "ESSAY" } }),
    prisma.assignment.count({ where: { kind: "TEST" } }),
    prisma.rubricCriterion.count(),
    prisma.submission.count({ where: { status: "SUBMITTED" } }),
    prisma.submission.count({ where: { status: "PUBLISHED" } }),
    prisma.submission.count({ where: { source: "SCAN" } }),
    prisma.publishedGrade.count(),
    prisma.submissionImage.count(),
    prisma.studyActivity.count(),
    prisma.studentGoal.count(),
  ]);

  const describe = (key: StudentKey) => {
    const snapshot = engagementFor(activities, key, clock.now);
    const streak = snapshot.streak.current > 0 ? `${snapshot.streak.current}-day streak` : "streak broken";
    return `Level ${snapshot.level}, ${snapshot.xp} XP, ${streak}${snapshot.streak.activeToday ? " (active today)" : ""}`;
  };
  const ava = STUDENTS[0];
  const goal = STUDENT_GOALS[0];
  const goalStudent = STUDENTS.find((student) => student.key === goal.studentKey);
  const unit3 = assignmentByKey("unit3Quiz");
  const samples = SAMPLE_TEST_PHOTOS.filter((sample) => sample.assignmentTitle === unit3.title);

  console.log(
    [
      "",
      "Markwise demo data is ready.",
      `  ${teachers} teacher: ${DEMO_TEACHER.name} <${DEMO_TEACHER_EMAIL}>`,
      `  ${students} students in ${classCount} classes (demo student: ${DEMO_STUDENT_EMAIL})`,
      `  ${essays + tests} assignments (${essays} essays, ${tests} paper quizzes) with ${criteria} rubric criteria`,
      `  ${waiting + published} submissions: ${waiting} waiting for the AI first pass, ${published} published (${scanned} scanned quizzes; ${publishedGrades} grades in the gradebook)`,
      `  ${images} stored photos, ${activityCount} XP events, ${goals} saved goal${goals === 1 ? "" : "s"}`,
      "",
      "Demo flows:",
      `  Paper Scanner: "${unit3.title}" (Environmental Science) has no submissions.`,
      ...samples.map((sample) => `    Scan ${sample.src.replace(/^\//, "public/")} for ${sample.studentName}.`),
      `  Class heatmap: Grammar and Vocabulary Quiz 1 most missed ${mostMissed("grammarQuiz1", 2)}; Water Cycle quiz ${mostMissed("waterCycleQuiz", 1)}.`,
      `  Student view: ${ava.name}: ${describe(ava.key)}.`,
      `  Goal planner: ${goalStudent?.name ?? goal.studentKey} has a saved goal ("${goal.rawText}", ${goal.targetLabel} = ${goal.targetPercent}%): ${describe(goal.studentKey)}.`,
      "",
      "Run npm run dev and click View the demo.",
      "",
    ].join("\n")
  );
}

/** Seeds the demo data; false when --if-empty found data (under the lock) and left it alone. */
async function seed(): Promise<boolean> {
  const clock = createClock();
  // Checked before anything is deleted; also plans the XP history.
  const activities = validateDataset(clock);

  const seeded = await prisma.$transaction(
    async (tx) => {
      // One seed at a time. A concurrent seed waits here, and the count below
      // then sees what it committed (READ COMMITTED: each statement takes a
      // fresh snapshot), so two --if-empty builds never both seed.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SEED_LOCK_KEY})`;
      // Every row belongs to a user, so no users means an empty database.
      if (IF_EMPTY && (await tx.user.count()) > 0) return false;
      await resetDatabase(tx);
      const { classes, ...people } = await seedPeopleAndClasses(tx, clock);
      const ids: Ids = {
        ...people,
        classes,
        assignments: await seedAssignments(tx, clock, classes),
        submissions: new Map(),
      };
      for (const submission of PENDING) await seedPendingSubmission(tx, clock, ids, submission);
      for (const record of PUBLISHED) await seedPublished(tx, clock, ids, record);
      await seedActivities(tx, ids, activities);
      await seedGoals(tx, clock, ids);
      return true;
    },
    // Generous: a hosted database is a network hop away for every insert, and
    // a concurrent build may wait here for another seed to finish.
    { maxWait: 30_000, timeout: 180_000 }
  );

  if (seeded) await printSummary(clock, activities);
  return seeded;
}

// --- Run -----------------------------------------------------------------------------

/** "host:port/database" for messages: never the user name or password. */
function describeDatabase(url: string): string {
  try {
    const parsed = new URL(url);
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    return `${parsed.host}${database ? `/${database}` : ""}`;
  } catch {
    return "(an unreadable DATABASE_URL)";
  }
}

/** `prisma db push` with the same configuration (prisma.config.ts); true when it succeeded. */
function pushSchema(): boolean {
  const require = createRequire(import.meta.url);
  const prismaBin = path.join(path.dirname(require.resolve("prisma/package.json")), "build", "index.js");
  return spawnSync(process.execPath, [prismaBin, "db", "push"], { stdio: "inherit" }).status === 0;
}

const target = describeDatabase(DATABASE_URL);
const SKIPPED = USES_LOCAL_DATABASE
  ? "The database already has data, so the demo seed was skipped. Run `npm run seed` to reset it."
  : `The database at ${target} already has data, so the demo seed was skipped (--if-empty never erases anything).`;

if (!IF_EMPTY && !USES_LOCAL_DATABASE) {
  // Before the schema push and before any connection: nothing has changed yet.
  console.error(
    [
      "",
      `Stopped: the database at ${target} isn't the local dev server, and the seed only`,
      "ever erases the local dev server. Nothing was changed. A hosted or shared database is",
      "seeded once, while it is empty, by the Production build (--if-empty).",
      "",
      "To seed the local dev server, unset DATABASE_URL (in .env.local, .env, or your shell).",
      "To start a hosted demo over, point the app at a new, empty database and redeploy.",
      "",
    ].join("\n")
  );
  process.exit(1);
}

try {
  if (PUSH_SCHEMA && !pushSchema()) {
    console.error("\nThe schema couldn't be updated (see above), so the demo data wasn't loaded.\n");
    process.exitCode = 1;
  } else if (IF_EMPTY && (await prisma.user.count()) > 0) {
    // Fast path; seed() checks again under the lock.
    console.log(SKIPPED);
  } else if (!(await seed())) {
    console.log(SKIPPED);
  }
} catch (error) {
  console.error("\nSeeding failed. The previous data was left unchanged.\n");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
