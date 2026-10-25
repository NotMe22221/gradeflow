# GradeFlow

**AI drafts the first pass. You make the call.**

GradeFlow is an AI-assisted grading tool for teachers. It is not an LMS. It does
one thing: it takes student papers from submission to published grades. The AI
suggests a score for each rubric criterion, with a short justification and a
quote from the paper as evidence. Nothing is published until a teacher approves it.

> Everything in this repo uses synthetic demo data. Never point it at real student data.

---

## Quick start

Requirements: Node.js 20.9+ (22 recommended) and npm.

```bash
npm install        # installs dependencies and generates the Prisma client
npm run seed       # creates the local SQLite database and loads the synthetic demo data
npm run dev        # http://localhost:3000
```

Open http://localhost:3000 and click **View the demo**. That signs you in as the
demo teacher.

No configuration is required. Optional settings live in `.env` (copy `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | unset | When set, the AI first pass calls the Claude API. When unset, the local **demo grader** runs and the UI labels it. |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Claude model used for grading. |
| `ANTHROPIC_EFFORT` | `medium` | `low` / `medium` / `high` / `xhigh` / `max`. |
| `DATABASE_URL` | `file:./prisma/dev.db` | Local SQLite file. |
| `SESSION_SECRET` | built-in demo secret | Signs the session cookie. Set a long random string anywhere other than a local demo. |
| `GRADEFLOW_DEMO_LOGIN` | on | Set to `off` to hide the one-click demo sign-in. |

Run `npm run seed` again at any time to reset the demo data.

Other scripts: `npm test` (unit tests for grading validation, the demo grader,
prompt-injection handling, and CSV export), `npm run typecheck`, `npm run build`.

---

## Demo script (under 3 minutes)

DEMO_SCRIPT_PLACEHOLDER

---

## What's real and what's mocked

REAL_VS_MOCKED_PLACEHOLDER

---

## How the approval gate works

APPROVAL_GATE_PLACEHOLDER

---

## Project structure

STRUCTURE_PLACEHOLDER

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data model, status
machine, API contract, and extension points.

---

## Notes for after the hackathon

- **GradeFlow is a placeholder name.** Rename it in `src/components/brand/logo.tsx`,
  `src/app/layout.tsx` (metadata), and this README.
- **Real LMS sync:** implement `GradebookExporter` in `src/lib/export/` for
  Canvas or Google Classroom. The CSV exporter is the reference implementation.
- **Real auth:** replace the demo sign-in in `src/lib/auth/` with your identity
  provider. Role checks and ownership checks already run on the server.
