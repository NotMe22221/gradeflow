// Finding the demo accounts, and saying what is wrong when they can't be
// found. Pure: safe for client components, server code, and unit tests. The
// sign-in actions are in actions.ts.

import { DEMO_STUDENT_EMAIL, DEMO_TEACHER_EMAIL, type Role } from "@/lib/constants";

/**
 * The demo accounts' emails, current first, then the ones they had under the
 * app's earlier names (GradeSmart, GradeFlow). A hosted database seeded before
 * a rename keeps the old ones, because the build only seeds an empty database
 * and never edits one, so demo sign-in accepts them too. Read-only: nothing is
 * renamed in the database.
 */
export const DEMO_ACCOUNT_EMAILS: Readonly<Record<Role, readonly string[]>> = {
  TEACHER: [DEMO_TEACHER_EMAIL, "morgan.hale@gradesmart.example", "morgan.hale@gradeflow.example"],
  STUDENT: [DEMO_STUDENT_EMAIL, "ava.quillon@students.gradesmart.example", "ava.quillon@students.gradeflow.example"],
};

/** The demo account for a role among `rows`: the right role, the newest email name first. */
export function pickDemoAccount<T extends { email: string; role: string }>(rows: readonly T[], role: Role): T | null {
  for (const email of DEMO_ACCOUNT_EMAILS[role]) {
    const match = rows.find((row) => row.email === email && row.role === role);
    if (match) return match;
  }
  return null;
}

/**
 * Why demo sign-in couldn't find its account (the landing page's ?setup=):
 * "no-schema": the database answers but has no tables yet;
 * "empty": it has tables but no users at all;
 * "no-demo": it has users, but not the demo accounts;
 * "unreachable": the query failed for any other reason (down, refused, timed out).
 */
export type SetupIssue = "no-schema" | "empty" | "no-demo" | "unreachable";

const ISSUES: readonly SetupIssue[] = ["no-schema", "empty", "no-demo", "unreachable"];

/**
 * The issue behind a failed sign-in query. Prisma reports a missing table as
 * P2021; it is recognized by `code`, never `instanceof` (see lib/db.ts).
 */
export function setupIssueForError(error: unknown): SetupIssue {
  const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
  return code === "P2021" ? "no-schema" : "unreachable";
}

/**
 * The issue named in ?setup=, or null. The older ?setup=seed carried no
 * reason, so it shows nothing: choosing View the demo again gives the real one.
 */
export function parseSetupIssue(value: string | string[] | undefined): SetupIssue | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first && (ISSUES as readonly string[]).includes(first) ? (first as SetupIssue) : null;
}

/**
 * Where the app runs, which decides the fix:
 * "vercel": a Vercel deployment (VERCEL is set);
 * "dev-server": a computer using Prisma's local dev database (`npm run seed` works);
 * "own-database": a computer, or another host, with its own DATABASE_URL.
 */
export type SetupPlace = "vercel" | "dev-server" | "own-database";

export function setupPlace({ vercel, devServer }: { vercel: boolean; devServer: boolean }): SetupPlace {
  if (vercel) return "vercel";
  return devServer ? "dev-server" : "own-database";
}

export type SetupMessage = { title: string; body: string; command: string | null };

/** Creates the tables, then loads the demo data only if the database is empty. Never erases anything. */
const OWN_DATABASE_SETUP = "npx prisma db push && npx tsx prisma/seed.ts --if-empty";

/**
 * What the landing page says for each issue, by where the app runs. Only the
 * dev server is told to run `npm run seed`, which refuses any other database.
 * A Vercel deployment gets no command: its Production build creates the
 * tables and loads the demo data into an empty database.
 */
export function setupMessage(issue: SetupIssue, place: SetupPlace): SetupMessage {
  if (place === "dev-server") {
    return issue === "unreachable"
      ? {
          title: "The local database isn't running.",
          body: "Start it with the command below, then choose View the demo again.",
          command: "npm run db:start",
        }
      : {
          title: issue === "no-schema" ? "The local database has no tables yet." : "Demo data isn't loaded yet.",
          body: "Create the tables and load the demo data with the command below, then choose View the demo.",
          command: "npm run seed",
        };
  }

  if (place === "own-database") {
    switch (issue) {
      case "no-schema":
      case "empty":
        return {
          title: issue === "no-schema" ? "The database has no tables yet." : "Demo data isn't loaded yet.",
          body: "Create the tables and load the demo data with the command below. It only loads into an empty database and never erases anything.",
          command: OWN_DATABASE_SETUP,
        };
      case "no-demo":
        return {
          title: "This database doesn't have the demo accounts.",
          body: "It holds other data, and the demo data is only ever loaded into an empty database. Point DATABASE_URL at a new, empty database, then run the command below.",
          command: OWN_DATABASE_SETUP,
        };
      case "unreachable":
        return {
          title: "Markwise can't reach its database.",
          body: "Check DATABASE_URL (in .env.local or your host's settings) and that the database is running, then try again.",
          command: null,
        };
    }
  }

  switch (issue) {
    case "no-schema":
      return {
        title: "This deployment's database has no tables yet.",
        body: "Redeploy the latest Production deployment on Vercel: the Production build creates the tables and loads the demo data. (A Preview build changes its database only with ALLOW_PREVIEW_DB_CHANGES=1.)",
        command: null,
      };
    case "empty":
      return {
        title: "The demo data isn't loaded on this deployment yet.",
        body: "Its database is empty. Redeploy the latest Production deployment on Vercel: the Production build loads the demo data into an empty database.",
        command: null,
      };
    case "no-demo":
      return {
        title: "This deployment's database doesn't have the demo accounts.",
        body: "It holds other data, and the demo data is only ever loaded into an empty database. To start fresh, point DATABASE_URL and DATABASE_URL_UNPOOLED on Vercel at a new, empty database and redeploy. The old database isn't changed.",
        command: null,
      };
    case "unreachable":
      return {
        title: "This deployment can't reach its database.",
        body: "If it worked a moment ago, try again in a minute. Otherwise check DATABASE_URL and DATABASE_URL_UNPOOLED in Vercel → Settings → Environment Variables, then redeploy.",
        command: null,
      };
  }
}
