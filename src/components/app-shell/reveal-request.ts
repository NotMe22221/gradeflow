// A navigation's wish to show one #section of the page it opens (Goals:
// /student#goal-planner). The App Router tries the hash once, while the
// destination's loading skeleton is up, finds nothing and gives up; the
// section itself reveals on arrival when it finds a request for it. Requests
// are short-lived, so a section that mounts later for another reason (Home
// re-arranged, a refresh) never steals the view or focus. Pure; the clock is
// injectable for tests.

/** How long a request waits for its section to mount (a slow page load). */
export const REVEAL_REQUEST_TTL_MS = 15_000;

export type RevealRequests = {
  /** Ask to reveal the section with this id once it is on the page ("" clears). */
  request: (id: string) => void;
  clear: () => void;
  /** Whether a fresh request for this id is waiting. */
  has: (id: string) => boolean;
  /** Use up the request for this id; true if there was a fresh one. */
  take: (id: string) => boolean;
};

export function createRevealRequests(now: () => number = Date.now): RevealRequests {
  let pending: { id: string; at: number } | null = null;

  function fresh(id: string): boolean {
    if (!pending) return false;
    if (now() - pending.at > REVEAL_REQUEST_TTL_MS) {
      pending = null;
      return false;
    }
    return pending.id === id;
  }

  return {
    request(id) {
      pending = id ? { id, at: now() } : null;
    },
    clear() {
      pending = null;
    },
    has: fresh,
    take(id) {
      if (!fresh(id)) return false;
      pending = null;
      return true;
    },
  };
}

/** The app's one queue (one navigation at a time). */
export const revealRequests = createRevealRequests();
