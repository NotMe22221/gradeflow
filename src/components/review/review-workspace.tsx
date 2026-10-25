"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ListChecks } from "lucide-react";
import { toast } from "sonner";

import { approveAndPublish, sendBackToStudent } from "@/app/(teacher)/review/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApproveDialog } from "@/components/review/approve-dialog";
import { PaperPane } from "@/components/review/paper-pane";
import { QueueList } from "@/components/review/queue-list";
import { DesktopActionBar, MobileActionBar } from "@/components/review/review-action-bar";
import {
  CaughtUpState,
  FilteredEmptyState,
  QueueEmptyState,
} from "@/components/review/review-empty-state";
import { ReviewHeader, SORT_LABELS } from "@/components/review/review-header";
import {
  blockingReason,
  layoutEvidence,
  markDomId,
  scoreInputId,
  selectionAfterRemoval,
  sortQueue,
  summarizeDraft,
} from "@/components/review/review-model";
import { RubricPane } from "@/components/review/rubric-pane";
import { SendBackDialog } from "@/components/review/send-back-dialog";
import { ShortcutsDialog } from "@/components/review/shortcuts-dialog";
import type { QueueSort, ReviewFilterOption, ReviewItem } from "@/components/review/types";
import { useReviewDrafts } from "@/components/review/use-review-drafts";
import { useReviewShortcuts } from "@/components/review/use-review-shortcuts";
import { viewAsStudent } from "@/lib/auth/actions";
import { firstName, formatScore } from "@/lib/format";

type PaneTab = "paper" | "rubric";
type AssignmentFilter = { id: string; title: string | null } | null;

function buildFilterOptions(items: ReviewItem[]): ReviewFilterOption[] {
  const options = new Map<string, ReviewFilterOption>();
  for (const item of items) {
    const existing = options.get(item.assignment.id);
    if (existing) existing.count += 1;
    else {
      options.set(item.assignment.id, {
        id: item.assignment.id,
        title: item.assignment.title,
        className: item.assignment.className,
        count: 1,
      });
    }
  }
  return [...options.values()].sort((a, b) => a.title.localeCompare(b.title));
}

function afterLayout(run: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(run));
}

/** Scroll a highlighted quote into view and flash it. */
function flashElement(element: HTMLElement) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  element.classList.remove("animate-flash");
  void element.offsetWidth; // restart the animation if it is already running
  element.classList.add("animate-flash");
  element.addEventListener("animationend", () => element.classList.remove("animate-flash"), {
    once: true,
  });
}

export function ReviewWorkspace({
  items,
  initialAssignmentId,
  initialSelectedId,
  filterTitle,
}: {
  items: ReviewItem[];
  initialAssignmentId: string | null;
  initialSelectedId: string | null;
  /** Title for the ?assignment filter, when the teacher owns that assignment. */
  filterTitle: string | null;
}) {
  const router = useRouter();
  const drafts = useReviewDrafts(items);

  const [filter, setFilter] = useState<AssignmentFilter>(
    initialAssignmentId ? { id: initialAssignmentId, title: filterTitle } : null
  );
  const [sort, setSort] = useState<QueueSort>("confidence");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [handledCount, setHandledCount] = useState(0);
  const [tab, setTab] = useState<PaneTab>("paper");
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [sendBackTargetId, setSendBackTargetId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [sendingBack, setSendingBack] = useState(false);
  // Synchronous guard against double submits, ahead of any re-render.
  const busyRef = useRef(false);

  const liveItems = useMemo(() => items.filter((item) => !removedIds.has(item.id)), [items, removedIds]);
  const filterOptions = useMemo(() => buildFilterOptions(liveItems), [liveItems]);
  const queue = useMemo(
    () =>
      sortQueue(filter ? liveItems.filter((item) => item.assignment.id === filter.id) : liveItems, sort),
    [liveItems, filter, sort]
  );

  const current = queue.find((item) => item.id === selectedId) ?? queue[0] ?? null;
  const currentIndex = current ? queue.indexOf(current) : -1;
  const draft = current ? drafts.getDraft(current) : null;
  const summary = current && draft ? summarizeDraft(current, draft) : null;
  const blockedReason = summary ? blockingReason(summary) : null;
  const layout = useMemo(
    () => (current ? layoutEvidence(current.content, current.criteria) : null),
    [current]
  );

  const approveItem = liveItems.find((item) => item.id === approveTargetId) ?? null;
  const sendBackItem = liveItems.find((item) => item.id === sendBackTargetId) ?? null;
  const approveSummary = approveItem ? summarizeDraft(approveItem, drafts.getDraft(approveItem)) : null;
  const busy = publishing || sendingBack;

  // Keep ?assignment and ?s in the URL so a reload or shared link lands on
  // the same paper. replaceState avoids a server round trip.
  const currentId = current?.id ?? null;
  const filterId = filter?.id ?? null;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (filterId) url.searchParams.set("assignment", filterId);
    else url.searchParams.delete("assignment");
    if (currentId) url.searchParams.set("s", currentId);
    else url.searchParams.delete("s");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [filterId, currentId]);

  // On phones the whole page scrolls: start each paper at the top.
  const previousIdRef = useRef(currentId);
  useEffect(() => {
    if (previousIdRef.current === currentId) return;
    previousIdRef.current = currentId;
    if (window.matchMedia("(max-width: 1023px)").matches && window.scrollY > 0) {
      window.scrollTo({ top: 0 });
    }
  }, [currentId]);

  const goBy = useCallback(
    (offset: number) => {
      if (currentIndex < 0) return;
      const target = queue[currentIndex + offset];
      if (target) setSelectedId(target.id);
    },
    [queue, currentIndex]
  );

  const removeFromQueue = useCallback(
    (id: string) => {
      const nextId = selectionAfterRemoval(
        queue.map((item) => item.id),
        id
      );
      setRemovedIds((prev) => new Set(prev).add(id));
      setSelectedId(nextId);
      setHandledCount((count) => count + 1);
      setTab("paper");
      drafts.discard(id);
    },
    [queue, drafts]
  );

  const focusCriterion = useCallback((submissionId: string, criterionId: string) => {
    setTab("rubric");
    afterLayout(() => {
      const input = document.getElementById(scoreInputId(submissionId, criterionId));
      if (!input) return;
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus({ preventScroll: true });
    });
  }, []);

  const requestApprove = useCallback(() => {
    if (!current || !summary || busyRef.current) return;
    if (!summary.ready) {
      toast.error("Not ready to publish yet", { description: blockingReason(summary) ?? undefined });
      const firstProblem = summary.invalidIds[0] ?? summary.missingIds[0];
      if (firstProblem) focusCriterion(current.id, firstProblem);
      return;
    }
    setApproveTargetId(current.id);
  }, [current, summary, focusCriterion]);

  const requestSendBack = useCallback(() => {
    if (!current || busyRef.current) return;
    setSendBackTargetId(current.id);
  }, [current]);

  async function confirmApprove() {
    const item = approveItem;
    if (!item || busyRef.current) return;
    busyRef.current = true;
    setPublishing(true);
    try {
      await drafts.flush(item.id);
      const latest = summarizeDraft(item, drafts.readDraft(item));
      if (!latest.ready) {
        toast.error("Not ready to publish yet", { description: blockingReason(latest) ?? undefined });
        setApproveTargetId(null);
        return;
      }
      const result = await approveAndPublish(item.id, latest.payload);
      if (!result.ok) {
        toast.error("Couldn't publish this grade", { description: result.error });
        setApproveTargetId(null);
        router.refresh();
        return;
      }
      const score = formatScore(result.totalScore, result.maxScore);
      toast.success("Grade published", {
        description: `${result.studentName} · ${score} is now in the gradebook.`,
        action: {
          label: "View as student",
          onClick: () => void viewAsStudent(result.studentId, result.assignmentId),
        },
      });
      setApproveTargetId(null);
      removeFromQueue(item.id);
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server", {
        description: "Check your connection, then reload to see whether the grade was published.",
      });
      setApproveTargetId(null);
    } finally {
      busyRef.current = false;
      setPublishing(false);
    }
  }

  async function confirmSendBack(note: string): Promise<boolean> {
    const item = sendBackItem;
    if (!item || busyRef.current) return false;
    busyRef.current = true;
    setSendingBack(true);
    try {
      await drafts.flush(item.id);
      const result = await sendBackToStudent(item.id, note);
      if (!result.ok) {
        toast.error("Couldn't send this paper back", { description: result.error });
        router.refresh();
        return false;
      }
      toast.success(`Sent back to ${firstName(item.student.name)} with your note.`);
      setSendBackTargetId(null);
      removeFromQueue(item.id);
      router.refresh();
      return true;
    } catch {
      toast.error("Couldn't reach the server", { description: "Check your connection and try again." });
      return false;
    } finally {
      busyRef.current = false;
      setSendingBack(false);
    }
  }

  const showEvidence = useCallback(
    (criterionId: string) => {
      if (!current || !layout) return;
      const markIndex = layout.markForCriterion[criterionId];
      if (markIndex === undefined) return;
      setTab("paper");
      const id = markDomId(current.id, markIndex);
      afterLayout(() => {
        const mark = document.getElementById(id);
        if (mark) flashElement(mark);
      });
    },
    [current, layout]
  );

  const overlayOpen = approveItem !== null || sendBackItem !== null || shortcutsOpen || queueOpen;

  useReviewShortcuts(!overlayOpen, {
    onNext: () => goBy(1),
    onPrevious: () => goBy(-1),
    onApprove: requestApprove,
    onSendBack: requestSendBack,
    onHelp: () => setShortcutsOpen(true),
  });

  let body: React.ReactNode;
  if (!current || !summary || !draft || !layout) {
    body = (
      <div className="flex flex-1 items-center justify-center bg-background px-4 py-12 sm:px-8">
        {liveItems.length === 0 ? (
          handledCount > 0 ? (
            <CaughtUpState />
          ) : (
            <QueueEmptyState />
          )
        ) : (
          <FilteredEmptyState
            assignmentTitle={filter?.title ?? null}
            otherCount={liveItems.length}
            onShowAll={() => setFilter(null)}
          />
        )}
      </div>
    );
  } else {
    const actionProps = {
      saveState: drafts.saveStateFor(current.id),
      onRetrySave: () => drafts.retry(current.id),
      onSendBack: requestSendBack,
      onApprove: requestApprove,
      blockedReason,
      busy,
    };

    body = (
      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Papers in the queue"
          className="hidden w-72 shrink-0 flex-col border-r border-border bg-card 2xl:flex"
        >
          <div className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Queue</h2>
            <span className="text-xs text-muted-foreground">{SORT_LABELS[sort]}</span>
          </div>
          <QueueList
            items={queue}
            currentId={current.id}
            onSelect={setSelectedId}
            className="min-h-0 flex-1 overflow-y-auto p-2"
          />
        </aside>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as PaneTab)}
          className="flex min-w-0 flex-1 flex-col gap-0 lg:min-h-0"
        >
          <div className="sticky top-14 z-20 border-b border-border bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paper">
                <FileText aria-hidden />
                Paper
              </TabsTrigger>
              <TabsTrigger value="rubric">
                <ListChecks aria-hidden />
                Rubric
                <span className="tabular text-xs font-normal text-muted-foreground">
                  {formatScore(summary.total, summary.maxTotal)}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <TabsContent
              value="paper"
              forceMount
              className="flex min-w-0 flex-1 flex-col focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset data-[state=inactive]:hidden lg:min-h-0 lg:data-[state=inactive]:flex"
            >
              <PaperPane
                key={current.id}
                item={current}
                layout={layout}
                className="flex-1 lg:min-h-0 lg:overflow-y-auto"
              />
            </TabsContent>
            <TabsContent
              value="rubric"
              forceMount
              className="flex min-w-0 flex-col border-border focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset data-[state=inactive]:hidden lg:min-h-0 lg:w-1/2 lg:flex-none lg:border-l lg:data-[state=inactive]:flex 2xl:w-[min(600px,48%)]"
            >
              <RubricPane
                key={current.id}
                item={current}
                draft={draft}
                summary={summary}
                layout={layout}
                onDraftChange={(update) => drafts.updateDraft(current, update)}
                onShowEvidence={showEvidence}
                footer={<DesktopActionBar {...actionProps} />}
                className="flex-1"
              />
            </TabsContent>
          </div>

          <MobileActionBar {...actionProps} total={summary.total} maxTotal={summary.maxTotal} />
        </Tabs>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-[calc(100dvh-3.5rem)] lg:min-h-0">
      <ReviewHeader
        totalCount={liveItems.length}
        visibleCount={queue.length}
        filter={filter?.id ?? null}
        filterOptions={filterOptions}
        filterTitle={filter?.title ?? null}
        onFilterChange={(id) => {
          setFilter(id ? { id, title: filterOptions.find((option) => option.id === id)?.title ?? null } : null);
          // Stay on the current paper if it is still in the filtered queue.
          if (current) setSelectedId(current.id);
        }}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          if (current) setSelectedId(current.id);
        }}
        queue={queue}
        currentId={current?.id ?? null}
        position={currentIndex + 1}
        onSelect={setSelectedId}
        onPrevious={() => goBy(-1)}
        onNext={() => goBy(1)}
        queueOpen={queueOpen}
        onQueueOpenChange={setQueueOpen}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      {body}

      {approveItem && approveSummary ? (
        <ApproveDialog
          open
          onOpenChange={(open) => {
            if (!open) setApproveTargetId(null);
          }}
          item={approveItem}
          summary={approveSummary}
          pending={publishing}
          onConfirm={() => void confirmApprove()}
        />
      ) : null}

      {sendBackItem ? (
        <SendBackDialog
          key={sendBackItem.id}
          open
          onOpenChange={(open) => {
            if (!open) setSendBackTargetId(null);
          }}
          studentName={sendBackItem.student.name}
          pending={sendingBack}
          onConfirm={confirmSendBack}
        />
      ) : null}

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
