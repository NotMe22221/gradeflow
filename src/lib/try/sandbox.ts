import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { cookieKey, secureCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { TemplateId } from "@/lib/demo/templates";
import type { ValidatedGrading } from "@/lib/grading/types";
import {
  isTemplateId,
  SandboxLimitError,
  toTryItResult,
  TRY_RUNS_PER_NETWORK_HOUR,
  TRY_RUNS_PER_SANDBOX_HOUR,
  TRY_TTL_HOURS,
  type TryItEngine,
  type TryItResult,
} from "@/lib/try/types";

/**
 * The try-it sandbox's storage. Each browser gets its own random sandbox
 * cookie. Its rows in TryItRun are keyed by a keyed hash of that cookie, so
 * one visitor never sees another's papers. Rows expire after TRY_TTL_HOURS
 * and are deleted on the next write. This module touches no other table: the
 * sandbox never reads or writes classes, submissions or grades.
 */

const COOKIE_NAME = "mw_try";
const TTL_MS = TRY_TTL_HOURS * 60 * 60 * 1000;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** This browser's sandbox token, or null before its first try. */
export async function readSandboxToken(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return value && TOKEN.test(value) ? value : null;
}

/** The sandbox token, creating the cookie on the first try. Route handlers only (it sets a cookie). */
export async function ensureSandboxToken(): Promise<string> {
  const existing = await readSandboxToken();
  if (existing) return existing;
  const token = randomBytes(32).toString("base64url");
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await secureCookie(),
    path: "/",
    maxAge: TRY_TTL_HOURS * 60 * 60,
  });
  return token;
}

type RunRow = {
  id: string;
  templateId: string;
  paper: string;
  grader: string;
  model: string | null;
  result: string;
  createdAt: Date;
  expiresAt: Date;
};

function toResult(row: RunRow, reused: boolean): TryItResult | null {
  if (!isTemplateId(row.templateId)) return null;
  try {
    const grading = JSON.parse(row.result) as ValidatedGrading;
    if (!Array.isArray(grading?.criteria) || !Array.isArray(grading.flags)) return null;
    const engine: TryItEngine = { kind: row.grader === "claude" ? "claude" : "demo", model: row.model };
    return toTryItResult({
      id: row.id,
      templateId: row.templateId,
      paper: row.paper,
      engine,
      grading,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      reused,
    });
  } catch {
    return null;
  }
}

/** The most recent unexpired run in this sandbox, if any. */
export async function latestRun(token: string, now = new Date()): Promise<TryItResult | null> {
  const row = await db.tryItRun.findFirst({
    where: { sessionKey: cookieKey(token), expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  return row ? toResult(row, false) : null;
}

/** An unexpired run in this sandbox for the same paper, rubric and engine: shown again instead of graded again. */
export async function findSameRun(
  token: string,
  { templateId, paperHash, engine }: { templateId: TemplateId; paperHash: string; engine: TryItEngine },
  now = new Date()
): Promise<TryItResult | null> {
  const row = await db.tryItRun.findFirst({
    where: {
      sessionKey: cookieKey(token),
      templateId,
      paperHash,
      grader: engine.kind,
      model: engine.model,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
  return row ? toResult(row, true) : null;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Throw SandboxLimitError when this sandbox or this network has saved its
 * hourly share of runs. Checked before grading, so a refused run costs
 * nothing. Not atomic: concurrent requests can pass it together, which only
 * matters at the margin (live calls have the usage guard's strict caps).
 */
export async function checkRunLimits(token: string, ipKey: string, now = new Date()): Promise<void> {
  const since = new Date(now.getTime() - HOUR_MS);
  for (const [scope, where, limit] of [
    ["sandbox", { sessionKey: cookieKey(token) }, TRY_RUNS_PER_SANDBOX_HOUR],
    ["network", { ipKey }, TRY_RUNS_PER_NETWORK_HOUR],
  ] as const) {
    const recent = await db.tryItRun.findMany({
      where: { ...where, createdAt: { gt: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
      take: limit,
    });
    if (recent.length >= limit) {
      const retryAfter = Math.ceil((recent[0].createdAt.getTime() + HOUR_MS - now.getTime()) / 1000);
      throw new SandboxLimitError(Math.max(1, retryAfter), scope);
    }
  }
}

/** Save a run in this sandbox and delete every expired sandbox row (only TryItRun rows past their time). */
export async function saveRun(
  token: string,
  ipKey: string,
  run: { templateId: TemplateId; paper: string; paperHash: string; engine: TryItEngine; grading: ValidatedGrading },
  now = new Date()
): Promise<TryItResult> {
  await db.tryItRun.deleteMany({ where: { expiresAt: { lte: now } } });
  const row = await db.tryItRun.create({
    data: {
      sessionKey: cookieKey(token),
      ipKey,
      templateId: run.templateId,
      paperHash: run.paperHash,
      paper: run.paper,
      grader: run.engine.kind,
      model: run.engine.model,
      result: JSON.stringify(run.grading),
      createdAt: now,
      expiresAt: new Date(now.getTime() + TTL_MS),
    },
  });
  return toTryItResult({
    id: row.id,
    templateId: run.templateId,
    paper: run.paper,
    engine: run.engine,
    grading: run.grading,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    reused: false,
  });
}
