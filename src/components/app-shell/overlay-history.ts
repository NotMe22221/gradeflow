// Back closes an open overlay (the phone menu sheet, the full-screen search)
// instead of leaving the page underneath it.
//
// Opening one pushes a history entry for the same URL. Back pops that entry,
// and the overlay closes. Closing it any other way (Esc, the close arrow, the
// scrim) pops the entry again, so history is left as it was. A link followed
// from inside the overlay takes the entry over and navigates with replace, so
// Back from the new page returns to the page the overlay was opened on, as if
// the overlay had never been there.
//
// The state machine is pure apart from its environment (history, location,
// popstate, timers), which is injectable for tests. Next's App Router patches
// pushState and keeps its own state when an entry carries __NA, so the pushed
// entry copies the current state and adds one key.

/** The key marking our entries in history.state. */
export const OVERLAY_STATE_KEY = "gsOverlay";

export type OverlayHistoryEnv = {
  history: {
    readonly state: unknown;
    pushState: (data: unknown, unused: string, url?: string | null) => void;
    back: () => void;
  };
  location: { readonly pathname: string };
  /**
   * The current entry's key from the Navigation API, where there is one. It survives the
   * router rewriting the entry's state (a refresh while the overlay is open), which our
   * history.state marker does not.
   */
  entryKey?: () => string | null;
  addEventListener: (type: "popstate", listener: () => void) => void;
  removeEventListener: (type: "popstate", listener: () => void) => void;
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

export type OverlayHistory = {
  /** An overlay opened: add its entry (once any earlier one is popped). Returns its id. */
  open: (onBack: () => void) => string;
  /** The overlay closed by itself: pop its entry, unless a navigation took it over. */
  release: (id: string) => void;
  /**
   * A link inside the overlay is about to navigate. True when the overlay's entry is on top
   * and is now the caller's to replace (navigate with replace, not push).
   */
  takeOver: () => boolean;
  /** Resolves once no overlay entry is waiting to be popped (run in-page moves after this). */
  settled: () => Promise<void>;
  /** An overlay entry is on top of history right now. */
  active: () => boolean;
};

/** How long to wait for the popstate of our own history.back() before moving on. */
const SETTLE_TIMEOUT_MS = 600;

type Entry = { id: string; path: string; onBack: () => void; pushed: boolean; key: string | null };

export function createOverlayHistory(getEnv: () => OverlayHistoryEnv): OverlayHistory {
  let counter = 0;
  let active: Entry | null = null;
  let releasing: Entry | null = null;
  let releaseTimer: unknown = null;
  let settling: Promise<void> | null = null;

  function stateKey(env: OverlayHistoryEnv): unknown {
    const state = env.history.state;
    return state && typeof state === "object" ? (state as Record<string, unknown>)[OVERLAY_STATE_KEY] : undefined;
  }

  /** Whether the current history entry is this overlay's own. */
  function onEntry(env: OverlayHistoryEnv, entry: Entry): boolean {
    if (stateKey(env) === entry.id) return true;
    const key = env.entryKey?.() ?? null;
    return entry.key !== null && key !== null && key === entry.key;
  }

  function cancelRelease(env: OverlayHistoryEnv) {
    if (releaseTimer !== null) env.clearTimeout(releaseTimer);
    releaseTimer = null;
    releasing = null;
  }

  function onPopState() {
    const env = getEnv();
    const entry = active;
    if (!entry || !entry.pushed) return;
    // Forward onto our own entry again: nothing to do.
    if (onEntry(env, entry)) return;
    // Back (or any traversal) left the entry: close the overlay instead of leaving the page.
    active = null;
    cancelRelease(env);
    env.removeEventListener("popstate", onPopState);
    entry.onBack();
  }

  function push(entry: Entry) {
    if (active !== entry || entry.pushed) return;
    const env = getEnv();
    const state = env.history.state && typeof env.history.state === "object" ? env.history.state : {};
    env.history.pushState({ ...(state as object), [OVERLAY_STATE_KEY]: entry.id }, "");
    entry.pushed = true;
    entry.key = env.entryKey?.() ?? null;
    env.addEventListener("popstate", onPopState);
  }

  function popOwnEntry(env: OverlayHistoryEnv) {
    const done = new Promise<void>((resolve) => {
      let timer: unknown = null;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        env.removeEventListener("popstate", onPop);
        if (timer !== null) env.clearTimeout(timer);
        if (settling === done) settling = null;
        resolve();
      };
      // The browser restores the entry's scroll position right after popstate, in the same
      // task: settle a task later, so an in-page move made next isn't undone by it.
      const onPop = () => {
        env.removeEventListener("popstate", onPop);
        env.setTimeout(finish, 0);
      };
      timer = env.setTimeout(finish, SETTLE_TIMEOUT_MS);
      env.addEventListener("popstate", onPop);
    });
    settling = done;
    env.history.back();
  }

  return {
    open(onBack) {
      const env = getEnv();
      // Closed and reopened before the release ran (or React's dev double effect): keep the entry.
      if (releasing && active === releasing && onEntry(env, releasing)) {
        const entry = releasing;
        cancelRelease(env);
        entry.onBack = onBack;
        return entry.id;
      }
      // One overlay at a time; a second one rides on the first entry.
      if (active) return "";
      counter += 1;
      const entry: Entry = {
        id: `o${Date.now().toString(36)}${counter}`,
        path: env.location.pathname,
        onBack,
        pushed: false,
        key: null,
      };
      active = entry;
      // An earlier entry still being popped: push after it lands, or Back would pop the wrong one.
      if (settling) void settling.then(() => push(entry));
      else push(entry);
      return entry.id;
    },

    release(id) {
      const env = getEnv();
      const entry = active;
      if (!id || !entry || entry.id !== id) return;
      if (!entry.pushed) {
        active = null;
        return;
      }
      // Deferred a tick, so an immediate reopen (or a dev double effect) can keep the entry.
      cancelRelease(env);
      releasing = entry;
      releaseTimer = env.setTimeout(() => {
        releaseTimer = null;
        if (releasing !== entry) return;
        releasing = null;
        if (active !== entry) return;
        active = null;
        env.removeEventListener("popstate", onPopState);
        // Only pop what is still ours, on the page it was opened on.
        if (!onEntry(env, entry) || env.location.pathname !== entry.path) return;
        popOwnEntry(env);
      }, 0);
    },

    takeOver() {
      const env = getEnv();
      const entry = active;
      if (!entry || !entry.pushed || !onEntry(env, entry)) return false;
      cancelRelease(env);
      active = null;
      env.removeEventListener("popstate", onPopState);
      return true;
    },

    settled() {
      const env = getEnv();
      return new Promise<void>((resolve) => {
        let rounds = 0;
        const check = () => {
          rounds += 1;
          if (releasing && rounds < 100) {
            env.setTimeout(check, 5);
            return;
          }
          if (settling) {
            void settling.then(check);
            return;
          }
          resolve();
        };
        check();
      });
    },

    active() {
      return Boolean(active && active.pushed && !releasing);
    },
  };
}

function browserEnv(): OverlayHistoryEnv {
  const navigation = (window as Window & { navigation?: { currentEntry?: { key?: string } | null } }).navigation;
  return {
    history: window.history,
    location: window.location,
    entryKey: navigation ? () => navigation.currentEntry?.key ?? null : undefined,
    addEventListener: (type, listener) => window.addEventListener(type, listener),
    removeEventListener: (type, listener) => window.removeEventListener(type, listener),
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
  };
}

/** The app's overlay history (browser only; the environment is read lazily). */
export const overlayHistory = createOverlayHistory(browserEnv);
