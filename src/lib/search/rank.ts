// Matching, ranking and grouping for the command palette. Pure, so it is
// unit-tested (tests/search.test.ts) and runs on every keystroke without a
// round trip: the palette filters the viewer's (already scoped) index in the
// browser.

import type { SearchGroup, SearchGroupId, SearchItem } from "@/lib/search/types";

/** Lower case, accents and punctuation removed, single spaces: "Lab Report: Osmosis" -> "lab report osmosis". */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function words(text: string): string[] {
  return text.split(" ").filter(Boolean);
}

function initials(titleWords: readonly string[]): string {
  return titleWords.map((word) => word[0]).join("");
}

/**
 * How well `query` matches an item; 0 means no match. Every word of the
 * query must match somewhere (title first, then the subtitle and keywords).
 * The title's start counts most, then the start of any title word, then text
 * inside a word (two or more letters only, so "e" doesn't match everything).
 * Initials work too: "es" finds "Environmental Science". Ties keep the
 * index's order (the user's class order, newest work first).
 */
export function matchScore(query: string, item: Pick<SearchItem, "title" | "subtitle" | "keywords">): number {
  const q = normalize(query);
  if (!q) return 0;
  const title = normalize(item.title);
  const titleWords = words(title);
  const secondary = normalize([item.subtitle ?? "", ...(item.keywords ?? [])].join(" "));
  const secondaryWords = words(secondary);
  const tokens = words(q);

  let score = 0;
  let allMatched = true;
  for (const token of tokens) {
    const inside = token.length > 1;
    const wordIndex = titleWords.findIndex((word) => word.startsWith(token));
    let points = 0;
    if (wordIndex === 0) points = 120;
    else if (wordIndex > 0) points = 100;
    else if (inside && title.includes(token)) points = 50;
    else if (secondaryWords.some((word) => word.startsWith(token))) points = 30;
    else if (inside && secondary.includes(token)) points = 15;
    if (points === 0) {
      allMatched = false;
      break;
    }
    score += points;
  }

  const acronym = tokens.length === 1 && q.length >= 2 && titleWords.length >= 2 && initials(titleWords).startsWith(q);
  if (!allMatched) {
    if (!acronym) return 0;
    score = 250;
  }
  if (title === q) score += 1000;
  else if (title.startsWith(q)) score += 500;
  else if (tokens.length > 1 && title.includes(q)) score += 200;
  return score;
}

export const GROUP_HEADINGS: Record<SearchGroupId, string> = {
  recent: "Recent",
  class: "Classes",
  assignment: "Assignments",
  student: "Students",
  page: "Pages",
  action: "Actions",
};

const GROUP_ORDER: SearchGroupId[] = ["recent", "class", "assignment", "student", "page", "action"];

/** Results per group while searching. */
export const GROUP_LIMITS: Record<Exclude<SearchGroupId, "recent">, number> = {
  class: 5,
  assignment: 8,
  student: 8,
  page: 6,
  action: 6,
};

export const MAX_RECENT = 6;
/** Before typing: recent items, then up to this many classes. */
const EMPTY_CLASS_LIMIT = 6;

/** Saved recent keys (from storage, untrusted) as a clean list. */
export function parseRecent(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const keys = raw.filter((value): value is string => typeof value === "string" && value.length > 0 && value.length <= 200);
  return [...new Set(keys)].slice(0, MAX_RECENT);
}

/** `key` moved to the front of the recent list. */
export function pushRecent(keys: readonly string[], key: string, max = MAX_RECENT): string[] {
  return [key, ...keys.filter((existing) => existing !== key)].slice(0, max);
}

/** Commands (theme switch, Customize) aren't places, so they never become recent items. */
export function canBeRecent(item: Pick<SearchItem, "href" | "command">): boolean {
  return Boolean(item.href) && !item.command;
}

/**
 * The palette's groups for a query. Before typing: recent items (only those
 * still in the viewer's index, so stale or foreign ids never show), classes,
 * pages, and suggested actions. While typing: every match, grouped by kind
 * and capped per group, best match first within a group; groups are ordered
 * by their best match, so the top result is always first. Each item appears
 * once.
 */
export function searchGroups(
  items: readonly SearchItem[],
  query: string,
  { recent = [] }: { recent?: readonly string[] } = {}
): SearchGroup[] {
  const groups: SearchGroup[] = [];

  if (!normalize(query)) {
    const byKey = new Map(items.map((item) => [item.key, item]));
    const recentItems = recent
      .map((key) => byKey.get(key))
      .filter((item): item is SearchItem => item !== undefined && canBeRecent(item))
      .slice(0, 5);
    const shown = new Set(recentItems.map((item) => item.key));
    const rest = items.filter((item) => !shown.has(item.key));
    const push = (id: SearchGroupId, list: SearchItem[]) => {
      if (list.length > 0) groups.push({ id, heading: GROUP_HEADINGS[id], items: list });
    };
    push("recent", recentItems);
    push("class", rest.filter((item) => item.kind === "class").slice(0, EMPTY_CLASS_LIMIT));
    push("page", rest.filter((item) => item.kind === "page"));
    push("action", rest.filter((item) => item.kind === "action" && item.suggested));
    return groups;
  }

  const scored = items
    .map((item, index) => ({ item, index, score: matchScore(query, item) }))
    .filter((entry) => entry.score > 0);
  const best = new Map<SearchGroupId, number>();
  for (const id of GROUP_ORDER) {
    if (id === "recent") continue;
    const matches = scored
      .filter((entry) => entry.item.kind === id)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, GROUP_LIMITS[id]);
    if (matches.length === 0) continue;
    best.set(id, matches[0].score);
    groups.push({ id, heading: GROUP_HEADINGS[id], items: matches.map((entry) => entry.item) });
  }
  return groups.sort(
    (a, b) => (best.get(b.id) ?? 0) - (best.get(a.id) ?? 0) || GROUP_ORDER.indexOf(a.id) - GROUP_ORDER.indexOf(b.id)
  );
}

/** Total results across groups. */
export function countResults(groups: readonly SearchGroup[]): number {
  return groups.reduce((sum, group) => sum + group.items.length, 0);
}

export type HighlightSegment = { text: string; match: boolean };

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

/**
 * `text` split into matched and unmatched runs for the query's words, so the
 * palette can bold what matched. Prefers a match at the start of a word.
 */
export function highlight(text: string, query: string): HighlightSegment[] {
  const tokens = words(normalize(query));
  const lower = text.toLowerCase();
  // Case mapping that changes length (rare scripts) would misalign ranges: skip highlighting.
  if (tokens.length === 0 || lower.length !== text.length) return [{ text, match: false }];

  const marked = new Array<boolean>(text.length).fill(false);
  for (const token of tokens) {
    let at = -1;
    for (let from = lower.indexOf(token); from !== -1; from = lower.indexOf(token, from + 1)) {
      if (!isWordChar(lower[from - 1])) {
        at = from;
        break;
      }
      if (at === -1 && token.length > 1) at = from;
    }
    if (at === -1) continue;
    for (let i = at; i < at + token.length; i++) marked[i] = true;
  }

  const segments: HighlightSegment[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = segments[segments.length - 1];
    if (last && last.match === marked[i]) last.text += text[i];
    else segments.push({ text: text[i], match: marked[i] });
  }
  return segments;
}
