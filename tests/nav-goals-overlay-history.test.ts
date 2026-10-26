import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createOverlayHistory, OVERLAY_STATE_KEY, type OverlayHistoryEnv } from "@/components/app-shell/overlay-history";

/**
 * A browser-like session history: pushState/replaceState change the current
 * entry at once; back() is a queued traversal that lands later and fires
 * popstate (as real browsers do).
 */
function fakeBrowser(startPath = "/gradebook", { navigationApi = false } = {}) {
  type HistoryEntry = { path: string; state: unknown; key: string };
  let keys = 0;
  const nextKey = () => `k${(keys += 1)}`;
  const entries: HistoryEntry[] = [
    { path: "/dashboard", state: { __NA: true }, key: nextKey() },
    { path: startPath, state: { __NA: true }, key: nextKey() },
  ];
  let index = 1;
  const listeners = new Set<() => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const fire = () => {
    for (const listener of [...listeners]) listener();
  };

  const env: OverlayHistoryEnv = {
    history: {
      get state() {
        return entries[index].state;
      },
      pushState(data, _unused, url) {
        entries.splice(index + 1);
        entries.push({ path: url ?? entries[index].path, state: data, key: nextKey() });
        index = entries.length - 1;
      },
      back() {
        setTimeout(() => {
          if (index === 0) return;
          index -= 1;
          fire();
        }, 2);
      },
    },
    location: {
      get pathname() {
        return entries[index].path;
      },
    },
    entryKey: navigationApi ? () => entries[index].key : undefined,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    setTimeout: (callback, ms) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        callback();
      }, ms);
      timers.add(timer);
      return timer;
    },
    clearTimeout: (handle) => {
      clearTimeout(handle as ReturnType<typeof setTimeout>);
      timers.delete(handle as ReturnType<typeof setTimeout>);
    },
  };

  return {
    env,
    entries,
    get index() {
      return index;
    },
    get path() {
      return entries[index].path;
    },
    /** The user presses Back. */
    pressBack() {
      env.history.back();
    },
    /** The router navigates with replace (Next's HistoryUpdater writes its own state). */
    routerReplace(path: string) {
      // Replacing keeps the entry (and its Navigation API key) but rewrites its state.
      entries[index] = { path, state: { __NA: true }, key: entries[index].key };
    },
    routerPush(path: string) {
      env.history.pushState({ __NA: true }, "", path);
    },
  };
}

const tick = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

describe("overlay history (Back closes the open sheet or search)", () => {
  it("adds one same-URL entry that keeps the router's state, and Back closes the overlay", async () => {
    const browser = fakeBrowser();
    const overlays = createOverlayHistory(() => browser.env);
    let closed = 0;
    const id = overlays.open(() => (closed += 1));
    assert.equal(browser.entries.length, 3);
    assert.equal(browser.path, "/gradebook");
    const state = browser.env.history.state as Record<string, unknown>;
    assert.equal(state.__NA, true);
    assert.equal(state[OVERLAY_STATE_KEY], id);
    assert.ok(overlays.active());

    browser.pressBack();
    await tick();
    assert.equal(closed, 1);
    // Still on the page the overlay was opened on.
    assert.equal(browser.path, "/gradebook");
    assert.equal(browser.index, 1);
    assert.ok(!overlays.active());
    // Closing (the effect cleanup after Back) doesn't go back again.
    overlays.release(id);
    await tick();
    assert.equal(browser.index, 1);
  });

  it("pops its own entry when the overlay is closed another way", async () => {
    const browser = fakeBrowser();
    const overlays = createOverlayHistory(() => browser.env);
    let closed = 0;
    const id = overlays.open(() => (closed += 1));
    overlays.release(id);
    await overlays.settled();
    assert.equal(browser.index, 1);
    assert.equal(browser.path, "/gradebook");
    // That popstate was ours, not a Back: onBack isn't called.
    assert.equal(closed, 0);
    // Back now leaves the page as usual.
    browser.pressBack();
    await tick();
    assert.equal(browser.path, "/dashboard");
  });

  it("lets a link inside take the entry over, so Back from the new page returns here", async () => {
    const browser = fakeBrowser();
    const overlays = createOverlayHistory(() => browser.env);
    const id = overlays.open(() => assert.fail("not a Back"));
    assert.ok(overlays.takeOver());
    browser.routerReplace("/review");
    overlays.release(id);
    await tick();
    assert.deepEqual(
      browser.entries.map((entry) => entry.path),
      ["/dashboard", "/gradebook", "/review"]
    );
    assert.equal(browser.path, "/review");
    browser.pressBack();
    await tick();
    assert.equal(browser.path, "/gradebook");
  });

  it("keeps the entry when reopened before the release runs (React's dev double effect)", async () => {
    const browser = fakeBrowser();
    const overlays = createOverlayHistory(() => browser.env);
    let closedBy = "";
    const first = overlays.open(() => (closedBy = "first"));
    overlays.release(first);
    const second = overlays.open(() => (closedBy = "second"));
    assert.equal(second, first);
    await tick();
    assert.equal(browser.entries.length, 3);
    browser.pressBack();
    await tick();
    assert.equal(closedBy, "second");
    assert.equal(browser.path, "/gradebook");
  });

  it("waits for an earlier entry to be popped before pushing a new one", async () => {
    const browser = fakeBrowser();
    const overlays = createOverlayHistory(() => browser.env);
    const first = overlays.open(() => {});
    overlays.release(first);
    // Let the deferred release start its history.back(), but not land.
    await new Promise((resolve) => setTimeout(resolve, 0));
    let closed = 0;
    const second = overlays.open(() => (closed += 1));
    assert.notEqual(second, "");
    await tick();
    // The old entry was popped and the new one pushed in its place: no stray Back closed it.
    assert.equal(closed, 0);
    assert.equal(browser.entries.length, 3);
    assert.equal((browser.env.history.state as Record<string, unknown>)[OVERLAY_STATE_KEY], second);
    browser.pressBack();
    await tick();
    assert.equal(closed, 1);
    assert.equal(browser.path, "/gradebook");
  });

  it("never pops an entry it doesn't own, or on another page", async () => {
    const browser = fakeBrowser();
    const overlays = createOverlayHistory(() => browser.env);
    const id = overlays.open(() => {});
    // Something else navigated (pushed a page) while the overlay was open.
    browser.routerPush("/insights");
    overlays.release(id);
    await tick();
    assert.equal(browser.path, "/insights");
    assert.equal(browser.entries.length, 4);
    assert.ok(!overlays.takeOver());
  });

  it("still recognises its entry after the router rewrote its state (Navigation API key)", async () => {
    const browser = fakeBrowser("/gradebook", { navigationApi: true });
    const overlays = createOverlayHistory(() => browser.env);
    const id = overlays.open(() => {});
    // A refresh while open: Next replaces the entry's state, dropping our marker.
    browser.routerReplace("/gradebook");
    overlays.release(id);
    await overlays.settled();
    assert.equal(browser.index, 1);
    assert.equal(browser.path, "/gradebook");
  });

  it("without the Navigation API, leaves a rewritten entry alone rather than guess", async () => {
    const browser = fakeBrowser("/gradebook");
    const overlays = createOverlayHistory(() => browser.env);
    const id = overlays.open(() => {});
    browser.routerReplace("/gradebook");
    overlays.release(id);
    await overlays.settled();
    assert.equal(browser.index, 2);
  });

  it("settles at once when nothing is pending", async () => {
    const browser = fakeBrowser();
    const overlays = createOverlayHistory(() => browser.env);
    await overlays.settled();
    assert.ok(!overlays.active());
    assert.equal(overlays.release(""), undefined);
  });
});
