"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  type Announcements,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  DragHandle,
  MoreVertical,
  type IconComponent,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { createDragAnnouncer } from "./announcements";
import { useLayoutEditor } from "./editor-context";
import { CLASS_GRID } from "./grid";
import {
  arrayMove,
  availableMoves,
  describeOrderPosition,
  mergeOrder,
  moveInOrder,
  orderItems,
  type OrderMove,
} from "./model";
import { findControl, focusIsOnOrLost, revealControl, SETTLE_MS } from "./reveal";
import { useEditorSensors, useReducedMotion } from "./sensors";

/** One class card. `node` is the card, rendered on the server. */
export type ClassGridItem = { id: string; name: string; node: React.ReactNode };

const MOVE_LABEL: Record<OrderMove, string> = {
  start: "Move to start",
  earlier: "Move earlier",
  later: "Move later",
  end: "Move to end",
};

const MOVE_ICON: Record<OrderMove, IconComponent> = {
  start: ChevronFirst,
  earlier: ChevronLeft,
  later: ChevronRight,
  end: ChevronLast,
};

const EASE = "cubic-bezier(0.2, 0, 0, 1)";

/**
 * Class cards in the person's saved order (new classes at the end). Cards
 * are ordinary links until the page is in edit mode; then the grid becomes
 * sortable (drag a handle, long-press on touch, or use the keyboard), and
 * each card's footer offers "Move earlier / later" buttons plus a menu with
 * "Move to start / end", so every move also works with a single click.
 */
export function ArrangeableClassGrid({
  items,
  empty,
  label = "Classes",
  className,
}: {
  items: ClassGridItem[];
  /** Shown when there are no classes. */
  empty?: React.ReactNode;
  /** Accessible name for the list. */
  label?: string;
  className?: string;
}) {
  const editor = useLayoutEditor();
  const ordered = orderItems(items, editor?.classOrder ?? []);

  if (items.length === 0) {
    return editor?.editing ? <div inert>{empty}</div> : <>{empty}</>;
  }

  if (!editor?.editing) {
    return (
      <ul aria-label={label} className={cn(CLASS_GRID, className)}>
        {ordered.map((item) => (
          <li key={item.id} className="min-w-0">
            {item.node}
          </li>
        ))}
      </ul>
    );
  }

  return <SortableGrid items={ordered} label={label} className={className} />;
}

function SortableGrid({ items, label, className }: { items: ClassGridItem[]; label: string; className?: string }) {
  const editor = useLayoutEditor();
  const sensors = useEditorSensors();
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLUListElement>(null);
  const pendingFocus = useRef<string | null>(null);
  /** The card picked up with the keyboard. */
  const keyboardDrag = useRef<string | null>(null);
  const revealTimer = useRef<number | undefined>(undefined);
  const [announcer] = useState(() => createDragAnnouncer("a place"));

  const ids = items.map((item) => item.id);
  const nameOf = (id: string) => items.find((item) => item.id === id)?.name ?? "Class";

  // Keep focus on the move button that was used and keep it in view: it
  // usually keeps focus as its card moves, so focus() alone would never scroll.
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const control = findControl(rootRef.current, target);
    if (control) revealControl(control);
  });

  useEffect(() => () => window.clearTimeout(revealTimer.current), []);

  /** After a keyboard drop or cancel, once the card has settled, bring its handle into view. */
  function revealHandle(id: string) {
    window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(
      () => {
        const handle = findControl(rootRef.current, `${id}:handle`);
        if (handle && focusIsOnOrLost(handle)) revealControl(handle);
      },
      reduced ? 0 : SETTLE_MS
    );
  }

  function onDragStart({ active, activatorEvent }: DragStartEvent) {
    keyboardDrag.current = activatorEvent instanceof KeyboardEvent ? String(active.id) : null;
  }

  function endDrag(id: string) {
    if (keyboardDrag.current === id) revealHandle(id);
    keyboardDrag.current = null;
  }

  function save(next: string[]) {
    editor?.setClassOrder((current) => mergeOrder(next, current));
  }

  function move(id: string, how: OrderMove, focusControl?: string) {
    const next = moveInOrder(ids, id, how);
    const index = next.indexOf(id);
    if (index === ids.indexOf(id)) {
      editor?.announce(`${nameOf(id)} is already ${index === 0 ? "first" : "last"}.`);
      return;
    }
    save(next);
    if (focusControl) pendingFocus.current = focusControl;
    editor?.announce(`${nameOf(id)} moved to ${describeOrderPosition(index, next.length)}.`);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    endDrag(String(active.id));
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    save(arrayMove(ids, from, to));
  }

  function onDragCancel({ active }: DragCancelEvent) {
    endDrag(String(active.id));
  }

  const position = (id: string) => describeOrderPosition(ids.indexOf(id), ids.length);
  const overId = (over: { id: UniqueIdentifier } | null) => (over ? String(over.id) : null);
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const id = String(active.id);
      return announcer.start(id, nameOf(id), position(id));
    },
    onDragOver: ({ active, over }) => announcer.over(nameOf(String(active.id)), overId(over), over && position(String(over.id))),
    onDragEnd: ({ active, over }) => announcer.drop(nameOf(String(active.id)), overId(over), over && position(String(over.id))),
    onDragCancel: ({ active }) => announcer.cancel(nameOf(String(active.id))),
  };

  return (
    <DndContext
      id="class-order"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "To pick up a class, press Space or Enter. Use the arrow keys to move it, then press Space or Enter to drop it, or Escape to cancel. The Move buttons on each card do the same without dragging.",
        },
      }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <ul ref={rootRef} aria-label={label} className={cn(CLASS_GRID, className)}>
          {items.map((item, index) => (
            <SortableCard
              key={item.id}
              item={item}
              index={index}
              count={items.length}
              reduced={reduced}
              onMove={(how, control) => move(item.id, how, control)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableCard({
  item,
  index,
  count,
  reduced,
  onMove,
}: {
  item: ClassGridItem;
  index: number;
  count: number;
  reduced: boolean;
  onMove: (how: OrderMove, focusControl?: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    transition: reduced ? null : { duration: 200, easing: EASE },
    attributes: { roleDescription: "movable class card" },
  });
  const moves = availableMoves(index, count);
  const name = item.name;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-class-card={item.id}
      className={cn("relative min-w-0", isDragging && "z-20")}
    >
      {/* The card as it looks, but not a link while arranging. */}
      <div
        inert
        className={cn(
          "h-full rounded-3xl select-none",
          isDragging ? "shadow-raised ring-2 ring-primary" : "ring-1 ring-primary/25"
        )}
      >
        {item.node}
      </div>
      {/* Arrange controls over the card's footer row (same height, so nothing moves). */}
      <div className="absolute inset-x-px bottom-px flex h-[3.3125rem] items-center gap-1 rounded-b-[calc(1.5rem-1px)] border-t border-border bg-card px-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Move ${name}`}
          data-control={`${item.id}:handle`}
          className="flex size-10 shrink-0 cursor-grab touch-manipulation items-center justify-center rounded-full text-muted-foreground outline-none select-none [-webkit-touch-callout:none] hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        >
          <DragHandle className="size-5" aria-hidden />
        </button>
        <span className="tabular min-w-0 truncate text-[0.8125rem] text-muted-foreground" aria-hidden>
          {index + 1} of {count}
        </span>
        <div className="ml-auto flex shrink-0 items-center">
          <CardMoveButton
            label={`Move ${name} earlier`}
            hint="Move earlier"
            icon={ChevronLeft}
            disabled={!moves.earlier}
            control={`${item.id}:earlier`}
            onClick={() => onMove("earlier", `${item.id}:earlier`)}
          />
          <CardMoveButton
            label={`Move ${name} later`}
            hint="Move later"
            icon={ChevronRight}
            disabled={!moves.later}
            control={`${item.id}:later`}
            onClick={() => onMove("later", `${item.id}:later`)}
          />
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" aria-label={`More ways to move ${name}`}>
                    <MoreVertical className="size-5" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>More moves</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="min-w-[11rem]">
              {(Object.keys(MOVE_LABEL) as OrderMove[]).map((how) => {
                const Icon = MOVE_ICON[how];
                return (
                  <DropdownMenuItem key={how} disabled={!moves[how]} onSelect={() => onMove(how)} className="min-h-10">
                    <Icon aria-hidden />
                    {MOVE_LABEL[how]}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}

function CardMoveButton({
  label,
  hint,
  icon: Icon,
  disabled,
  control,
  onClick,
}: {
  label: string;
  hint: string;
  icon: IconComponent;
  disabled: boolean;
  control: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-disabled={disabled || undefined}
          data-control={control}
          onClick={() => {
            if (!disabled) onClick();
          }}
          className={cn(disabled && "cursor-default opacity-40 hover:bg-transparent hover:text-muted-foreground")}
        >
          <Icon className="size-5" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}
