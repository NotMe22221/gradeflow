// Image upload rules for the camera grader and answer-key scanner.
// Pure: safe for client components, server code, and unit tests.
//
// Size limits come from the hosting platform: Vercel Functions reject a
// request body over 4.5 MB (413 FUNCTION_PAYLOAD_TOO_LARGE) before the route
// runs, and a response body over the same size. So every photo upload is one
// request under MAX_UPLOAD_REQUEST_BYTES, the browser shrinks photos to fit
// before it sends them, and the server enforces the same totals with its own
// message (it never relies on the platform to reject a large body).

export const SCAN_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ScanImageType = (typeof SCAN_IMAGE_TYPES)[number];

const MiB = 1024 * 1024;

/** Every photo upload request stays under this: Vercel's 4.5 MB body limit, with headroom. */
export const MAX_UPLOAD_REQUEST_BYTES = 4 * MiB;
/** Pages of one student's test per scan. */
export const MAX_SCAN_PAGES = 4;
/** Photos one scan request can carry: the test pages plus the answer key photo. */
export const MAX_SCAN_PHOTOS = MAX_SCAN_PAGES + 1;
/**
 * All the photos in one request together. The rest of the request is the
 * multipart envelope and the text fields (a demo transcription is up to
 * 40,000 characters, about 120 KB).
 */
export const MAX_SCAN_PHOTOS_BYTES = 3.5 * MiB;
/** Per-image limit on the server. It also keeps every stored photo under the response limit. */
export const MAX_SCAN_IMAGE_BYTES = MAX_SCAN_PHOTOS_BYTES;
/**
 * The browser fits each scan photo into an equal share of the request, so a
 * full scan (4 pages and an answer key) always fits without a second pass.
 * The bundled samples (under 200 KB) are well inside it.
 */
export const SCAN_PHOTO_TARGET_BYTES = Math.floor(MAX_SCAN_PHOTOS_BYTES / MAX_SCAN_PHOTOS);
/**
 * Longest edge the browser sends. GPT-4o's high-detail mode reads at most
 * 2048 px on the long edge (and 768 px on the short one), so a larger photo
 * adds upload time, not legibility. Photos within this edge and the byte
 * target upload byte-for-byte, so the bundled samples arrive intact.
 */
export const MAX_SCAN_EDGE_PX = 2048;

/**
 * Long edges and JPEG qualities the browser tries, best first, until a photo
 * fits its byte target. The smallest step still leaves the short side above
 * the 768 px GPT-4o reads, so handwriting stays legible.
 */
export const SCAN_ENCODE_STEPS: readonly { maxEdge: number; quality: number }[] = [
  { maxEdge: MAX_SCAN_EDGE_PX, quality: 0.85 },
  { maxEdge: MAX_SCAN_EDGE_PX, quality: 0.72 },
  { maxEdge: 1600, quality: 0.72 },
  { maxEdge: 1600, quality: 0.6 },
  { maxEdge: 1280, quality: 0.6 },
];

/** Scale width x height down (never up) so the long edge is at most maxEdge. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export type EncodeAttempt = { width: number; height: number; quality: number };

/** The encodes to try for a width x height photo, in order, without repeating an identical one. */
export function scanEncodePlan(width: number, height: number): EncodeAttempt[] {
  const plan: EncodeAttempt[] = [];
  for (const step of SCAN_ENCODE_STEPS) {
    const size = fitWithin(width, height, step.maxEdge);
    const attempt = { ...size, quality: step.quality };
    const repeat = plan.some(
      (earlier) =>
        earlier.width === attempt.width && earlier.height === attempt.height && earlier.quality === attempt.quality
    );
    if (!repeat) plan.push(attempt);
  }
  return plan;
}

/**
 * "3.5 MB". Rounded up to a tenth, so a total just over a limit never reads
 * as equal to it. The limits are exact tenths, so they read as themselves.
 */
export function formatUploadMb(bytes: number): string {
  // Exact for whole bytes: MiB is a power of two.
  const tenths = Math.ceil((Math.max(0, bytes) * 10) / MiB);
  return `${(tenths / 10).toFixed(tenths % 10 === 0 ? 0 : 1)} MB`;
}

export const PHOTO_TOO_LARGE_MESSAGE = `That photo is larger than ${formatUploadMb(MAX_SCAN_IMAGE_BYTES)}. Try a smaller photo.`;

/** For a request over the body limit, where the total is unknown. */
export const SCAN_PHOTOS_TOO_LARGE_MESSAGE = `These photos are too large to send together. One scan can send up to ${formatUploadMb(
  MAX_SCAN_PHOTOS_BYTES
)} of photos. Remove a page or retake the photos, then try again.`;

/**
 * The problem with sending these photos in one scan request, or null when
 * they fit. The browser checks before it uploads, and /api/grade again.
 */
export function scanPhotosProblem(sizes: readonly number[]): string | null {
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (total <= MAX_SCAN_PHOTOS_BYTES) return null;
  return `These photos add up to ${formatUploadMb(total)}, and one scan can send up to ${formatUploadMb(
    MAX_SCAN_PHOTOS_BYTES
  )}. Remove a page or retake the photos, then try again.`;
}

/** Detect the real image type from magic bytes. Never trust the declared type. */
export function sniffImageType(bytes: Uint8Array): ScanImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === "RIFF" &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/** Problem with an uploaded image, or null when it is acceptable. */
export function scanImageProblem(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return "That photo is empty.";
  if (bytes.length > MAX_SCAN_IMAGE_BYTES) return PHOTO_TOO_LARGE_MESSAGE;
  if (!sniffImageType(bytes)) return "Upload a JPEG, PNG, or WebP photo.";
  return null;
}
