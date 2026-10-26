// Bookkeeping for appearance saves that are still on their way. Pure (no DOM,
// no React, no server calls), so tests/customize-pending-saves.test.ts can
// drive it directly; appearance.ts applies what it returns.
//
// Each setting with a save in flight keeps two values: the one the user just
// picked (what the page must keep showing) and the last one known to be
// stored. A failed save goes back to the stored value, never to a value that
// was only on screen because an earlier save hadn't finished yet.

type Values<K extends string> = Partial<Record<K, string>>;

/** One save started with `begin`, passed back to `finish`. */
export type Save<K extends string> = { readonly version: number; readonly values: Values<K> };

export function createSaveTracker<K extends string>() {
  let lastVersion = 0;
  const pending = new Map<K, { value: string; version: number; saved: string }>();

  return {
    /** The newest unsaved value of each setting with a save on its way. */
    pending: pending as ReadonlyMap<K, { readonly value: string }>,

    /**
     * Start saving `patch`. `onScreen` is what the page shows now; for a
     * setting with no save on its way, that is its stored value.
     */
    begin(patch: Values<K>, onScreen: Record<K, string>): Save<K> {
      const version = ++lastVersion;
      const values: Values<K> = {};
      for (const key of Object.keys(patch) as K[]) {
        const value = patch[key];
        if (value === undefined) continue;
        values[key] = value;
        // While an earlier change to this setting is still on its way, the screen shows that
        // unsaved value, so carry the older stored one forward instead.
        const saved = pending.get(key)?.saved ?? onScreen[key];
        pending.set(key, { value, version, saved });
      }
      return { version, values };
    },

    /**
     * Finish a save. Returns what to put back on screen: nothing when it was
     * saved, and after a failure the last stored value of each setting that
     * no newer change has replaced since. (A newer change still on its way
     * reports its own outcome, and falls back to the stored value if it
     * fails too.)
     */
    finish(save: Save<K>, ok: boolean): Values<K> {
      const keys = Object.keys(save.values) as K[];
      const revert: Values<K> = {};
      for (const key of keys) {
        const entry = pending.get(key);
        if (entry?.version !== save.version) continue;
        revert[key] = entry.saved;
        pending.delete(key);
      }
      if (!ok) return revert;
      // This value is stored now, so a newer change to the same setting that fails comes back to it.
      for (const key of keys) {
        const newer = pending.get(key);
        if (newer) newer.saved = save.values[key] as string;
      }
      return {};
    },
  };
}
