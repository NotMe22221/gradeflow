"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  MeasuringStrategy,
  pointerWithin,
  rectIntersection,
  useDroppable,
  type Active,
  type Announcements,
  type CollisionDetection,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Over,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, type SortableData } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  ArrowDown,
  ArrowUp,
  DragHandle,
  Eye,
  EyeOff,
  Lock,
  PanelLeft,
  PanelRight,
  type IconComponent,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Column, SectionLayout } from "@/lib/preferences/schema";
import { cn } from "@/lib/utils";

import { createDragAnnouncer } from "./announcements";
import { useLayoutEditor, type LayoutEditorValue } from "./editor-context";
import { MAIN_STACK, SECTIONS_CONTAINER, SECTIONS_GRID, SECTIONS_SPLIT, SIDE_STACK } from "./grid";
import {
  COLUMN_NAME,
  COLUMNS,
  columnOf,
  describePosition,
  hideSection,
  keepInMain,
  moveBy,
  moveToColumn,
  otherColumn,
  positionOf,
  showSection,
  visibleIn,
  type SectionPosition,
} from "./model";
import { findControl, focusIsOnOrLost, revealControl, SETTLE_MS } from "./reveal";
import { SectionHeading, type SectionAction } from "./section-heading";
import { useEditorSensors, useReducedMotion } from "./sensors";

/** One arrangeable section of a page. `node` is rendered on the server. */
export type SectionSpec = {
  title: string;
  node: React.ReactNode;
  /** One line under the title. */
  description?: string;
  /** A "View all"-style link beside the title. */
  action?: SectionAction;
  /** The section brings its own heading and landmark, so the wrapper adds none. */
  ownHeading?: boolean;
  /** Can be moved but never hidden (shows "Always shown" while arranging). */
  essential?: boolean;
  /** Needs the wide column (a split view, a long form): never offered the side column. */
  mainOnly?: boolean;
  /** Stays interactive while arranging, because it has arrange controls of its own (the class cards). */
  live?: boolean;
};

const ZONE_ID: Record<Column, string> = { main: "zone:main", side: "zone:side" };
const SORTABLE_ID: Record<Column, string> = { main: "sortable:main", side: "sortable:side" };

function zoneColumn(id: UniqueIdentifier | undefined): Column | null {
  if (id === ZONE_ID.main || id === SORTABLE_ID.main) return "main";
  if (id === ZONE_ID.side || id === SORTABLE_ID.side) return "side";
  return null;
}

const EASE = "cubic-bezier(0.2, 0, 0, 1)";

/**
 * A page's sections in the saved arrangement: a main column and, when it has
 * anything in it, a 20-22rem side column (stacked after the main column on
 * narrow pages). In edit mode every section gets a drag handle and
 * single-pointer move buttons (up, down, other column, hide), hidden
 * sections wait in a tray, and sections can be dragged within and between
 * the columns with a mouse, a long press, or the keyboard.
 */
export function CustomizableSections({
  sections,
  className,
}: {
  sections: Record<string, SectionSpec>;
  className?: string;
}) {
  const editor = useLayoutEditor();
  const ids = Object.keys(sections);
  const idsKey = ids.join("|");
  const available = useMemo(() => new Set(idsKey.split("|")), [idsKey]);
  const mainOnly = useMemo(
    () => new Set(Object.entries(sections).filter(([, spec]) => spec.mainOnly).map(([id]) => id)),
    [sections]
  );
  const layout = keepInMain(editor?.layout ?? { main: ids, side: [], hidden: [] }, mainOnly);
  const prefix = editor?.surface ?? "page";

  if (editor?.editing && editor.layout) {
    return (
      <EditableSections
        editor={editor}
        layout={layout}
        sections={sections}
        available={available}
        mainOnly={mainOnly}
        prefix={prefix}
        className={className}
      />
    );
  }

  let main = visibleIn(layout, "main", available);
  let side = visibleIn(layout, "side", available);
  // Everything moved to the side column: it becomes the page's only column.
  if (main.length === 0) [main, side] = [side, []];

  return (
    <div className={cn(SECTIONS_CONTAINER, className)} data-layout={prefix}>
      <div className={cn(SECTIONS_GRID, side.length > 0 && SECTIONS_SPLIT)}>
        <div className={MAIN_STACK}>
          {main.map((id) => (
            <SectionView key={id} headingId={`${prefix}-${id}-heading`} spec={sections[id] as SectionSpec} />
          ))}
        </div>
        {side.length > 0 ? (
          <div className={SIDE_STACK}>
            {side.map((id) => (
              <SectionView key={id} headingId={`${prefix}-${id}-heading`} spec={sections[id] as SectionSpec} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionView({ headingId, spec }: { headingId: string; spec: SectionSpec }) {
  if (spec.ownHeading) return <div className="@container min-w-0">{spec.node}</div>;
  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <SectionHeading id={headingId} title={spec.title} description={spec.description} action={spec.action} />
      <div className="@container min-w-0">{spec.node}</div>
    </section>
  );
}

// --- Edit mode ------------------------------------------------------------------

function EditableSections({
  editor,
  layout,
  sections,
  available,
  mainOnly,
  prefix,
  className,
}: {
  editor: LayoutEditorValue;
  layout: SectionLayout;
  sections: Record<string, SectionSpec>;
  available: ReadonlySet<string>;
  mainOnly: ReadonlySet<string>;
  prefix: string;
  className?: string;
}) {
  const sensors = useEditorSensors();
  const reduced = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [keyboardActive, setKeyboardActive] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(layout);
  const activeRef = useRef<string | null>(null);
  const snapshot = useRef<SectionLayout | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const movedAcross = useRef(false);
  const pendingFocus = useRef<string | null>(null);
  /** The section picked up with the keyboard, whose handle keeps focus for the whole drag. */
  const keyboardDrag = useRef<string | null>(null);
  const revealTimer = useRef<number | undefined>(undefined);
  const [announcer] = useState(() => createDragAnnouncer("a column"));

  useLayoutEffect(() => {
    layoutRef.current = layout;
  });

  useEffect(() => () => window.clearTimeout(revealTimer.current), []);

  // After a column change the item settles for a frame before collisions resume.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      movedAcross.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [layout]);

  // Keep keyboard focus on the control that was used, wherever its section
  // went, and keep that control in view (clear of the sticky bars).
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const control = findControl(rootRef.current, target);
    if (control) revealControl(control);
  });

  // A keyboard drag into the other column re-renders the section there, and
  // focus would fall to the page: put it back on the handle being dragged.
  useLayoutEffect(() => {
    const id = keyboardDrag.current;
    if (!id) return;
    const handle = findControl(rootRef.current, `${id}:handle`);
    if (handle && document.activeElement !== handle && focusIsOnOrLost(handle)) handle.focus({ preventScroll: true });
  });

  /** After a keyboard drop or cancel, once the section has settled, bring its handle into view. */
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

  const essential = useMemo(
    () => new Set(Object.entries(sections).filter(([, spec]) => spec.essential).map(([id]) => id)),
    [sections]
  );
  const title = useCallback((id: string) => sections[id]?.title ?? id, [sections]);
  const visible: Record<Column, string[]> = {
    main: visibleIn(layout, "main", available),
    side: visibleIn(layout, "side", available),
  };
  const hidden = [...layout.main, ...layout.side].filter((id) => layout.hidden.includes(id) && available.has(id));

  function apply(next: SectionLayout, focus: string | null, message: string) {
    editor.setLayout(() => next);
    pendingFocus.current = focus;
    editor.announce(message);
  }

  function moveVertical(id: string, delta: -1 | 1) {
    const column = columnOf(layout, id);
    if (!column) return;
    const next = moveBy(layout, id, delta, available);
    if (next === layout) {
      editor.announce(`${title(id)} is already ${delta < 0 ? "first" : "last"} in the ${COLUMN_NAME[column]}.`);
      return;
    }
    const position = positionOf(next, id, available);
    apply(next, `${id}:${delta < 0 ? "up" : "down"}`, `${title(id)} moved to ${position ? describePosition(position) : "a new place"}.`);
  }

  function moveAcrossColumns(id: string) {
    const column = columnOf(layout, id);
    if (!column) return;
    const to = otherColumn(column);
    if (to === "side" && mainOnly.has(id)) return;
    const next = moveToColumn(layout, id, to, undefined, available);
    const position = positionOf(next, id, available);
    apply(next, `${id}:column`, `${title(id)} moved to ${position ? describePosition(position) : `the ${COLUMN_NAME[to]}`}.`);
  }

  function hide(id: string) {
    const column = columnOf(layout, id);
    if (!column || essential.has(id)) return;
    const list = visible[column];
    const index = list.indexOf(id);
    const neighbour = list[index + 1] ?? list[index - 1] ?? visible[otherColumn(column)][0];
    apply(
      hideSection(layout, id, essential),
      neighbour ? `${neighbour}:handle` : `hidden:${id}`,
      `${title(id)} hidden. Show it again from Hidden sections at the top.`
    );
  }

  function show(id: string) {
    const next = showSection(layout, id);
    const position = positionOf(next, id, available);
    apply(next, `${id}:handle`, `${title(id)} is back, at ${position ? describePosition(position) : "its old place"}.`);
  }

  // --- Dragging -----------------------------------------------------------------

  const columnFor = useCallback(
    (id: UniqueIdentifier | undefined): Column | null =>
      id === undefined ? null : (zoneColumn(id) ?? columnOf(layoutRef.current, String(id))),
    []
  );

  /**
   * Pointer first, then overlap. Over a column's empty space, the nearest
   * section in that column wins, so a section dropped below the last one
   * lands at the end. Right after a section changes column, keep the last
   * target for a frame so the two columns don't trade it back and forth.
   */
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const pointer = pointerWithin(args);
      const hits = pointer.length > 0 ? pointer : rectIntersection(args);
      let overId = getFirstCollision(hits, "id");
      if (overId != null) {
        const zone = zoneColumn(overId);
        if (zone) {
          const inColumn = visibleIn(layoutRef.current, zone, available);
          if (inColumn.length > 0) {
            const nearest = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter((container) =>
                inColumn.includes(String(container.id))
              ),
            });
            overId = nearest[0]?.id ?? overId;
          }
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }
      if (movedAcross.current) lastOverId.current = activeRef.current;
      return lastOverId.current != null ? [{ id: lastOverId.current }] : [];
    },
    [available]
  );

  /** Where the active section would land over `over`. */
  const targetPosition = useCallback(
    (active: Active, over: Over): SectionPosition | null => {
      const id = String(active.id);
      const zone = zoneColumn(over.id);
      if (zone) {
        const inColumn = visibleIn(layoutRef.current, zone, available);
        const at = inColumn.indexOf(id);
        return at >= 0
          ? { column: zone, position: at + 1, count: inColumn.length }
          : { column: zone, position: inColumn.length + 1, count: inColumn.length + 1 };
      }
      const sortable = (over.data.current as SortableData | undefined)?.sortable;
      const column = zoneColumn(sortable?.containerId) ?? columnFor(over.id);
      if (!sortable || !column) return positionOf(layoutRef.current, String(over.id), available);
      const includesActive = sortable.items.includes(id);
      return { column, position: sortable.index + 1, count: sortable.items.length + (includesActive ? 0 : 1) };
    },
    [available, columnFor]
  );

  const where = (position: SectionPosition | null) => (position ? describePosition(position) : null);
  const announcements: Announcements = {
    onDragStart({ active }) {
      const id = String(active.id);
      return announcer.start(id, title(id), where(positionOf(layoutRef.current, id, available)));
    },
    onDragOver({ active, over }) {
      return announcer.over(
        title(String(active.id)),
        over ? String(over.id) : null,
        over ? where(targetPosition(active, over)) : null
      );
    },
    onDragEnd({ active, over }) {
      return announcer.drop(
        title(String(active.id)),
        over ? String(over.id) : null,
        over ? where(targetPosition(active, over)) : null
      );
    },
    onDragCancel({ active }) {
      return announcer.cancel(title(String(active.id)));
    },
  };

  function onDragStart({ active, activatorEvent }: DragStartEvent) {
    snapshot.current = layoutRef.current;
    activeRef.current = String(active.id);
    keyboardDrag.current = activatorEvent instanceof KeyboardEvent ? String(active.id) : null;
    setKeyboardActive(keyboardDrag.current !== null);
    setActiveId(String(active.id));
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const id = String(active.id);
    const from = columnOf(layoutRef.current, id);
    const to = columnFor(over.id);
    if (!from || !to || from === to) return;
    if (to === "side" && mainOnly.has(id)) return;

    const target = visibleIn(layoutRef.current, to, available);
    let index = target.length;
    if (!zoneColumn(over.id)) {
      const overIndex = target.indexOf(String(over.id));
      const translated = active.rect.current.translated;
      const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false;
      if (overIndex >= 0) index = overIndex + (below ? 1 : 0);
    }
    movedAcross.current = true;
    editor.setLayout((current) => {
      const fixed = keepInMain(current, mainOnly);
      return columnOf(fixed, id) === to ? fixed : moveToColumn(fixed, id, to, index, available);
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id);
    if (over && !zoneColumn(over.id) && String(over.id) !== id) {
      const column = columnOf(layoutRef.current, id);
      if (column && column === columnFor(over.id)) {
        const to = visibleIn(layoutRef.current, column, available).indexOf(String(over.id));
        if (to >= 0) {
          editor.setLayout((current) => moveToColumn(keepInMain(current, mainOnly), id, column, to, available));
        }
      }
    }
    endDrag(id);
  }

  function onDragCancel({ active }: DragCancelEvent) {
    const before = snapshot.current;
    if (before) editor.setLayout(() => before);
    endDrag(String(active.id));
  }

  function endDrag(id: string) {
    if (keyboardDrag.current === id) revealHandle(id);
    keyboardDrag.current = null;
    setKeyboardActive(false);
    setActiveId(null);
    activeRef.current = null;
    lastOverId.current = null;
    snapshot.current = null;
  }

  return (
    <DndContext
      id={`layout-${prefix}`}
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "To pick up a section, press Space or Enter. Use the arrow keys to move it, including to the other column, then press Space or Enter to drop it, or Escape to cancel. The move buttons beside each section do the same without dragging.",
        },
      }}
    >
      <div ref={rootRef} className={cn(SECTIONS_CONTAINER, className)} data-layout={prefix} data-editing="">
        <HiddenTray ids={hidden} title={title} onShow={show} />
        <div className={cn(SECTIONS_GRID, SECTIONS_SPLIT)}>
          {COLUMNS.map((column) => (
            <EditColumn key={column} column={column} ids={visible[column]}>
              {visible[column].map((id, index) => {
                const spec = sections[id] as SectionSpec;
                return (
                  <SortableSection
                    key={id}
                    id={id}
                    spec={spec}
                    column={column}
                    position={index + 1}
                    count={visible[column].length}
                    canChangeColumn={!(column === "main" && mainOnly.has(id))}
                    reduced={reduced}
                    onMove={(delta) => moveVertical(id, delta)}
                    onChangeColumn={() => moveAcrossColumns(id)}
                    onHide={() => hide(id)}
                  />
                );
              })}
            </EditColumn>
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={reduced ? null : { duration: 200, easing: EASE }}>
        {activeId ? <DragTile title={title(activeId)} focused={keyboardActive} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function EditColumn({ column, ids, children }: { column: Column; ids: string[]; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: ZONE_ID[column] });
  const empty = ids.length === 0;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="px-1 text-[0.8125rem] leading-5 font-medium text-muted-foreground">
        {column === "main" ? "Main column" : "Side column"}
      </p>
      <SortableContext id={SORTABLE_ID[column]} items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-28 flex-1 flex-col gap-4 rounded-2xl transition-colors motion-reduce:transition-none",
            empty && "border-2 border-dashed border-border",
            empty && isOver && "border-primary bg-primary-soft/40"
          )}
        >
          {children}
          {empty ? (
            <p className="mx-auto max-w-[18rem] px-4 pt-10 pb-8 text-center text-[0.875rem] text-pretty text-muted-foreground">
              {column === "main"
                ? "Drag a section here."
                : "Drag a section here, or use “Move to the side column” on one. On small screens it shows below the rest."}
            </p>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableSection({
  id,
  spec,
  column,
  position,
  count,
  canChangeColumn,
  reduced,
  onMove,
  onChangeColumn,
  onHide,
}: {
  id: string;
  spec: SectionSpec;
  column: Column;
  position: number;
  count: number;
  canChangeColumn: boolean;
  reduced: boolean;
  onMove: (delta: -1 | 1) => void;
  onChangeColumn: () => void;
  onHide: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    transition: reduced ? null : { duration: 200, easing: EASE },
    attributes: { roleDescription: "movable section" },
  });
  const other = otherColumn(column);
  const name = spec.title;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-section={id}
      className={cn(
        "relative min-w-0 rounded-2xl border bg-secondary/70 p-2",
        isDragging ? "border-2 border-dashed border-primary bg-primary-soft/25" : "border-border"
      )}
    >
      {/* While dragged, the section leaves an empty dashed placeholder. Its handle
          stays rendered (visible, but transparent) so it keeps keyboard focus for
          the whole drag; the drag tile shows the focus ring meanwhile. */}
      <div className={cn(isDragging && "invisible")}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Move ${name}`}
            data-control={`${id}:handle`}
            className={cn(
              "visible flex size-10 shrink-0 cursor-grab touch-manipulation items-center justify-center rounded-full text-muted-foreground outline-none select-none [-webkit-touch-callout:none] hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
              isDragging && "opacity-0"
            )}
          >
            <DragHandle className="size-5" aria-hidden />
          </button>
          {/* Sized by its real text, so the controls wrap below only when they don't fit beside it;
              capped at the room beside the handle, so the title itself never wraps away from it. */}
          <div className="min-w-0 flex-auto max-w-[calc(100%-3rem)]">
            <h3 className="truncate font-display text-[1.375rem] leading-7 font-extrabold tracking-[-0.015em] text-foreground">
              {name}
            </h3>
            {spec.essential ? (
              <p className="flex items-center gap-1 text-[0.75rem] leading-4 text-muted-foreground">
                <Lock className="size-3.5" aria-hidden />
                Always shown
              </p>
            ) : null}
          </div>
          <div className="ml-auto flex items-center">
            <MoveButton
              label={`Move ${name} up`}
              hint="Move up"
              icon={ArrowUp}
              disabled={position <= 1}
              control={`${id}:up`}
              onClick={() => onMove(-1)}
            />
            <MoveButton
              label={`Move ${name} down`}
              hint="Move down"
              icon={ArrowDown}
              disabled={position >= count}
              control={`${id}:down`}
              onClick={() => onMove(1)}
            />
            {canChangeColumn ? (
              <MoveButton
                label={`Move ${name} to the ${COLUMN_NAME[other]}`}
                hint={`Move to the ${COLUMN_NAME[other]}`}
                icon={other === "side" ? PanelRight : PanelLeft}
                control={`${id}:column`}
                onClick={onChangeColumn}
              />
            ) : null}
            {spec.essential ? null : (
              <MoveButton label={`Hide ${name}`} hint="Hide" icon={EyeOff} control={`${id}:hide`} onClick={onHide} />
            )}
          </div>
        </div>
        {spec.live ? (
          <div className="@container mt-2 min-w-0 px-1 pb-1">{spec.node}</div>
        ) : (
          <SectionPreview>{spec.node}</SectionPreview>
        )}
      </div>
    </div>
  );
}

function MoveButton({
  label,
  hint,
  icon: Icon,
  disabled = false,
  control,
  onClick,
}: {
  label: string;
  hint: string;
  icon: IconComponent;
  disabled?: boolean;
  control: string;
  onClick: () => void;
}) {
  // aria-disabled, not disabled: the button keeps focus after it takes a
  // section to the top or bottom, and says so instead of going quiet.
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

/**
 * The section as it looks, inert and capped in height while arranging, so a
 * long section is still easy to move and the whole page fits in view. A
 * fade marks where a taller section is cut off.
 */
function SectionPreview({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cut, setCut] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setCut(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      inert
      className={cn(
        "@container pointer-events-none mt-2 max-h-[15rem] min-w-0 overflow-hidden rounded-xl select-none",
        cut && "[mask-image:linear-gradient(to_bottom,currentColor_calc(100%-4rem),transparent)]"
      )}
    >
      <div>{children}</div>
    </div>
  );
}

function HiddenTray({
  ids,
  title,
  onShow,
}: {
  ids: string[];
  title: (id: string) => string;
  onShow: (id: string) => void;
}) {
  return (
    <div
      role="group"
      aria-labelledby="hidden-sections-heading"
      className="mb-6 flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-dashed border-border px-4 py-2"
    >
      <h3
        id="hidden-sections-heading"
        className="flex items-center gap-2 font-sans text-[0.875rem] leading-5 font-medium text-foreground"
      >
        <EyeOff className="size-[1.125rem] text-muted-foreground" aria-hidden />
        Hidden sections
      </h3>
      {ids.length === 0 ? (
        <p className="text-[0.875rem] leading-5 text-pretty text-muted-foreground">
          None. A section you hide waits here until you show it again.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {ids.map((id) => (
            <li key={id} className="flex h-10 items-center gap-1 rounded-full bg-secondary pr-1 pl-4">
              <span className="text-[0.875rem] text-foreground">{title(id)}</span>
              <Button
                type="button"
                variant="text"
                size="sm"
                aria-label={`Show ${title(id)}`}
                data-control={`hidden:${id}`}
                onClick={() => onShow(id)}
              >
                <Eye aria-hidden />
                Show
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * What follows the pointer (or the arrow keys) during a drag. dnd-kit measures
 * this outer node for keyboard moves, so it must start at the section's
 * top-left corner: the inset over the handle is padding, never a margin, or
 * the first ArrowLeft / ArrowRight lands in the section's own column.
 */
function DragTile({ title, focused }: { title: string; focused: boolean }) {
  return (
    <div className="w-fit cursor-grabbing p-2">
      <div
        className={cn(
          "inline-flex h-12 items-center gap-1 rounded-2xl border border-primary bg-card pr-5 shadow-raised",
          // A keyboard drag: the handle being moved has focus, and this is where it shows.
          focused && "ring-2 ring-ring ring-offset-2 ring-offset-background"
        )}
      >
        <span className="flex size-10 items-center justify-center text-primary">
          <DragHandle className="size-5" aria-hidden />
        </span>
        <span className="text-[0.9375rem] font-medium whitespace-nowrap text-foreground">{title}</span>
      </div>
    </div>
  );
}
