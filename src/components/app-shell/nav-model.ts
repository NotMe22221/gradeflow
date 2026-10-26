// Pure navigation rules shared by the drawer, the rail and the phone bottom
// bar (and by the role layouts, which run on the server, hence no "use
// client" here). Tested in tests/navigation.test.ts.

/** Cookie that remembers the collapsed desktop drawer, so it renders collapsed on the server (no shift). */
export const NAV_COLLAPSED_COOKIE = "gs-nav-collapsed";
export const NAV_COLLAPSED_MAX_AGE = 60 * 60 * 24 * 365;

export type NavMatchable = {
  id: string;
  href: string;
  /** Only the exact path (Home at /student must not light up for /student/todo). */
  exact?: boolean;
  /** Extra path prefixes that belong to this destination. */
  matches?: readonly string[];
};

/** "/student" from "/student?x=1#goal-planner". */
export function pathOf(href: string): string {
  return href.split(/[?#]/)[0] || "/";
}

/** "?x=1" from "/student?x=1#goal-planner" ("" without a query), in the shape of location.search. */
export function searchOf(href: string): string {
  const hashAt = href.indexOf("#");
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt);
  const at = beforeHash.indexOf("?");
  const search = at === -1 ? "" : beforeHash.slice(at);
  return search === "?" ? "" : search;
}

/** "#goal-planner" from "/student#goal-planner" ("" without one), in the shape of location.hash. */
export function hashOf(href: string): string {
  const at = href.indexOf("#");
  const hash = at === -1 ? "" : href.slice(at);
  return hash === "#" ? "" : hash;
}

/** The element id a #hash names ("goal-planner"), or "" for none. */
export function hashTargetId(hash: string): string {
  if (!hash.startsWith("#") || hash.length < 2) return "";
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

/**
 * Whether following `href` stays on the page that is open: the same path and
 * query, differing at most in the #hash. The router does not scroll for such
 * a link (Home re-selected on Home, Goals on Home), so navigation handles it
 * in the page. A different query is a different view (/review?assignment=x),
 * so it navigates as usual.
 */
export function isInPageHref(href: string, here: { pathname: string; search: string }): boolean {
  return pathOf(href) === here.pathname && searchOf(href) === (here.search === "?" ? "" : here.search);
}

export type ClickLike = {
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  defaultPrevented?: boolean;
};

/** A plain primary click (or Enter): not one that opens a new tab or window. */
export function isPlainClick(event: ClickLike): boolean {
  return (
    !event.defaultPrevented &&
    (event.button ?? 0) === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * The one destination that marks the current page. A destination with a
 * #hash (Goals: /student#goal-planner) wins on its page while the URL has
 * that hash; otherwise the longest matching path wins, so /classes/x/grades
 * lights up Classes rather than nothing, and Home only matches itself.
 */
export function activeNavId(items: readonly NavMatchable[], pathname: string, hash = ""): string | null {
  for (const item of items) {
    const itemHash = hashOf(item.href);
    if (itemHash && pathname === pathOf(item.href) && hash === itemHash) return item.id;
  }
  let best: { id: string; length: number } | null = null;
  for (const item of items) {
    if (hashOf(item.href)) continue;
    const path = pathOf(item.href);
    let length = -1;
    if (pathname === path) length = path.length + 1;
    else if (!item.exact && pathname.startsWith(`${path}/`)) length = path.length;
    for (const prefix of item.matches ?? []) {
      if (pathname.startsWith(prefix)) length = Math.max(length, prefix.length);
    }
    if (length >= 0 && (!best || length > best.length)) best = { id: item.id, length };
  }
  return best?.id ?? null;
}

/** The class whose pages are open ("/classes/<id>/..."), if it is one of the listed classes. */
export function activeClassId(classIds: readonly string[], classHrefBase: string, pathname: string): string | null {
  if (!pathname.startsWith(classHrefBase)) return null;
  const id = pathname.slice(classHrefBase.length).split("/")[0];
  return id && classIds.includes(id) ? id : null;
}

/** "3", or "99+" for big counts, for badges. */
export function badgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}
