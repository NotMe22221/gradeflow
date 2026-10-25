"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveReviewDraft } from "@/app/(teacher)/review/actions";
import { createDraft, summarizeDraft, type ItemDraft } from "@/lib/review/model";
import type { ReviewItem } from "@/lib/review/types";

const AUTOSAVE_DELAY_MS = 800;

/**
 * idle: nothing edited yet. pending: edited, save scheduled. saving: request
 * in flight. saved / error: last result. blocked: a field is invalid, so the
 * draft is held back until it is fixed (the server would reject it anyway).
 */
export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error" | "blocked";

export type SaveState = { status: SaveStatus; error?: string };

const IDLE: SaveState = { status: "idle" };

/**
 * Per-submission edit state, kept in memory for the whole session so moving
 * between papers never loses unsaved edits, plus debounced draft autosave.
 * Each submission has its own timer, version counter, and save chain, so a
 * pending save still lands after the teacher moves on to the next paper.
 */
export function useReviewDrafts(items: ReviewItem[]) {
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

  const draftsRef = useRef<Record<string, ItemDraft>>({});
  const itemsRef = useRef(new Map<string, ReviewItem>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const versions = useRef(new Map<string, number>());
  const chains = useRef(new Map<string, Promise<void>>());
  const statusRef = useRef<Record<string, SaveStatus>>({});

  useEffect(() => {
    const map = itemsRef.current;
    for (const item of items) map.set(item.id, item);
  }, [items]);

  const setSaveState = useCallback((id: string, state: SaveState) => {
    statusRef.current[id] = state.status;
    setSaveStates((prev) => ({ ...prev, [id]: state }));
  }, []);

  const runSave = useCallback(
    (id: string): Promise<void> => {
      const run = async () => {
        const item = itemsRef.current.get(id);
        const draft = draftsRef.current[id];
        if (!item || !draft) return;
        const summary = summarizeDraft(item, draft);
        if (!summary.savable) {
          setSaveState(id, { status: "blocked" });
          return;
        }
        const version = versions.current.get(id) ?? 0;
        setSaveState(id, { status: "saving" });
        let result: Awaited<ReturnType<typeof saveReviewDraft>>;
        try {
          result = await saveReviewDraft(id, summary.payload);
        } catch {
          result = { ok: false, error: "Couldn't reach the server. Check your connection." };
        }
        // Newer edits arrived while saving: their own scheduled save reports.
        if ((versions.current.get(id) ?? 0) !== version) return;
        setSaveState(id, result.ok ? { status: "saved" } : { status: "error", error: result.error });
      };
      const previous = chains.current.get(id) ?? Promise.resolve();
      const next = previous.then(run, run);
      chains.current.set(id, next);
      return next;
    },
    [setSaveState]
  );

  const schedule = useCallback(
    (item: ReviewItem, draft: ItemDraft) => {
      const existing = timers.current.get(item.id);
      if (existing) clearTimeout(existing);
      timers.current.delete(item.id);

      if (!summarizeDraft(item, draft).savable) {
        setSaveState(item.id, { status: "blocked" });
        return;
      }
      setSaveState(item.id, { status: "pending" });
      timers.current.set(
        item.id,
        setTimeout(() => {
          timers.current.delete(item.id);
          void runSave(item.id);
        }, AUTOSAVE_DELAY_MS)
      );
    },
    [runSave, setSaveState]
  );

  const getDraft = useCallback(
    (item: ReviewItem): ItemDraft => drafts[item.id] ?? createDraft(item),
    [drafts]
  );

  const updateDraft = useCallback(
    (item: ReviewItem, update: (draft: ItemDraft) => ItemDraft) => {
      itemsRef.current.set(item.id, item);
      const current = draftsRef.current[item.id] ?? createDraft(item);
      const next = update(current);
      draftsRef.current = { ...draftsRef.current, [item.id]: next };
      versions.current.set(item.id, (versions.current.get(item.id) ?? 0) + 1);
      setDrafts(draftsRef.current);
      schedule(item, next);
    },
    [schedule]
  );

  /** Latest draft for a submission, read outside render (e.g. on approve). */
  const readDraft = useCallback(
    (item: ReviewItem): ItemDraft => draftsRef.current[item.id] ?? createDraft(item),
    []
  );

  /**
   * Save any scheduled draft now and wait for every save in flight, so no
   * autosave can land after the paper is approved or sent back.
   */
  const flush = useCallback(
    async (id: string) => {
      const timer = timers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.current.delete(id);
        void runSave(id);
      }
      await (chains.current.get(id) ?? Promise.resolve());
    },
    [runSave]
  );

  /** Forget a submission that left the queue. */
  const discard = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    delete statusRef.current[id];
    setSaveStates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const retry = useCallback((id: string) => void runSave(id), [runSave]);

  // Warn before closing the tab with unsaved edits, and flush scheduled
  // saves immediately if the teacher navigates elsewhere in the app.
  useEffect(() => {
    const pendingTimers = timers.current;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const busy = Object.values(statusRef.current).some(
        (status) => status === "pending" || status === "saving" || status === "blocked"
      );
      if (busy) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      for (const [id, timer] of pendingTimers) {
        clearTimeout(timer);
        void runSave(id);
      }
      pendingTimers.clear();
    };
  }, [runSave]);

  const saveStateFor = useCallback((id: string): SaveState => saveStates[id] ?? IDLE, [saveStates]);

  return { getDraft, readDraft, updateDraft, flush, discard, retry, saveStateFor };
}
