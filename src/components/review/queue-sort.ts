// The To review sort order as it travels in the URL (?sort=). Pure, and no
// "use client": the review page (a server component) parses it too.

import type { QueueSort } from "@/lib/review/types";

/** Every sort the queue offers, in menu order. */
export const QUEUE_SORTS = ["recheck", "confidence", "oldest"] as const satisfies readonly QueueSort[];

/** The order To review opens in, and the one a missing or unknown ?sort= means. */
export const DEFAULT_QUEUE_SORT: QueueSort = "recheck";

/** ?sort= as a sort order: an unknown or missing value means the default. */
export function parseQueueSort(value: string | null | undefined): QueueSort {
  return QUEUE_SORTS.find((sort) => sort === value) ?? DEFAULT_QUEUE_SORT;
}

/** The ?sort= value to write: none for the default, so plain /review links stay plain. */
export function queueSortParam(sort: QueueSort): string | null {
  return sort === DEFAULT_QUEUE_SORT ? null : sort;
}
