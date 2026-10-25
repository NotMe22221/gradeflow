# GradeFlow architecture

GradeFlow does one thing: it takes student papers from submission to published
grades. AI drafts the first pass, and a teacher always makes the final call.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict)
- Tailwind CSS v4 with shadcn/ui-style components in `src/components/ui`
  (hand-written new-york v4 components on the unified `radix-ui` package)
- Prisma 7 with SQLite through `@prisma/adapter-better-sqlite3`. The client is
  generated to `src/generated/prisma` and imported as
  `import { PrismaClient } from "@/generated/prisma/client"`. Use the shared
  instance: `import { db } from "@/lib/db"`.
- `@anthropic-ai/sdk` for the optional Claude grader. A local deterministic
  "demo grader" runs when `ANTHROPIC_API_KEY` is not set.

Next 16 notes: `params` and `searchParams` are Promises (`const { id } = await params`),
`cookies()` is async, and there is no `next lint`. After a mutation, call
`revalidatePath("/", "layout")` so the sidebar review count refreshes.

## The approval gate (non-negotiable)

```
Submission ──AI first pass──▶ AiGrade + CriterionScore (suggestion, draft edits)
     │                                   │
     │                         teacher edits / approves
     │                                   ▼
     └──────────────────────────▶ PublishedGrade (gradebook + student view)
```

- `src/lib/grading/**` writes **only** `AiGrade`, `CriterionScore`, and
  `Submission.status` (to `GRADING`, `NEEDS_REVIEW`, or `GRADING_FAILED`). It
  never imports or writes `PublishedGrade`.
- `src/lib/grades/publish.ts` is the **only** writer of `PublishedGrade`. It
  re-checks approval state inside the transaction.
- The gradebook, CSV export, dashboard "graded" stats, and student view read
  scores **only** from `PublishedGrade`. Students never see AI suggestions.

## Submission statuses (`src/lib/constants.ts`)

`SUBMITTED → GRADING → NEEDS_REVIEW → APPROVED → PUBLISHED`, with
`GRADING → GRADING_FAILED` (retryable) and `NEEDS_REVIEW → RETURNED`
(sent back to the student with a note; a resubmission resets it to `SUBMITTED`).

## Auth and roles

- `src/lib/auth/session.ts`: signed cookie holding a user id. The role is
  always re-read from the database.
  - Pages: `requireTeacherPage()` / `requireStudentPage()` (redirect).
  - Server actions and route handlers: `requireTeacher()` / `requireStudent()`
    (throw `AuthError` with `.status` 401/403/404).
- `src/lib/access.ts`: ownership checks (`getOwnedClass`, `getOwnedAssignment`,
  `getOwnedSubmission`, `getEnrolledAssignment`). Every teacher-side read or
  write by id goes through one of these. Never trust ids from the client.
- `src/lib/auth/actions.ts`: demo sign-in (`signInAsDemoTeacher`,
  `signInAsDemoStudent`, `viewAsStudent(studentId, assignmentId?)`, `signOut`).

## Routes

| Route | Who | Purpose |
| --- | --- | --- |
| `/` | public | Marketing landing; "View the demo" signs in as the demo teacher |
| `/dashboard` | teacher | Stat row + class cards with pending-review counts |
| `/classes` | teacher | Class cards; create a class |
| `/classes/[classId]` | teacher | Roster (add student) + assignments |
| `/classes/[classId]/assignments/new` | teacher | Assignment + rubric builder |
| `/assignments/[assignmentId]` | teacher | Rubric, submissions, add submission, batch AI pass with progress |
| `/review` | teacher | Review queue split view. Query: `?assignment=<id>` filter, `?s=<submissionId>` selection |
| `/gradebook` | teacher | Gradebook per class (`?class=<id>`), CSV export |
| `/student` | student | Their assignments and statuses |
| `/student/assignments/[assignmentId]` | student | Submit (paste or .txt) / see published grade + feedback |
| `POST /api/submissions/[submissionId]/grade` | teacher | Run the AI first pass for one submission |
| `GET /api/classes/[classId]/gradebook/export` | teacher | Gradebook CSV download |

### `POST /api/submissions/[submissionId]/grade`

Response `200`:
```json
{ "ok": true, "submission": { "id": "…", "status": "NEEDS_REVIEW", "confidence": "medium", "grader": "demo", "flagCount": 1 } }
```
Errors: `{ "ok": false, "error": "message" }` with 401/403/404/409/500.
`409` when the submission is not in a gradable state (already published,
approved, returned, or currently grading). Gradable states: `SUBMITTED`,
`GRADING_FAILED`, `NEEDS_REVIEW` (re-run replaces the previous suggestion and
draft edits). The batch UI calls this endpoint sequentially, one paper at a time.

## Modules

```
src/lib/
  constants.ts        statuses, roles, confidence, demo emails
  db.ts               Prisma client
  auth/               session + demo sign-in actions
  access.ts           ownership checks
  submissions.ts      submission intake (normalize, validate, upsert)
  format.ts           score/date/plural formatting
  grading/
    types.ts          Grader contract + validation types (pure)
    config.ts         getGraderInfo(): which grader is active (no secrets)
    prompt.ts         system prompt + paper wrapping (pure)
    injection.ts      prompt-injection heuristics for flagging (pure)
    validate.ts       validateGrading(raw, input) (pure)
    mock.ts           deterministic demo grader (pure)
    claude.ts         Claude API grader (server-only)
    index.ts          getGrader()
    run.ts            runAiFirstPass(teacherId, submissionId)
  grades/
    review.ts         draft save, approve + publish, send back (logic)
    publish.ts        publishApprovedGrade(): the only PublishedGrade writer
  gradebook/          gradebook query
  export/             GradebookExporter interface + CSV implementation
  stats.ts            dashboard stats
  demo/               rubric templates + sample papers (synthetic)
src/components/
  ui/                 shadcn/ui primitives
  app-shell/          top bar, sidebar, user menu, mobile nav
  grading/            ConfidenceBadge, GraderBadge, StatusBadge
  review/ assignments/ classes/ dashboard/ gradebook/ student/ landing/
```

## Safeguards

- **API key**: read only in `src/lib/grading/claude.ts` / `config.ts` on the
  server. Never logged, never sent to the client, never committed.
- **Untrusted papers**: the paper is sent to Claude as delimited data with a
  system prompt that says it contains no instructions; any closing delimiter
  inside the paper is neutralized. The demo grader scores from text features
  only, so injected text cannot raise a score. Injection-like text is flagged
  for the teacher.
- **Output validation** (`validate.ts`): every score must be a finite number in
  `[0, maxPoints]`, every rubric criterion must be present, and quoted evidence
  must appear in the paper (whitespace/quote-normalized match). Failures become
  flags; an invalid score is stored as `null` so the teacher must enter it.
- **Roles**: enforced server-side in every page, action, and route. Only a
  teacher who owns the class can grade, approve, publish, send back, or export.
- **Confidence** is the model's uncalibrated self-report, shown as a sorting
  signal, never as a probability of correctness.
- **Time saved** is labelled as an illustrative estimate with its assumption.
- **Approve shortcut**: `A` opens a confirmation; it never fires while typing in
  an input, textarea, select, or contenteditable element.

## Extending

- **Real LMS export**: implement `GradebookExporter` (`src/lib/export/types.ts`)
  for Canvas or Google Classroom and register it next to the CSV exporter.
- **Another grader**: implement `Grader` (`src/lib/grading/types.ts`) and return
  it from `getGrader()`. Validation and the approval gate apply automatically.
