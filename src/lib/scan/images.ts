// Image upload rules for the camera grader and answer-key scanner.
// Pure: safe for client components, server code, and unit tests.

export const SCAN_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ScanImageType = (typeof SCAN_IMAGE_TYPES)[number];

/** Per-image upload limit. The client downscales larger photos first. */
export const MAX_SCAN_IMAGE_BYTES = 5 * 1024 * 1024;
/** Pages of one student's test per scan. */
export const MAX_SCAN_PAGES = 4;
/**
 * The client re-encodes a photo only when it is larger than this on its long
 * edge or over the byte limit, so the bundled samples upload byte-for-byte.
 */
export const MAX_SCAN_EDGE_PX = 2048;

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
  if (bytes.length > MAX_SCAN_IMAGE_BYTES) return "That photo is larger than 5 MB. Try a smaller photo.";
  if (!sniffImageType(bytes)) return "Upload a JPEG, PNG, or WebP photo.";
  return null;
}
