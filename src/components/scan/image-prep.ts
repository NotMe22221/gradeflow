// Browser-side photo preparation for the scanner. Photos are uploaded
// byte-for-byte unless they are larger than MAX_SCAN_EDGE_PX on their long
// edge or over MAX_SCAN_IMAGE_BYTES, so the bundled samples arrive intact and
// the demo scanner can recognize them. The server re-checks every image by
// its magic bytes regardless.

import { MAX_SCAN_EDGE_PX, MAX_SCAN_IMAGE_BYTES, sniffImageType, type ScanImageType } from "@/lib/scan/images";
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

const JPEG_QUALITY = 0.85;
const FALLBACK_QUALITY = 0.7;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImagePrepError("That photo couldn't be processed. Try another one."))),
      "image/jpeg",
      quality
    );
  });
}

/** Draw a decoded image to a canvas no larger than MAX_SCAN_EDGE_PX and encode it as JPEG. */
export async function encodeJpeg(
  source: CanvasImageSource,
  width: number,
  height: number
): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, MAX_SCAN_EDGE_PX / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new ImagePrepError("This browser can't process photos. Try another browser.");
  // JPEG has no transparency: paper-white behind transparent PNGs.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  let blob = await canvasToBlob(canvas, JPEG_QUALITY);
  if (blob.size > MAX_SCAN_IMAGE_BYTES) blob = await canvasToBlob(canvas, FALLBACK_QUALITY);
  if (blob.size > MAX_SCAN_IMAGE_BYTES) throw new ImagePrepError("That photo is too large, even after resizing.");
  return { blob, width: targetWidth, height: targetHeight };
}

/**
 * Check a chosen photo and downscale it only when it needs it. Formats the
 * browser can decode but the server does not accept (such as HEIC in Safari)
 * are re-encoded as JPEG.
 */
export async function prepareScanImage(file: Blob): Promise<PreparedImage> {
  if (file.size === 0) throw new ImagePrepError("That photo is empty.");
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const sniffed = sniffImageType(head);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (!sniffed) throw new ImagePrepError("Upload a JPEG, PNG, or WebP photo.");
    // A valid type the browser could not decode: let the server decide.
    if (file.size > MAX_SCAN_IMAGE_BYTES) throw new ImagePrepError("That photo is larger than 5 MB. Try a smaller photo.");
    return { blob: file, type: sniffed, width: 0, height: 0, resized: false };
  }

  try {
    const { width, height } = bitmap;
    if (sniffed && Math.max(width, height) <= MAX_SCAN_EDGE_PX && file.size <= MAX_SCAN_IMAGE_BYTES) {
      return { blob: file, type: sniffed, width, height, resized: false };
    }
    const encoded = await encodeJpeg(bitmap, width, height);
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
