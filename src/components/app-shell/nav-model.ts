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

function pathOf(href: string): string {
  return href.split(/[?#]/)[0] || "/";
}

function hashOf(href: string): string {
  const at = href.indexOf("#");
  return at === -1 ? "" : href.slice(at);
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
