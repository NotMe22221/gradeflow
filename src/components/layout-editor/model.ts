/*
 * The layout editor's pure model: moving Home sections within and between the
 * main and side columns, hiding and showing them, and reordering class cards.
 * No React and no runtime imports from the preferences schema (which pulls in
 * zod), so it is safe in client bundles and easy to unit test.
 *
 * A SectionLayout keeps hidden sections in their column: hiding is a flag, so
 * showing a section again puts it back where it was. Every move works on the
 * *visible* sections of a column (what the person sees), and hidden ones keep
 * their slots around it.
 */

import type { Column, LayoutSurface, SectionLayout } from "@/lib/preferences/schema";

export const COLUMNS = ["main", "side"] as const satisfies readonly Column[];

/** How a column is named in buttons and screen-reader announcements. */
export const COLUMN_NAME: Record<Column, string> = { main: "main column", side: "side column" };

export function otherColumn(column: Column): Column {
  return column === "main" ? "side" : "main";
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/** A copy of `items` with the item at `from` moved to `to` (both clamped). */
export function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(clamp(to, 0, next.length), 0, item as T);
  return next;
}

export function columnOf(layout: SectionLayout, id: string): Column | null {
  if (layout.main.includes(id)) return "main";
  if (layout.side.includes(id)) return "side";
  return null;
}

export function isHidden(layout: SectionLayout, id: string): boolean {
  return layout.hidden.includes(id);
}

/** The sections a column shows, in order. `available` limits it to sections the page can render. */
export function visibleIn(layout: SectionLayout, column: Column, available?: ReadonlySet<string>): string[] {
  return layout[column].filter((id) => !layout.hidden.includes(id) && (!available || available.has(id)));
}

/**
 * A column's full id list after its visible sections were rearranged into
 * `nextVisible`: hidden sections keep their slots, visible slots are refilled
 * in the new order, and sections that arrived from the other column (more
 * visible ids than slots) go after the rest.
 */
export function mergeVisible(full: readonly string[], hidden: ReadonlySet<string>, nextVisible: readonly string[]): string[] {
  const out: string[] = [];
  let next = 0;
  for (const id of full) {
    if (hidden.has(id)) out.push(id);
    else if (next < nextVisible.length) out.push(nextVisible[next++] as string);
  }
  while (next < nextVisible.length) out.push(nextVisible[next++] as string);
  return out;
}

function withColumnVisible(
  layout: SectionLayout,
  column: Column,
  nextVisible: readonly string[],
  available?: ReadonlySet<string>
): SectionLayout {
  const hidden = new Set(layout.hidden);
  // Sections the page can't render this time count as hidden: they keep their slots.
  if (available) for (const id of layout[column]) if (!available.has(id)) hidden.add(id);
  return { ...layout, [column]: mergeVisible(layout[column], hidden, nextVisible) };
}

/** Where a visible section sits: its column and 1-based position among that column's visible sections. */
export type SectionPosition = { column: Column; position: number; count: number };

export function positionOf(layout: SectionLayout, id: string, available?: ReadonlySet<string>): SectionPosition | null {
  const column = columnOf(layout, id);
  if (!column || isHidden(layout, id)) return null;
  const visible = visibleIn(layout, column, available);
  const index = visible.indexOf(id);
  if (index < 0) return null;
  return { column, position: index + 1, count: visible.length };
}

/** Move a section `delta` places up (negative) or down among its column's visible sections, clamped. */
export function moveBy(layout: SectionLayout, id: string, delta: number, available?: ReadonlySet<string>): SectionLayout {
  const column = columnOf(layout, id);
  if (!column || isHidden(layout, id)) return layout;
  const visible = visibleIn(layout, column, available);
  const from = visible.indexOf(id);
  const to = clamp(from + delta, 0, visible.length - 1);
  if (from < 0 || from === to) return layout;
  return withColumnVisible(layout, column, arrayMove(visible, from, to), available);
}

/**
 * Move a section to a column, at `index` among that column's visible
 * sections (default: the end). Within its own column this is a reorder.
 */
export function moveToColumn(
  layout: SectionLayout,
  id: string,
  column: Column,
  index?: number,
  available?: ReadonlySet<string>
): SectionLayout {
  const from = columnOf(layout, id);
  if (!from || isHidden(layout, id)) return layout;
  if (from === column) {
    const visible = visibleIn(layout, column, available);
    return withColumnVisible(
      layout,
      column,
      arrayMove(visible, visible.indexOf(id), index ?? visible.length - 1),
      available
    );
  }
  const source = visibleIn(layout, from, available).filter((other) => other !== id);
  const target = visibleIn(layout, column, available);
  target.splice(clamp(index ?? target.length, 0, target.length), 0, id);
  // Take it out of the source column first, so it is never placed twice.
  const removed: SectionLayout = { ...layout, [from]: layout[from].filter((other) => other !== id) };
  const afterSource = withColumnVisible(removed, from, source, available);
  return withColumnVisible(afterSource, column, target, available);
}

/** Hide a section (it keeps its place). Essential sections are never hidden. */
export function hideSection(layout: SectionLayout, id: string, essential: ReadonlySet<string>): SectionLayout {
  if (essential.has(id) || isHidden(layout, id) || !columnOf(layout, id)) return layout;
  return { ...layout, hidden: [...layout.hidden, id] };
}

export function showSection(layout: SectionLayout, id: string): SectionLayout {
  if (!isHidden(layout, id)) return layout;
  return { ...layout, hidden: layout.hidden.filter((other) => other !== id) };
}

/**
 * Sections that need the wide column: the student's assignment inbox (a split
 * view) and goal planner (a form with a results table). They can move up and
 * down but are never offered the side column; anything that arranges Home
 * sections (the Customize dialog too) should respect this list.
 */
export const MAIN_ONLY_SECTIONS: Record<LayoutSurface, readonly string[]> = {
  teacherHome: [],
  studentHome: ["inbox", "planner"],
};

/**
 * Sections that need the wide column (a split view, a long form) never sit
 * in the side column: any that do (an old or hand-edited layout) go to the
 * end of the main column.
 */
export function keepInMain(layout: SectionLayout, mainOnly: ReadonlySet<string>): SectionLayout {
  const stray = layout.side.filter((id) => mainOnly.has(id));
  if (stray.length === 0) return layout;
  return {
    ...layout,
    main: [...layout.main, ...stray],
    side: layout.side.filter((id) => !mainOnly.has(id)),
  };
}

export function sameLayout(a: SectionLayout, b: SectionLayout): boolean {
  const same = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((id, i) => id === y[i]);
  const sorted = (ids: readonly string[]) => [...ids].sort();
  return same(a.main, b.main) && same(a.side, b.side) && same(sorted(a.hidden), sorted(b.hidden));
}

// --- Class card order -----------------------------------------------------------

export type OrderMove = "start" | "earlier" | "later" | "end";

/**
 * Items sorted by a saved id order. Items the order doesn't mention keep
 * their relative order and come after the ordered ones (a new class appears
 * at the end, as in Classroom). Same rule as orderByIds in the preferences
 * schema, kept here so client code needn't import the schema.
 */
export function orderItems<T extends { id: string }>(items: readonly T[], order: readonly string[]): T[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  return items
    .map((item, index) => ({ item, index, rank: rank.get(item.id) }))
    .sort((a, b) => {
      if (a.rank !== undefined && b.rank !== undefined) return a.rank - b.rank;
      if (a.rank !== undefined) return -1;
      if (b.rank !== undefined) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

/** `ids` with `id` moved to the start, one place earlier or later, or to the end. */
export function moveInOrder(ids: readonly string[], id: string, move: OrderMove): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return [...ids];
  const to = move === "start" ? 0 : move === "end" ? ids.length - 1 : from + (move === "earlier" ? -1 : 1);
  return arrayMove(ids, from, to);
}

/** Which moves make sense for the item at `index` of `count`. */
export function availableMoves(index: number, count: number): Record<OrderMove, boolean> {
  return { start: index > 0, earlier: index > 0, later: index < count - 1, end: index < count - 1 };
}

/**
 * The class order to save: the cards as now arranged, then any ids from the
 * previous order that this page didn't show (kept, harmlessly, at the end),
 * without duplicates, capped at `max`.
 */
export function mergeOrder(arranged: readonly string[], previous: readonly string[], max = 200): string[] {
  return [...new Set([...arranged, ...previous])].slice(0, max);
}

// --- Words ------------------------------------------------------------------------

/** "position 2 of 4 in the main column". */
export function describePosition(position: SectionPosition): string {
  return `position ${position.position} of ${position.count} in the ${COLUMN_NAME[position.column]}`;
}

/** "position 2 of 5". */
export function describeOrderPosition(index: number, count: number): string {
  return `position ${index + 1} of ${count}`;
}
