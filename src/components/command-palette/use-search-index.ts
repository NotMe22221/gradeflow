"use client";

import { useCallback, useEffect, useState } from "react";

import type { SearchIndex } from "@/lib/search/types";

type Entry = { index: SearchIndex; at: number };

/** Per signed-in user, for this page session: a demo account switch never sees another user's index. */
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<SearchIndex>>();

/** Reuse an index this fresh without asking again. */
const FRESH_MS = 5_000;

async function fetchIndex(userId: string): Promise<SearchIndex> {
  const running = inflight.get(userId);
  if (running) return running;
  const request = (async () => {
    const response = await fetch("/api/search", { cache: "no-store", credentials: "same-origin" });
    const body = (await response.json().catch(() => null)) as { ok?: boolean; index?: SearchIndex } | null;
    if (!response.ok || !body?.ok || !body.index) throw new Error("search index unavailable");
    cache.set(userId, { index: body.index, at: Date.now() });
    return body.index;
  })();
  inflight.set(userId, request);
  try {
    return await request;
  } finally {
    inflight.delete(userId);
  }
}

/** Start loading before the palette opens (hover or focus on the search button). */
export function prefetchSearchIndex(userId: string) {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.at < FRESH_MS) return;
  void fetchIndex(userId).catch(() => {
    // The palette shows the error and a retry when it opens.
  });
}

export type SearchIndexState = {
  index: SearchIndex | null;
  status: "loading" | "ready" | "error";
  retry: () => void;
};

/**
 * The viewer's search index while `active` (the palette is open). A cached
 * copy shows at once and is refreshed in the background on every open, so a
 * class or assignment created a moment ago turns up.
 */
export function useSearchIndex(userId: string, active: boolean): SearchIndexState {
  const [index, setIndex] = useState<SearchIndex | null>(() => cache.get(userId)?.index ?? null);
  const [status, setStatus] = useState<SearchIndexState["status"]>(() => (cache.has(userId) ? "ready" : "loading"));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!active) return;
    let current = true;
    const cached = cache.get(userId);
    if (cached) {
      setIndex(cached.index);
      setStatus("ready");
      if (Date.now() - cached.at < FRESH_MS) return;
    } else {
      setIndex(null);
      setStatus("loading");
    }
    fetchIndex(userId).then(
      (fresh) => {
        if (!current) return;
        setIndex(fresh);
        setStatus("ready");
      },
      () => {
        if (!current) return;
        // Keep showing a cached index if there is one; say so only when there's nothing.
        if (!cache.has(userId)) setStatus("error");
      }
    );
    return () => {
      current = false;
    };
  }, [active, userId, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { index, status, retry };
}
