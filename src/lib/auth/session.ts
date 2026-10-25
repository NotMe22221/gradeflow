import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { isRole, type Role } from "@/lib/constants";

/**
 * Minimal signed-cookie sessions for the demo.
 *
 * The cookie only carries a user id. The role is always re-read from the
 * database, so a tampered or stale cookie can never grant teacher rights.
 */

const COOKIE_NAME = "gf_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
let warnedAboutSecret = false;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production" && !warnedAboutSecret) {
    // Still usable for a local `next start` demo, but make the gap obvious.
    warnedAboutSecret = true;
    console.warn("[gradeflow] SESSION_SECRET is not set; using the built-in demo secret.");
  }
  return "gradeflow-local-demo-secret-not-for-production";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: unknown;
      iat?: unknown;
    };
    if (typeof data.uid !== "string" || typeof data.iat !== "number") return null;
    if (Date.now() - data.iat > MAX_AGE_SECONDS * 1000) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export async function setSessionCookie(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, encode(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** The signed-in user, with the role read fresh from the database. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const userId = decode(store.get(COOKIE_NAME)?.value);
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user || !isRole(user.role)) return null;
  return { ...user, role: user.role };
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// --- Page guards: redirect when the role is wrong. -------------------------

export async function requireTeacherPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "TEACHER") redirect("/student");
  return user;
}

export async function requireStudentPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect("/dashboard");
  return user;
}

// --- Action / route guards: throw AuthError. --------------------------------

export async function requireTeacher(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sign in required.", 401);
  if (user.role !== "TEACHER") throw new AuthError("Only teachers can do that.", 403);
  return user;
}

export async function requireStudent(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sign in required.", 401);
  if (user.role !== "STUDENT") throw new AuthError("Only students can do that.", 403);
  return user;
}
