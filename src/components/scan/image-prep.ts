// Browser-side photo preparation for the scanner and the answer-key import.
// Every upload must fit one request under Vercel's 4.5 MB function body
// limit (see lib/scan/images.ts), so each photo is fitted to a byte target:
// SCAN_PHOTO_TARGET_BYTES on /scan, where up to 5 photos share a request.
//
// A photo is uploaded byte-for-byte when it is already a JPEG, PNG, or WebP
// within MAX_SCAN_EDGE_PX and the byte target, so the bundled samples arrive
// intact and the demo scanner can recognize them. Anything else is redrawn
// as a JPEG, stepping down quality and then size (SCAN_ENCODE_STEPS) until it
// fits. The server re-checks every image by its magic bytes regardless.

import {
  MAX_SCAN_EDGE_PX,
  SCAN_PHOTO_TARGET_BYTES,
  scanEncodePlan,
  sniffImageType,
  type ScanImageType,
} from "@/lib/scan/images";
import { SAMPLE_TEST_PHOTOS, type SampleTestPhoto } from "@/lib/scan/samples";

export type PreparedImage = {
  blob: Blob;
  type: ScanImageType;
  width: number;
  height: number;
  resized: boolean;
};

export class ImagePrepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImagePrepError";
  }
}

const CANT_SHRINK_MESSAGE = "That photo couldn't be made small enough to upload. Try another photo.";

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImagePrepError("That photo couldn't be processed. Try another one."))),
      "image/jpeg",
      quality
    );
  });
}

function drawCanvas(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImagePrepError("This browser can't process photos. Try another browser.");
  // JPEG has no transparency: paper-white behind transparent PNGs.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

/**
 * Draw a decoded image (or a live camera frame) as a JPEG of at most
 * `maxBytes`, no larger than MAX_SCAN_EDGE_PX. The source is drawn once:
 * smaller steps are drawn from that first canvas, so a camera frame never
 * changes between attempts.
 */
export async function encodeJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxBytes: number = SCAN_PHOTO_TARGET_BYTES
): Promise<{ blob: Blob; width: number; height: number }> {
  let canvas: HTMLCanvasElement | null = null;
  for (const attempt of scanEncodePlan(width, height)) {
    if (!canvas || canvas.width !== attempt.width || canvas.height !== attempt.height) {
      const previous: HTMLCanvasElement | null = canvas;
      canvas = drawCanvas(previous ?? source, attempt.width, attempt.height);
      // Free the larger canvas's memory now (mobile browsers cap the total).
      if (previous) {
        previous.width = 0;
        previous.height = 0;
      }
    }
    const blob = await canvasToBlob(canvas, attempt.quality);
    if (blob.size <= maxBytes) return { blob, width: canvas.width, height: canvas.height };
  }
  throw new ImagePrepError(CANT_SHRINK_MESSAGE);
}

/**
 * Check a chosen photo and shrink it only when it needs it. Formats the
 * browser can decode but the server does not accept (such as HEIC in Safari)
 * are re-encoded as JPEG. `maxBytes` is this photo's share of the request.
 */
export async function prepareScanImage(file: Blob, maxBytes: number = SCAN_PHOTO_TARGET_BYTES): Promise<PreparedImage> {
  if (file.size === 0) throw new ImagePrepError("That photo is empty.");
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const sniffed = sniffImageType(head);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (!sniffed) throw new ImagePrepError("Upload a JPEG, PNG, or WebP photo.");
    // A valid type the browser could not decode: send it as-is if it fits, and let the server decide.
    if (file.size > maxBytes) throw new ImagePrepError("This browser can't shrink that photo to upload it. Try a JPEG photo.");
    return { blob: file, type: sniffed, width: 0, height: 0, resized: false };
  }

  try {
    const { width, height } = bitmap;
    if (sniffed && Math.max(width, height) <= MAX_SCAN_EDGE_PX && file.size <= maxBytes) {
      return { blob: file, type: sniffed, width, height, resized: false };
    }
    const encoded = await encodeJpeg(bitmap, width, height, maxBytes);
    return { ...encoded, type: "image/jpeg", resized: true };
  } finally {
    bitmap.close();
  }
}

/** SHA-256 of a blob, or null where Web Crypto is unavailable (plain-HTTP LAN origins). */
export async function sha256Hex(blob: Blob): Promise<string | null> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

/** The bundled sample a photo is, matched by its exact bytes (the same check the demo scanner runs). */
export async function matchSamplePhoto(blob: Blob): Promise<SampleTestPhoto | null> {
  const hash = await sha256Hex(blob);
  if (!hash) return null;
  return SAMPLE_TEST_PHOTOS.find((sample) => sample.sha256 === hash) ?? null;
}

export function extensionFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
