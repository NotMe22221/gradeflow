import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { demoLoginEnabled, isRole, type Role } from "@/lib/constants";

/**
 * Minimal signed-cookie sessions for the demo.
 *
 * The cookie only carries a user id. The role is always re-read from the
 * database, so a tampered or stale cookie can never grant teacher rights.
 */

const COOKIE_NAME = "gs_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
let warnedAboutSecret = false;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production") {
    // With one-click demo sign-in on, a forged cookie grants nothing a visitor
    // can't already get by clicking "View the demo", so a local `next start`
    // demo keeps working. Once demo sign-in is off (real auth), fail closed.
    if (!demoLoginEnabled()) {
      throw new Error("SESSION_SECRET must be set (16+ characters) when demo sign-in is off.");
    }
    if (!warnedAboutSecret) {
      warnedAboutSecret = true;
      console.warn("[markwise] SESSION_SECRET is not set; using the built-in demo secret.");
    }
  }
  return "markwise-local-demo-secret-not-for-production";
}

/**
 * Secure cookies by default. A production build only drops the Secure flag
 * for plain-HTTP requests to localhost or a private LAN address, so a demo
 * opened from a phone on the same network still signs in. Behind a TLS proxy,
 * send X-Forwarded-Proto. SESSION_COOKIE_SECURE=true|false overrides.
 */
async function shouldUseSecureCookie(): Promise<boolean> {
  const override = process.env.SESSION_COOKIE_SECURE;
  if (override) return override !== "false";
  const requestHeaders = await headers();
  const protocols = (requestHeaders.get("x-forwarded-proto") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase());
  if (protocols.includes("https")) return true;
  if (process.env.NODE_ENV !== "production") return false;
  return !isLocalOrPrivateHost(requestHeaders.get("host"));
}

function isLocalOrPrivateHost(host: string | null): boolean {
  if (!host) return false;
  const name = host
    .replace(/:\d+$/, "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (name === "localhost" || name.endsWith(".localhost") || name.endsWith(".local") || name === "::1") {
    return true;
  }
  const octets = name.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!octets) return false;
  const [a, b] = [Number(octets[1]), Number(octets[2])];
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
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
    secure: await shouldUseSecureCookie(),
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
