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
 * "empty": the database has no users at all;
 * "no-demo": it has users, but not the demo accounts;
 * "unreachable": the database couldn't be queried.
 */
export type SetupIssue = "empty" | "no-demo" | "unreachable";

const ISSUES: readonly SetupIssue[] = ["empty", "no-demo", "unreachable"];

/**
 * The issue named in ?setup=, or null. The older ?setup=seed carried no
 * reason, so it shows nothing: choosing View the demo again gives the real one.
 */
export function parseSetupIssue(value: string | string[] | undefined): SetupIssue | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first && (ISSUES as readonly string[]).includes(first) ? (first as SetupIssue) : null;
}

export type SetupMessage = { title: string; body: string; command: string | null };

/**
 * What the landing page says for each issue. On a computer (the local dev
 * database) the fix is a command. On a hosted deployment it is never
 * `npm run seed`, which only ever changes the local dev database: the
 * Production build loads the demo data into an empty database.
 */
export function setupMessage(issue: SetupIssue, local: boolean): SetupMessage {
  if (local) {
    return issue === "unreachable"
      ? {
          title: "The local database isn't running.",
          body: "Start it with the command below (it also starts the app), then choose View the demo.",
          command: "npm run dev",
        }
      : {
          title: "Demo data isn't loaded yet.",
          body: "Load it with the command below, then choose View the demo.",
          command: "npm run seed",
        };
  }
  switch (issue) {
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
        body: "Check DATABASE_URL and DATABASE_URL_UNPOOLED in Vercel → Settings → Environment Variables, then redeploy.",
        command: null,
      };
  }
}
