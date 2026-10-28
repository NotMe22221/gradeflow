import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import * as constants from "@/lib/preferences/constants";
import {
  decodePreferencesCookie,
  encodePreferencesCookie,
  PREFERENCES_COOKIE_MAX_LENGTH,
  preferencesCookieName,
} from "@/lib/preferences/cookie";
import {
  DEFAULT_PREFERENCES,
  defaultSectionLayout,
  mergePreferences,
  normalizePreferences,
  normalizeSectionLayout,
  orderByIds,
  preferencesPatchSchema,
  THEMES,
  type Preferences,
} from "@/lib/preferences/schema";

const ROOT = join(import.meta.dirname, "..");

describe("preferences", () => {
  it("falls back to defaults for missing or junk values", () => {
    assert.deepEqual(normalizePreferences(undefined), DEFAULT_PREFERENCES);
    assert.deepEqual(normalizePreferences({ theme: "neon", accent: 3, textSize: "huge" }), DEFAULT_PREFERENCES);
  });

  it("places every known section exactly once and drops unknown ids", () => {
    const layout = normalizeSectionLayout("teacherHome", {
      main: ["missed", "bogus", "missed"],
      side: ["stats"],
      hidden: ["tools", "nope"],
    });
    assert.deepEqual(layout.main, ["missed", "tools", "classes"]);
    assert.deepEqual(layout.side, ["stats", "recent"]);
    assert.deepEqual(layout.hidden, ["tools"]);
  });

  it("never hides an essential section", () => {
    assert.deepEqual(normalizeSectionLayout("studentHome", { hidden: ["inbox", "planner"] }).hidden, ["planner"]);
    assert.deepEqual(normalizeSectionLayout("teacherHome", { hidden: ["classes"] }).hidden, []);
  });

  it("puts sections a saved layout doesn't know back in their default column", () => {
    const layout = normalizeSectionLayout("teacherHome", { main: ["classes"], side: [] });
    assert.deepEqual(layout.main, ["classes", "stats", "tools"]);
    assert.deepEqual(layout.side, ["recent", "missed"]);
  });

  it("merges a patch without losing other settings", () => {
    const dark = mergePreferences(DEFAULT_PREFERENCES, { theme: "dark" });
    const moved = mergePreferences(dark, { layout: { classOrder: ["b", "a", "b"] } });
    assert.equal(moved.theme, "dark");
    assert.deepEqual(moved.layout.classOrder, ["b", "a"]);
    assert.deepEqual(moved.layout.teacherHome, defaultSectionLayout("teacherHome"));
  });

  it("accepts only known patch fields", () => {
    assert.equal(preferencesPatchSchema.safeParse({ theme: "dark" }).success, true);
    assert.equal(preferencesPatchSchema.safeParse({ theme: "dark", admin: true }).success, false);
    assert.equal(preferencesPatchSchema.safeParse({ accent: "purple" }).success, false);
    assert.equal(preferencesPatchSchema.safeParse({ layout: { classOrder: Array(201).fill("x") } }).success, false);
  });

  it("orders items by saved ids, new items last", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    assert.deepEqual(orderByIds(items, ["c", "a", "gone"]).map((i) => i.id), ["c", "a", "b", "d"]);
  });
});

describe("single-key shortcuts setting", () => {
  it("defaults on and accepts a boolean", () => {
    assert.equal(DEFAULT_PREFERENCES.singleKeyShortcuts, true);
    assert.equal(mergePreferences(DEFAULT_PREFERENCES, { singleKeyShortcuts: false }).singleKeyShortcuts, false);
    assert.equal(normalizePreferences({ singleKeyShortcuts: "no" }).singleKeyShortcuts, true);
    assert.equal(preferencesPatchSchema.safeParse({ singleKeyShortcuts: "off" }).success, false);
  });
});

// --- Per-browser preferences while demo sign-in is on -------------------------------
// server.ts is server code: "server-only", the request cookies, the session and
// the database are stand-ins here (no database, no server).

type CookieOptions = { httpOnly?: boolean; sameSite?: string; secure?: boolean; path?: string; maxAge?: number };
type Jar = {
  values: Map<string, string>;
  options: Map<string, CookieOptions>;
  get(name: string): { name: string; value: string } | undefined;
  set(name: string, value: string, options: CookieOptions): void;
};

function browser(): Jar {
  const values = new Map<string, string>();
  const options = new Map<string, CookieOptions>();
  return {
    values,
    options,
    get: (name) => (values.has(name) ? { name, value: values.get(name)! } : undefined),
    set: (name, value, opts) => {
      values.set(name, value);
      options.set(name, opts);
    },
  };
}

const world = {
  jar: browser(),
  rows: new Map<string, string>(),
  writes: [] as string[],
};
(globalThis as Record<string, unknown>).__preferencesTest = world;

const STUBS: Record<string, string> = {
  "server-only": "",
  "next/headers": "export const cookies = async () => globalThis.__preferencesTest.jar;",
  "@/lib/auth/session":
    "export const getCurrentUser = async () => null; export const secureCookie = async () => true;",
  "@/lib/db": `export const db = { userPreferences: {
    findUnique: async ({ where }) => { const data = globalThis.__preferencesTest.rows.get(where.userId); return data === undefined ? null : { data }; },
    upsert: async ({ where, update }) => { globalThis.__preferencesTest.writes.push("upsert"); globalThis.__preferencesTest.rows.set(where.userId, update.data); },
    deleteMany: async ({ where }) => { globalThis.__preferencesTest.writes.push("deleteMany"); globalThis.__preferencesTest.rows.delete(where.userId); },
  } };`,
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in STUBS) {
      return { url: `data:text/javascript,${encodeURIComponent(STUBS[specifier])}`, format: "module", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { getPreferences, resetPreferences, savePreferences } = await import("../src/lib/preferences/server");

const TEACHER = "demo-teacher";
const COOKIE = preferencesCookieName(TEACHER);

describe("preferences cookie", () => {
  it("round-trips preferences and normalizes whatever the browser sends", () => {
    const prefs = mergePreferences(DEFAULT_PREFERENCES, { theme: "dark", look: "calm", layout: { classOrder: ["b", "a"] } });
    assert.deepEqual(decodePreferencesCookie(encodePreferencesCookie(prefs)), prefs);
    assert.equal(decodePreferencesCookie(undefined), null);
    assert.equal(decodePreferencesCookie(""), null);
    assert.equal(decodePreferencesCookie("{not json"), null);
    assert.equal(decodePreferencesCookie("[1,2]"), null);
    assert.equal(decodePreferencesCookie("null"), null);
    const forged = decodePreferencesCookie(JSON.stringify({ theme: "neon", accent: "teal", layout: { teacherHome: { hidden: ["classes", "x"] } } }));
    assert.equal(forged?.theme, DEFAULT_PREFERENCES.theme);
    assert.equal(forged?.accent, "teal");
    assert.deepEqual(forged?.layout.teacherHome.hidden, []);
  });

  it("stays well under 4 KB, trimming only the end of a long class order", () => {
    const ids = Array.from({ length: 200 }, (_, i) => `${String(i).padStart(3, "0")}${"x".repeat(61)}`);
    const prefs = mergePreferences(DEFAULT_PREFERENCES, { theme: "dark", layout: { classOrder: ids } });
    const value = encodePreferencesCookie(prefs);
    assert.ok(encodeURIComponent(value).length <= PREFERENCES_COOKIE_MAX_LENGTH);
    assert.ok(PREFERENCES_COOKIE_MAX_LENGTH + COOKIE.length < 3500);
    const decoded = decodePreferencesCookie(value)!;
    assert.equal(decoded.theme, "dark");
    assert.ok(decoded.layout.classOrder.length > 0 && decoded.layout.classOrder.length < ids.length);
    assert.deepEqual(decoded.layout.classOrder, ids.slice(0, decoded.layout.classOrder.length));
  });

  it("names one cookie per user, with only cookie-safe characters", () => {
    assert.equal(preferencesCookieName("cmh1abc_2-z"), "mw_prefs_cmh1abc_2-z");
    assert.equal(preferencesCookieName("a;b=c d"), "mw_prefs_a_b_c_d");
    assert.notEqual(preferencesCookieName("user-a"), preferencesCookieName("user-b"));
  });
});

describe("saving preferences while demo sign-in is on", () => {
  const savedEnv = process.env.MARKWISE_DEMO_LOGIN;
  beforeEach(() => {
    delete process.env.MARKWISE_DEMO_LOGIN;
    world.rows.clear();
    world.writes.length = 0;
  });
  afterEach(() => {
    if (savedEnv === undefined) delete process.env.MARKWISE_DEMO_LOGIN;
    else process.env.MARKWISE_DEMO_LOGIN = savedEnv;
  });

  it("keeps one browser's changes out of every other browser and the shared row", async () => {
    const first = browser();
    const second = browser();
    world.jar = first;
    await savePreferences(TEACHER, { density: "compact", layout: { teacherHome: { main: ["classes"], side: [], hidden: ["stats"] } } });
    assert.deepEqual(world.writes, [], "the shared row is never written");
    assert.equal((await getPreferences(TEACHER)).density, "compact");
    assert.deepEqual((await getPreferences(TEACHER)).layout.teacherHome.hidden, ["stats"]);

    world.jar = second;
    assert.deepEqual(await getPreferences(TEACHER), DEFAULT_PREFERENCES);
    assert.equal(second.values.size, 0);
  });

  it("sets the cookie like the session cookie: httpOnly, lax, Secure by the same rule", async () => {
    world.jar = browser();
    await savePreferences(TEACHER, { theme: "dark" });
    const options = world.jar.options.get(COOKIE);
    assert.equal(options?.httpOnly, true);
    assert.equal(options?.sameSite, "lax");
    assert.equal(options?.secure, true);
    assert.equal(options?.path, "/");
    assert.ok((options?.maxAge ?? 0) > 0);
  });

  it("starts a browser without its own copy from the defaults, never from a shared row saved earlier", async () => {
    world.rows.set(TEACHER, JSON.stringify(mergePreferences(DEFAULT_PREFERENCES, { accent: "teal" })));
    world.jar = browser();
    assert.deepEqual(await getPreferences(TEACHER), DEFAULT_PREFERENCES);
    await savePreferences(TEACHER, { textSize: "large" });
    const own = decodePreferencesCookie(world.jar.values.get(COOKIE));
    assert.equal(own?.accent, DEFAULT_PREFERENCES.accent, "the first save starts from the defaults, not the row");
    assert.equal(own?.textSize, "large");
    assert.equal(JSON.parse(world.rows.get(TEACHER)!).textSize, "default", "the shared row is unchanged");
  });

  it("ignores a cookie that doesn't parse and falls back to the defaults", async () => {
    world.rows.set(TEACHER, JSON.stringify(mergePreferences(DEFAULT_PREFERENCES, { look: "calm" })));
    world.jar = browser();
    world.jar.set(COOKIE, "%%%{", {});
    assert.deepEqual(await getPreferences(TEACHER), DEFAULT_PREFERENCES);
    world.jar.set(COOKIE, JSON.stringify({ look: "loud", theme: "dark" }), {});
    const forged = await getPreferences(TEACHER);
    assert.equal(forged.look, DEFAULT_PREFERENCES.look);
    assert.equal(forged.theme, "dark");
  });

  it("resets only this browser, to the defaults, and leaves the shared row alone", async () => {
    world.rows.set(TEACHER, JSON.stringify(mergePreferences(DEFAULT_PREFERENCES, { theme: "dark" })));
    const other = browser();
    world.jar = other;
    await savePreferences(TEACHER, { accent: "orange" });
    world.jar = browser();
    await savePreferences(TEACHER, { accent: "green" });
    await resetPreferences(TEACHER);
    assert.deepEqual(await getPreferences(TEACHER), DEFAULT_PREFERENCES);
    assert.deepEqual(world.writes, []);
    assert.equal(JSON.parse(world.rows.get(TEACHER)!).theme, "dark");
    world.jar = other;
    assert.equal((await getPreferences(TEACHER)).accent, "orange");
  });

  it("keeps the old per-account behaviour when demo sign-in is off", async () => {
    process.env.MARKWISE_DEMO_LOGIN = "off";
    world.jar = browser();
    world.jar.set(COOKIE, JSON.stringify({ theme: "light" }), {});
    assert.deepEqual(await getPreferences(TEACHER), DEFAULT_PREFERENCES, "a stale browser copy is ignored");
    await savePreferences(TEACHER, { theme: "dark" });
    assert.deepEqual(world.writes, ["upsert"]);
    assert.equal((await getPreferences(TEACHER)).theme, "dark");
    assert.equal(world.jar.options.size, 1, "no new cookie is written");
    await resetPreferences(TEACHER);
    assert.deepEqual(world.writes, ["upsert", "deleteMany"]);
    assert.equal(world.rows.has(TEACHER), false);
  });
});

// --- No zod on every page --------------------------------------------------------
// The root layout's Toaster follows the theme through customize/appearance.ts.
// Its import chain must stay clear of zod (schema.ts), which would otherwise
// load on the landing page and /try. Server action modules are only a small
// reference in the client bundle, so the walk stops at them.

function resolveSource(specifier: string, from: string): string | null {
  const base = specifier.startsWith("@/") ? join(ROOT, "src", specifier.slice(2)) : specifier.startsWith(".") ? join(dirname(from), specifier) : null;
  if (!base) return null;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Packages reached by value imports from a client file, following project files. */
function clientPackages(entry: string): Set<string> {
  const packages = new Set<string>();
  const seen = new Set<string>();
  const queue = [join(ROOT, entry)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    if (/^\s*["']use server["']/.test(source)) continue;
    for (const match of source.matchAll(/^(?:import|export)\s+(?!type\b)(?:[^;]*?\sfrom\s+)?["']([^"']+)["']/gm)) {
      const resolved = resolveSource(match[1], file);
      if (resolved) queue.push(resolved);
      else if (!match[1].startsWith(".") && !match[1].startsWith("@/")) packages.add(match[1]);
    }
  }
  return packages;
}

describe("zod stays out of the root bundle", () => {
  it("is not reached from the root Toaster", () => {
    const packages = clientPackages("src/components/ui/sonner.tsx");
    assert.ok(packages.has("sonner"), "the walk follows the Toaster's imports");
    assert.equal(packages.has("zod"), false);
  });

  it("is not reached from the app-wide error page, a root-level client component", () => {
    const packages = clientPackages("src/app/global-error.tsx");
    assert.ok(packages.has("@fontsource-variable/roboto"), "the walk follows the error page's imports");
    assert.equal(packages.has("zod"), false);
  });

  it("is still what validates a patch, and schema.ts re-exports the same constants", () => {
    assert.ok(clientPackages("src/lib/preferences/schema.ts").has("zod"));
    assert.equal(THEMES, constants.THEMES);
    assert.equal(DEFAULT_PREFERENCES, constants.DEFAULT_PREFERENCES);
    const sample: Preferences = constants.DEFAULT_PREFERENCES;
    assert.deepEqual(normalizePreferences(sample), sample);
  });
});
