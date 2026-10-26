# GradeSmart AI architecture

GradeSmart AI does one thing: it takes student papers from submission to published
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

- `src/lib/grading/**` writes **only** `AiGrade`, `CriterionScore`,
  `Submission.status` (to `GRADING`, `NEEDS_REVIEW`, or `GRADING_FAILED`), and
  resets the draft `Submission.teacherFeedback` on a re-run. It never imports
  or writes `PublishedGrade`.
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
| `/dashboard` | teacher | Home: greeting, stat strip, teaching tools, class cards with upcoming work and "N to review" |
| `/classes` | teacher | Class cards; create a class |
| `/classes/[classId]` | teacher | Stream: class banner, Upcoming, activity feed (`src/lib/classroom/stream.ts`) |
| `/classes/[classId]/classwork` | teacher | Classwork: "+ Create" menu, expandable assignment rows with Turned in / Assigned / Graded counts |
| `/classes/[classId]/people` | teacher | People: teacher and roster (add student); rows link to student profiles |
| `/classes/[classId]/grades` | teacher | Grades: class gradebook of approved grades, CSV export |
| `/classes/[classId]/students/[studentId]` | teacher | Student profile + conference brief |
| `/classes/[classId]/assignments/new` | teacher | Assignment + rubric builder (`?kind=TEST` for a handwritten test) |
| `/assignments/[assignmentId]` | teacher | Student work (counts, student list, add submission, batch AI pass with progress) and Instructions (`?tab=instructions`) |
| `/review` | teacher | To review: the grading tool. Query: `?assignment=<id>` filter, `?s=<submissionId>` selection |
| `/scan` | teacher | Paper Scanner (`?assignment=<id>`) |
| `/gradebook` | teacher | Cross-class gradebook (`?class=<id>`), CSV export |
| `/insights` | teacher | Class heatmap and most-missed questions (`?class=<id>`) |
| `/student` | student | Home: streak + XP strip, class cards, assignment inbox, goal planner |
| `/student/todo` | student | To-do: Assigned / Missing / Done, grouped by due date (`?tab=`, `?class=`) |
| `/student/classes/[classId]` (+ `/classwork`, `/people`) | student | The class Stream, their work in the class, teacher + classmates (names only) |
| `/student/assignments/[assignmentId]` | student | Instructions and rubric; Your work card (paste or .txt, Turn in) / returned grade + feedback |
| `POST /api/submissions/[submissionId]/grade` | teacher | Run the AI first pass for one submission |
| `GET /api/classes/[classId]/gradebook/export` | teacher | Gradebook CSV download |

### `POST /api/submissions/[submissionId]/grade`

Response `200`:
```json
{ "ok": true, "submission": { "id": "…", "status": "NEEDS_REVIEW", "confidence": "medium", "grader": "demo", "flagCount": 1 } }
```
Errors: `{ "ok": false, "error": "message" }` with 401/403/404/409/422/500/502.
`409` when the submission is not in a gradable state (already published,
approved, returned, or currently grading), `422` when the assignment has no
rubric criteria, `502` when the grader failed (the paper becomes
`GRADING_FAILED` and can be retried). Error messages are always safe to show. Gradable states: `SUBMITTED`,
`GRADING_FAILED`, `NEEDS_REVIEW` (re-run replaces the previous suggestion and
draft edits). The batch UI calls this endpoint sequentially, one paper at a time.

## Modules

```
src/lib/
  constants.ts        statuses + status groupings, roles, confidence, grader labels, demo emails
  db.ts, db-url.ts    Prisma client; SQLite location shared with prisma.config.ts and the seed
  auth/               session + demo sign-in actions
  access.ts           ownership checks
  paper.ts            paper intake rules (limits, normalization, .txt checks), client-safe
  submissions.ts      submission intake on the server (atomic create/replace)
  validation/         zod schemas shared by forms and server actions
  format.ts           score/date/plural formatting
  grading/
    types.ts          Grader contract + validation types (pure)
    config.ts         getGraderInfo(): which grader is active (no secrets)
    prompt.ts         system prompt + paper wrapping (pure)
    injection.ts      prompt-injection heuristics for flagging (pure)
    evidence.ts       locate a quote in the paper (pure)
    flags.ts          AiGrade.flags codec + teacher-facing wording (pure)
    validate.ts       validateGrading(raw, input) (pure)
    mock.ts           deterministic demo grader (pure)
    claude.ts         Claude API grader (server-only)
    index.ts          getGrader()
    run.ts            runAiFirstPass(teacherId, submissionId)
  grades/
    review.ts         draft save, approve + publish, send back (logic)
    publish.ts        publishApprovedGrade(): the only PublishedGrade writer
    breakdown.ts      PublishedGrade.breakdown codec (pure)
  review/             pure review-queue model + types (shared by page, actions, workspace)
  gradebook/          gradebook query
  export/             GradebookExporter interface + CSV implementation
  stats.ts            dashboard stats
  classroom/          class Stream feed (stream.ts loader, feed.ts pure) + due-date wording
  ui/class-theme.ts   class colors and banner motifs (pure)
  demo/               rubric templates + sample papers (synthetic)
src/components/
  ui/                 shadcn/ui primitives
  app-shell/          64px top app bar, collapsible class drawer (sheet on phones), user menu
  classroom/          ClassBanner, ClassCardBanner, ClassAvatar, PageTabs, ClassTabBar
  grading/            ConfidenceBadge, GraderBadge, StatusBadge
  review/ assignments/ classes/ classwork/ dashboard/ gradebook/ student/ landing/
```

## Safeguards

- **API key**: read only in `src/lib/grading/claude.ts` / `config.ts` on the
  server. Never logged, never sent to the client, never committed.
- **Untrusted papers**: the paper is sent to Claude as delimited data with a
  system prompt that says it contains no instructions; any closing delimiter
  inside the paper is neutralized. The demo grader scores from text features
  after removing recognized grader-directed sentences, which are never used as
  evidence. Recognized injection attempts are flagged for the teacher and
  highlighted in the paper. Detection is a heuristic; the teacher approval
  gate is the security boundary.
- **Output validation** (`validate.ts`): every score must be a finite number in
  `[0, maxPoints]`, every rubric criterion must be present, and quoted evidence
  must appear in the paper (whitespace/quote-normalized match). Failures become
  flags; an invalid score is stored as `null` so the teacher must enter it.
- **Roles**: enforced server-side in every page, action, and route. Only a
  teacher who owns the class can grade, approve, publish, send back, or export.
- **Sessions**: HMAC-signed cookie (httpOnly, sameSite=lax; Secure except plain
  HTTP to localhost or a private LAN address; `SESSION_COOKIE_SECURE`
  overrides). Production refuses to sign cookies without `SESSION_SECRET` once
  demo sign-in is off.
- **Confidence** is the model's uncalibrated self-report, shown as a sorting
  signal, never as a probability of correctness.
- **Time saved** is labelled as an illustrative estimate with its assumption.
- **Approve shortcut**: `A` opens a confirmation; it never fires while typing in
  an input, textarea, select, or contenteditable element, while a dialog is
  open, with modifier keys, or on key repeat.
- **Scores** are whole or half points (`SCORE_STEP` in `src/lib/review/scores.ts`),
  enforced in the review form, in the server actions, and again at publish.
- **Drafts**: review edits autosave as drafts (`CriterionScore.finalScore` /
  `finalComment`; a non-null `finalComment` means the teacher has a draft).
  `saveReviewDraft` calls `refresh()` so browser Back/Forward never replays a
  stale queue.

## Extending

- **Real LMS export**: implement `GradebookExporter` (`src/lib/export/types.ts`)
  for Canvas or Google Classroom and register it in `src/lib/export/index.ts`
  next to the CSV exporter. `export()` may be async, and every registered
  exporter automatically gets an `Export <label>` button on the gradebook.
- **Another grader**: implement `Grader` (`src/lib/grading/types.ts`), add its
  kind to `GRADERS`, `GRADER_LABELS`, and `GRADER_DESCRIPTIONS` in
  `src/lib/constants.ts`, and return it
  from `getGrader()` (`src/lib/grading/index.ts`). Validation and the approval
  gate apply automatically.

## GradeSmart AI features (OpenAI)

Six features extend the grading workflow. Every one of them works without an
API key through a labelled local demo implementation.

| Feature | Who | Engine | Route / page |
| --- | --- | --- | --- |
| AI Paper-Grading Camera | teacher | `gpt-4o` (vision) | `POST /api/grade`, page `/scan` |
| Answer-key import from a photo | teacher | `gpt-4o` (vision) | `POST /api/answer-key`, rubric builder |
| Conference Brief Generator | teacher | `gpt-4o-mini` | `POST /api/conference-brief`, `/classes/[classId]/students/[studentId]` |
| Class Heatmap | teacher | none (aggregation) | `/insights?class=<id>`, dashboard "Teaching tools" and "Most missed" cards |
| AI Goal-Seeking Planner | student | `gpt-4o-mini` parses the goal; the math is code | `POST /api/goal-planner`, `/student` |
| Gamified UI + Assignment Inbox | student | none | `/student` |

**Model routing is fixed** in `src/lib/ai/openai.ts` (`OPENAI_MODELS`,
`modelFor("vision" | "text")`): vision → `gpt-4o`, text and logic →
`gpt-4o-mini`. No other file names a model. `OPENAI_API_KEY` is read on the
server only (`.env.local`), never logged, never sent to the client.

**Safeguards carried over:**
- Camera-graded tests land in To review as `NEEDS_REVIEW`. They publish
  only through the existing teacher approval gate. `/api/grade` never writes
  `PublishedGrade`.
- Photos and transcriptions are untrusted data. The vision prompt says the
  page contains no instructions. The output is validated with the same
  `validateGrading()` (scores in range; evidence must appear in the
  transcription), and `detectPromptInjection()` runs on the transcription.
- The teacher sees the original photo next to the transcription in the review
  queue (`SubmissionImage`).
- The goal planner never trusts model arithmetic. The model only extracts
  `{ classId, target }` from free text; required scores are computed in
  `src/lib/goals/`. A student only ever sees their own classes and grades.
- Conference briefs and heatmaps read only teacher-approved `PublishedGrade`
  data. Briefs are labelled as AI drafts to review before sharing.
- XP and streaks (`StudyActivity`) are engagement only and never touch grades.
  Streaks count only the student's own actions (`streakDates()`): a teacher
  publishing a grade earns XP but does not keep a streak alive. Calendar days
  use the server's time zone.
- Every request body is read with a hard byte limit (`src/lib/http/body.ts`),
  and live OpenAI calls are rate-limited per user (`src/lib/http/rate-limit.ts`)
  with bounded timeouts (`OPENAI_BUDGETS`). The routes' `maxDuration` is
  longer than those deadlines.
- Paper tests that the teacher has not scanned yet are never shown as overdue
  to students or as missing on the teacher's student profile.

### `POST /api/grade` (teacher, multipart/form-data)

Fields: `assignmentId`, `studentId`, `pages` (1–4 image files; JPEG, PNG, or
WebP; ≤ 5 MB each, checked by magic bytes), optional `answerKey` (image file),
optional `transcription` (demo mode only: what is written on an unknown photo).

`200 { ok: true, submissionId, status: "NEEDS_REVIEW", grader: "openai" | "demo", model, confidence, flagCount }`

Errors `{ ok: false, error, code? }`: `400` invalid input (`code:
"NEEDS_TRANSCRIPTION"` when the demo scanner cannot read an unknown photo),
`401/403/404`, `409` when the student's paper is published, approved, or being
graded, `413` request too large, `422` when the assignment is not a
handwritten test or has no questions (or no handwriting was found), `429` when
the per-user AI budget is used up (live mode only, with `Retry-After`), `502`
when OpenAI fails (nothing is stored).

The scanner only accepts `TEST` assignments. Typed answers added to a `TEST`
assignment are graded on the same test path (answer-key matching), not as an
essay. Demo scans store `AiGrade.model` as `demo-sample` or `demo-typed` so the
review queue can say where the transcription came from; the API reports
`model: null` for demo output.

Pipeline: auth + ownership → image checks → vision (or demo) → validation →
one transaction that upserts the submission (`source: "SCAN"`, `content` = the
transcription), replaces its images, `AiGrade` (`grader: "openai"`, `model:
"gpt-4o"`) and `CriterionScore` rows, and sets `NEEDS_REVIEW`.

### `POST /api/answer-key` (teacher, multipart/form-data)

Field `image`. `200 { ok: true, engine: "openai" | "demo", questions: [{ title, expectedAnswer, maxPoints }] }`
(1–20 questions; integer points 1–100). The rubric builder uses it to fill a
`TEST` assignment's criteria: one criterion per question, with the expected
answer as its full-credit description.

### `POST /api/conference-brief` (teacher, JSON `{ classId, studentId }`)

`200 { ok: true, engine, model, generatedAt, brief: { headline, summary, strengths[], growthAreas[], talkingPoints[], nextSteps[], questionsForFamily[] }, basis: { publishedCount, averagePercent } }`

### `POST /api/goal-planner` (student, JSON `{ goal, classId? }`)

`200 { ok: true, engine, model, plan }`. `plan` holds the parsed target, the
current standing, the remaining assignments with the exact score needed on
each, feasibility, and a short coaching note. Saves `StudentGoal` and awards
`GOAL_SET` XP once per day.

### `GET /api/submissions/[submissionId]/images/[imageId]`

Returns the stored photo to the teacher who owns the class, or to the student
who owns the submission once its grade is published. Before publish, students
see neither the photo nor the AI transcription. `Cache-Control: private`,
`nosniff`.

### Demo implementations (no `OPENAI_API_KEY`)

- **Demo scanner:** recognizes the bundled sample photos (`public/samples/`,
  `src/lib/scan/samples.ts`) by SHA-256 and uses their stored transcriptions.
  For other photos it asks the teacher to type the transcription. Scores come
  from the deterministic demo grader. The output is labelled "Demo grader".
- **Demo answer-key reader:** recognizes the sample answer key only.
- **Demo brief and demo planner:** deterministic templates and regex goal
  parsing over the same data, labelled as demo output.
