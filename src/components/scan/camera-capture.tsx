"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraOff, LoaderCircle, X } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { encodeJpeg } from "@/components/scan/image-prep";
import { cn } from "@/lib/utils";

type CameraState =
  | { status: "starting" }
  | { status: "live" }
  | { status: "error"; message: string };

function describeCameraError(error: unknown): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow camera access for this site in your browser settings, or upload photos instead.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device. Upload photos instead.";
    case "NotReadableError":
    case "AbortError":
      return "The camera is busy in another app. Close it there and try again, or upload photos instead.";
    default:
      return "The camera couldn't start. Upload photos instead.";
  }
}

/**
 * Live camera preview with a shutter button. Each capture is drawn to a
 * canvas (no larger than MAX_SCAN_EDGE_PX) and handed back as a JPEG. The
 * camera stops when the panel closes or the page unmounts.
 */
export function CameraCapture({
  onCapture,
  onClose,
  pageNumber,
  canCapture,
  disabled = false,
}: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  /** The page number the next capture becomes. */
  pageNumber: number;
  /** false when the scan already holds the maximum number of pages. */
  canCapture: boolean;
  disabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>({ status: "starting" });
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (typeof window === "undefined") return;
      if (!window.isSecureContext) {
        setState({
          status: "error",
          message:
            "The camera only works over HTTPS or on localhost. Open GradeSmart AI from a secure address, or upload photos instead.",
        });
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ status: "error", message: "This browser doesn't support camera capture. Upload photos instead." });
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        if (!cancelled) setState({ status: "live" });
      } catch (error) {
        if (!cancelled) setState({ status: "error", message: describeCameraError(error) });
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [stopStream]);

  async function capture() {
    const video = videoRef.current;
    if (!video || !canCapture || capturing || disabled) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    setCapturing(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);
    try {
      const { blob } = await encodeJpeg(video, width, height);
      onCapture(blob);
    } catch {
      setState({ status: "error", message: "That capture couldn't be saved. Try again, or upload photos instead." });
    } finally {
      setCapturing(false);
    }
  }

  function close() {
    stopStream();
    onClose();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-foreground/95">
      <div className="relative aspect-[3/4] w-full sm:aspect-[4/3]">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label="Camera preview"
          className={cn("absolute inset-0 size-full object-cover", state.status !== "live" && "invisible")}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 bg-white transition-opacity duration-150",
            flash ? "opacity-70" : "opacity-0"
          )}
        />

        {state.status === "starting" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80">
            <LoaderCircle className="size-5 animate-spin" aria-hidden />
            Starting camera…
          </div>
        ) : null}

        {state.status === "error" ? (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white">
              <CameraOff className="size-5" aria-hidden />
            </div>
            <p className="max-w-sm text-sm text-pretty text-white/85">{state.message}</p>
          </div>
        ) : null}

        {state.status === "live" ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3">
              <span className="tabular rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
                {canCapture ? `Page ${pageNumber}` : "All pages added"}
              </span>
            </div>
            {/* Framing guide: fill it with the page. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-6 rounded-lg border border-dashed border-white/40 sm:inset-x-[22%] sm:inset-y-6"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/35 py-4">
              <button
                type="button"
                onClick={capture}
                disabled={!canCapture || capturing || disabled}
                aria-label={canCapture ? `Capture page ${pageNumber}` : "All pages added"}
                className="group flex size-16 items-center justify-center rounded-full bg-white/25 ring-4 ring-white/70 transition outline-none hover:bg-white/35 focus-visible:ring-[6px] focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="size-12 rounded-full bg-white shadow-raised transition group-active:scale-90" />
              </button>
            </div>
          </>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label="Close camera"
          className="absolute top-2 right-2 bg-black/55 text-white hover:bg-black/70 hover:text-white"
        >
          <X />
        </Button>
      </div>
      <p className="border-t border-white/10 px-4 py-2.5 text-xs text-white/70" aria-live="polite">
        {state.status === "live"
          ? canCapture
            ? "Fill the frame with one page, flat and in good light, then tap the shutter."
            : "This scan has every page it can hold. Remove a page to capture another."
          : state.status === "error"
            ? "You can still upload photos or use a sample photo."
            : "Allow camera access when your browser asks."}
      </p>
    </div>
  );
}
