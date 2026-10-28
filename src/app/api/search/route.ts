import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { loadSearchIndex } from "@/lib/search/server";

export const dynamic = "force-dynamic";

/** Per user and always fresh: never cached by the browser or a shared proxy. */
const HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie" };

/**
 * The signed-in user's search index for the command palette (classes,
 * assignments, and, for teachers, students in their own classes), scoped by
 * role and ownership or enrollment on the server. The palette filters it in
 * the browser as the user types.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401, headers: HEADERS });
  }
  try {
    const index = await loadSearchIndex(user);
    return NextResponse.json({ ok: true, index }, { headers: HEADERS });
  } catch (error) {
    // Log the error type only: Prisma messages carry query arguments (user and class ids).
    console.error("[markwise] Search index failed", { type: error instanceof Error ? error.name : typeof error });
    return NextResponse.json({ ok: false, error: "Search is unavailable right now." }, { status: 500, headers: HEADERS });
  }
}
