import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

// Tailwind v4 scans every project file it isn't told to skip, Markdown
// included, for class names. A wildcard inside an arbitrary-property class
// (a band custom property with "*" for its tone) becomes a real CSS rule with
// an invalid value and fails the stylesheet build. That happened twice: once
// from docs/DESIGN.md, once from this very file. So globals.css excludes the
// folders that hold no UI (`@source not`), and the files Tailwind still scans
// must hold no such candidate. Docs name a real token instead, for example
// `[--background:var(--band-yellow)]`.

const ROOT = join(import.meta.dirname, "..");
const SKIP = new Set(["node_modules", ".git", ".next", "out", "build", "generated", "test-results", "playwright-report"]);

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : markdownFiles(path);
    return /\.mdx?$/i.test(entry.name) ? [path] : [];
  });
}

const relative = (path: string) => path.slice(ROOT.length + 1);

/**
 * Bracketed class candidates Tailwind would turn into broken CSS: a run with
 * no whitespace, starting like a property (a lowercase letter or "-", as
 * Tailwind requires), holding a colon and an asterisk. Also any bracketed
 * value that references a wildcard custom property, like `bg-[var(--band-*)]`.
 */
function wildcardClassCandidates(text: string): string[] {
  const found = new Set<string>();
  for (const [candidate] of text.matchAll(/\[[a-z-][^\s[\]]*\]/g)) {
    if (candidate.includes(":") && candidate.includes("*")) found.add(candidate);
  }
  for (const [candidate] of text.matchAll(/\[[^\s[\]]*var\(--[\w-]*\*[^\s[\]]*\]/g)) found.add(candidate);
  return [...found];
}

/** Folders and files with no UI, which globals.css keeps Tailwind from scanning. */
const NOT_SCANNED = ["docs", "tests", "eval", "scripts", "prisma", "public", "README.md"];

function scannedFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (dir === ROOT && NOT_SCANNED.includes(entry.name)) return [];
    if (entry.isDirectory()) return SKIP.has(entry.name) || entry.name.startsWith(".") ? [] : scannedFiles(path);
    return /\.(tsx?|jsx?|mjs|css|mdx?|html|json)$/i.test(entry.name) ? [path] : [];
  });
}

describe("Tailwind never meets a wildcard class", () => {
  it("skips the folders that hold no UI", () => {
    const css = readFileSync(join(ROOT, "src", "app", "globals.css"), "utf8");
    for (const path of NOT_SCANNED) assert.match(css, new RegExp(`@source not "\\.\\./\\.\\./${path.replace(".", "\\.")}";`), path);
  });

  it("finds no wildcard class in any file it still scans", () => {
    const files = scannedFiles(ROOT);
    assert.ok(files.some((path) => relative(path) === "src/app/globals.css"), "scans the app");
    const offenders = files.flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .flatMap((line, index) => wildcardClassCandidates(line).map((candidate) => `${relative(path)}:${index + 1} ${candidate}`))
    );
    assert.deepEqual(offenders, []);
  });
});

describe("Markdown never holds a wildcard class Tailwind would compile", () => {
  const files = markdownFiles(ROOT);

  it("finds the project's docs", () => {
    const names = files.map(relative);
    for (const expected of ["README.md", "docs/ARCHITECTURE.md", "docs/DESIGN.md", "eval/README.md", "eval/data/README.md"]) {
      assert.ok(names.includes(expected), `${expected} is scanned`);
    }
  });

  it("catches the class that broke the build, and wildcard variants of it", () => {
    assert.deepEqual(wildcardClassCandidates("set `[--background:var(--band-*)]` on a band"), ["[--background:var(--band-*)]"]);
    assert.deepEqual(wildcardClassCandidates("hover:[--ring:var(--band-*-foreground)]"), ["[--ring:var(--band-*-foreground)]"]);
    assert.deepEqual(wildcardClassCandidates("[color:*]"), ["[color:*]"]);
    assert.deepEqual(wildcardClassCandidates("[--band-*:red]"), ["[--band-*:red]"]);
    assert.deepEqual(wildcardClassCandidates("bg-[var(--band-*)]"), ["[var(--band-*)]"]);
  });

  it("leaves real classes and ordinary Markdown alone", () => {
    const fine = [
      "`[--ring:var(--band-foreground)]` and `[--background:var(--band-yellow)]`",
      "disappears in Calm (`[data-decor]`)",
      "See [the design notes](docs/DESIGN.md) and **[Note:** bold**]**",
      "[**Tip:** keep it short]",
      "Run `eval/**/*.md` through the glob, or `src/app/[assignmentId]/*`.",
      "- [x] Done: *really*",
      "text-[1.125rem] grid-cols-[auto_1fr] [mask-image:linear-gradient(black,transparent)]",
    ].join("\n");
    assert.deepEqual(wildcardClassCandidates(fine), []);
  });

  it("holds for every Markdown file in the repository", () => {
    const offenders = files.flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .flatMap((line, index) => wildcardClassCandidates(line).map((candidate) => `${relative(path)}:${index + 1} ${candidate}`))
    );
    assert.deepEqual(offenders, [], "name a real token instead of a wildcard (see docs/DESIGN.md)");
  });
});
