/*
 * What the layout editor says to screen readers during a drag. Pure (no React,
 * no dnd-kit runtime), so the wording and the one-drag memory are unit tested.
 *
 * Two dnd-kit timings shape it:
 * - Right after a pick-up, dnd-kit reports the item over its own spot, in the
 *   same batch as the pick-up. Announcing that would replace "Picked up …"
 *   before a screen reader ever hears it, so the first over-event that only
 *   repeats where the item already is says nothing.
 * - On Escape, the page's own onDragCancel (which puts the layout back) runs
 *   before the cancel announcement is built, so the announcer keeps the
 *   starting position itself instead of reading it from the page.
 */

export type DragAnnouncer = {
  /** "Picked up This week, position 1 of 3 in the main column." */
  start(id: string, name: string, where: string | null): string;
  /**
   * "This week is over position 2 of 3 in the main column.", or undefined
   * when there is nothing new to say (the same target as last time).
   */
  over(name: string, overId: string | null, where: string | null): string | undefined;
  /** "Dropped This week at position 2 of 3 in the main column." */
  drop(name: string, overId: string | null, where: string | null): string;
  /** "Cancelled. This week went back to position 1 of 3 in the main column." */
  cancel(name: string): string;
};

/**
 * One announcer per sortable list. `outside` names what an item can be
 * dragged over, for "… is not over a column."
 */
export function createDragAnnouncer(outside: string): DragAnnouncer {
  let origin: string | null = null;
  let lastOver: string | null = null;
  return {
    start(id, name, where) {
      origin = where;
      lastOver = id;
      return `Picked up ${name}${where ? `, ${where}` : ""}.`;
    },
    over(name, overId, where) {
      if (overId === lastOver) return undefined;
      lastOver = overId;
      if (overId === null) return `${name} is not over ${outside}.`;
      return where ? `${name} is over ${where}.` : undefined;
    },
    drop(name, overId, where) {
      lastOver = null;
      if (overId === null) return `${name} was dropped where it started.`;
      return `Dropped ${name}${where ? ` at ${where}` : ""}.`;
    },
    cancel(name) {
      const where = origin;
      origin = null;
      lastOver = null;
      return `Cancelled. ${name} went back${where ? ` to ${where}` : ""}.`;
    },
  };
}
