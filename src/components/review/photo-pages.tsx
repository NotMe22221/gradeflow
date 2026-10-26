"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, ZoomIn, ZoomOut } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { pageImageAlt, submissionImageUrl } from "@/lib/review/media";
import type { ReviewImage } from "@/lib/review/types";
import { cn } from "@/lib/utils";

/** Below Tailwind's `sm` breakpoint the dialog is too narrow to read handwriting at fit width. */
function isPhoneViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 639.98px)").matches;
}

/**
 * The original photos of a scanned test, in page order, so the teacher can
 * check the transcription against the handwriting. Click a page to zoom.
 * Photos are untrusted data and are only ever shown as images.
 *
 * The zoom dialog has two sizes: fit to width, and magnified to twice the
 * width, panned by scrolling or dragging inside the frame. On a phone it
 * opens magnified, since the fit-width page is smaller than the inline photo.
 */
export function PhotoPages({
  submissionId,
  studentName,
  images,
}: {
  submissionId: string;
  studentName: string;
  images: ReviewImage[];
}) {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [magnified, setMagnified] = useState(false);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  // The zoom dialog has no DialogTrigger, so Radix cannot return focus on
  // close. Remember the thumbnail that opened it and the page last viewed.
  const thumbnailRefs = useRef(new Map<number, HTMLButtonElement>());
  const openerRef = useRef<HTMLElement | null>(null);
  const lastViewedRef = useRef<number | null>(null);
  const total = images.length;
  const zoomed = zoomIndex === null ? null : images[zoomIndex] ?? null;

  useEffect(() => {
    if (zoomIndex !== null) lastViewedRef.current = zoomIndex;
  }, [zoomIndex]);

  const markFailed = (id: string) => setFailed((current) => new Set(current).add(id));
  const openZoom = (index: number, opener: HTMLElement) => {
    openerRef.current = opener;
    setMagnified(isPhoneViewport());
    setZoomIndex(index);
  };
  /** Back to the thumbnail of the page last viewed, else the one that opened the dialog. */
  const restoreFocus = () => {
    const last = lastViewedRef.current;
    const target = (last !== null ? thumbnailRefs.current.get(last) : undefined) ?? openerRef.current;
    openerRef.current = null;
    if (target?.isConnected) target.focus();
  };
  const step = (offset: number) =>
    setZoomIndex((index) => (index === null ? index : Math.min(total - 1, Math.max(0, index + offset))));

  return (
    <>
      <ol className="space-y-6" aria-label={`Photos of ${studentName}'s test`}>
        {images.map((image, index) => {
          const pageNumber = index + 1;
          const src = submissionImageUrl(submissionId, image.id);
          const broken = failed.has(image.id);
          return (
            <li key={image.id}>
              <figure className="space-y-2">
                {broken ? (
                  <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/50 px-6 text-center text-sm text-muted-foreground">
                    <ImageOff className="size-5" aria-hidden />
                    Page {pageNumber} could not be loaded. Reload to try again.
                  </div>
                ) : (
                  <button
                    ref={(element) => {
                      if (element) thumbnailRefs.current.set(index, element);
                      else thumbnailRefs.current.delete(index);
                    }}
                    type="button"
                    onClick={(event) => openZoom(index, event.currentTarget)}
                    className="group relative block w-full overflow-hidden rounded-xl border border-border bg-card transition-shadow outline-none hover:shadow-hover focus-visible:ring-[3px] focus-visible:ring-ring"
                    aria-label={`Zoom in on page ${pageNumber}`}
                  >
                    {/* Plain <img>: the image route checks access and sets private caching. */}
                    <img
                      src={src}
                      alt={pageImageAlt(studentName, pageNumber)}
                      loading="lazy"
                      decoding="async"
                      onError={() => markFailed(image.id)}
                      className="block h-auto w-full bg-muted/40"
                    />
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-raised transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                      <ZoomIn className="size-3.5" aria-hidden />
                      Zoom
                    </span>
                  </button>
                )}
                <figcaption className="tabular text-center text-xs text-muted-foreground">
                  Page {pageNumber} of {total}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ol>

      <Dialog open={zoomed !== null} onOpenChange={(open) => (open ? undefined : setZoomIndex(null))}>
        {zoomed && zoomIndex !== null ? (
          <DialogContent
            className="gap-3 p-4 sm:max-w-4xl sm:p-6"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              restoreFocus();
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") step(-1);
              if (event.key === "ArrowRight") step(1);
            }}
          >
            <DialogHeader className="pr-10">
              <DialogTitle className="tabular">
                Page {zoomIndex + 1} of {total}
              </DialogTitle>
              <DialogDescription>
                {studentName}&apos;s test. Compare the handwriting with the transcription before you return the grade.
              </DialogDescription>
            </DialogHeader>
            {/*
              A magnified page pans inside this frame: drag or scroll, or focus
              it and use the arrow keys (which then pan instead of turning pages).
              The phone height leaves room for a two-line toolbar. Keyed by page
              so each new page starts at its top-left corner.
            */}
            <div
              key={zoomed.id}
              role={magnified ? "region" : undefined}
              aria-label={magnified ? "Magnified page. Scroll to move around it." : undefined}
              tabIndex={magnified ? 0 : undefined}
              onKeyDown={(event) => {
                if (magnified && (event.key === "ArrowLeft" || event.key === "ArrowRight")) event.stopPropagation();
              }}
              className="max-h-[calc(100dvh-16rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-muted/40 outline-none focus-visible:ring-[3px] focus-visible:ring-ring sm:max-h-[calc(100dvh-13rem)]"
            >
              <img
                src={submissionImageUrl(submissionId, zoomed.id)}
                alt={pageImageAlt(studentName, zoomIndex + 1)}
                decoding="async"
                className={cn("block h-auto", magnified ? "w-[200%] max-w-none" : "mx-auto w-full")}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {total > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => step(-1)}
                    disabled={zoomIndex === 0}
                    aria-label="Previous page"
                  >
                    <ChevronLeft aria-hidden />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => step(1)}
                    disabled={zoomIndex === total - 1}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight aria-hidden />
                  </Button>
                </div>
              ) : null}
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setMagnified((value) => !value)}>
                  {magnified ? <ZoomOut aria-hidden /> : <ZoomIn aria-hidden />}
                  {magnified ? "Fit to width" : "Zoom in"}
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={submissionImageUrl(submissionId, zoomed.id)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden />
                    Open full size
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
