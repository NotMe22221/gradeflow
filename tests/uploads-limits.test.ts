// Upload size limits: every photo request must fit under Vercel's 4.5 MB
// function body limit, and the server must say what the real limit is.
// Synthetic data only.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { readFormDataWithLimit } from "@/lib/http/body";
import { MAX_PAPER_CHARS } from "@/lib/paper";
import { MAX_SCAN_REQUEST_BYTES, readScanForm, readScanImage, scanFormPhotosProblem } from "@/lib/scan/form";
import {
  fitWithin,
  formatUploadMb,
  MAX_SCAN_EDGE_PX,
  MAX_SCAN_IMAGE_BYTES,
  MAX_SCAN_PAGES,
  MAX_SCAN_PHOTOS,
  MAX_SCAN_PHOTOS_BYTES,
  MAX_UPLOAD_REQUEST_BYTES,
  PHOTO_TOO_LARGE_MESSAGE,
  SCAN_ENCODE_STEPS,
  SCAN_PHOTO_TARGET_BYTES,
  SCAN_PHOTOS_TOO_LARGE_MESSAGE,
  scanEncodePlan,
  scanImageProblem,
  scanPhotosProblem,
} from "@/lib/scan/images";
import { SAMPLE_ANSWER_KEY_PHOTOS, SAMPLE_TEST_PHOTOS } from "@/lib/scan/samples";

const ROOT = join(import.meta.dirname, "..");
const MiB = 1024 * 1024;
/** Vercel's documented limit, read both ways (4.5 MB or 4.5 MiB): stay under the smaller. */
const VERCEL_BODY_LIMIT = Math.min(4.5 * 1000 * 1000, 4.5 * MiB);
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];

function jpegBytes(size: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(size);
  out.set(JPEG_HEAD);
  return out;
}

function jpegFile(name: string, size: number): File {
  return new File([jpegBytes(size)], name, { type: "image/jpeg" });
}

/** Width and height from a baseline or progressive JPEG's SOF marker. */
function jpegSize(bytes: Uint8Array): { width: number; height: number } {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("not a JPEG marker");
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8] };
    }
    offset += 2 + length;
  }
  throw new Error("no SOF marker");
}

function scanForm(pageSizes: number[], answerKeySize?: number, transcription?: string): FormData {
  const form = new FormData();
  form.set("assignmentId", "cmassign123");
  form.set("studentId", "cmstudent123");
  pageSizes.forEach((size, index) => form.append("pages", jpegFile(`page-${index + 1}.jpg`, size)));
  if (answerKeySize !== undefined) form.set("answerKey", jpegFile("answer-key.jpg", answerKeySize));
  if (transcription !== undefined) form.set("transcription", transcription);
  return form;
}

async function encodedSize(form: FormData): Promise<number> {
  return (await new Request("http://localhost/api/grade", { method: "POST", body: form }).arrayBuffer()).byteLength;
}

describe("upload limits fit Vercel's 4.5 MB function body limit", () => {
  it("keeps every request, and every stored photo, under the platform limit", () => {
    assert.ok(MAX_UPLOAD_REQUEST_BYTES < VERCEL_BODY_LIMIT);
    assert.ok(VERCEL_BODY_LIMIT - MAX_UPLOAD_REQUEST_BYTES >= 256 * 1024, "headroom for proxies and headers");
    assert.equal(MAX_SCAN_REQUEST_BYTES, MAX_UPLOAD_REQUEST_BYTES);
    assert.ok(MAX_SCAN_PHOTOS_BYTES < MAX_UPLOAD_REQUEST_BYTES);
    // Stored photos are served whole by /api/submissions/[id]/images/[imageId]: the response limit matches.
    assert.ok(MAX_SCAN_IMAGE_BYTES <= MAX_SCAN_PHOTOS_BYTES);
    assert.ok(MAX_SCAN_IMAGE_BYTES < VERCEL_BODY_LIMIT);
  });

  it("gives each photo a share that lets a full scan fit", () => {
    assert.equal(MAX_SCAN_PHOTOS, MAX_SCAN_PAGES + 1);
    assert.ok(SCAN_PHOTO_TARGET_BYTES * MAX_SCAN_PHOTOS <= MAX_SCAN_PHOTOS_BYTES);
    // Enough for a sharp 2048 px JPEG of a page (about 0.4-0.8 MB at quality 0.85).
    assert.ok(SCAN_PHOTO_TARGET_BYTES >= 700 * 1024);
  });

  it("fits the largest possible scan form in one request", async () => {
    // 4 pages and an answer key at the full per-photo share, plus the longest
    // demo transcription in 3-byte characters with line breaks (sent as CRLF).
    const line = "€".repeat(39) + "\n";
    const transcription = line.repeat(Math.floor(MAX_PAPER_CHARS / line.length));
    assert.ok(transcription.length <= MAX_PAPER_CHARS);
    const shares = Array.from({ length: MAX_SCAN_PAGES }, () => SCAN_PHOTO_TARGET_BYTES);
    const form = scanForm(shares, SCAN_PHOTO_TARGET_BYTES, transcription);
    const size = await encodedSize(form);
    assert.ok(size <= MAX_UPLOAD_REQUEST_BYTES, `${size} bytes`);

    // Even at the server's whole photo budget, the envelope still fits.
    const budget = scanForm([MAX_SCAN_PHOTOS_BYTES], undefined, transcription);
    assert.ok((await encodedSize(budget)) <= MAX_UPLOAD_REQUEST_BYTES);
  });

  it("serves the bundled samples byte-for-byte", () => {
    for (const sample of [...SAMPLE_TEST_PHOTOS, ...SAMPLE_ANSWER_KEY_PHOTOS]) {
      const bytes = new Uint8Array(readFileSync(join(ROOT, "public", sample.src)));
      // Under both of the browser's thresholds, so prepareScanImage() never re-encodes them.
      assert.ok(bytes.length <= SCAN_PHOTO_TARGET_BYTES, `${sample.src} is ${bytes.length} bytes`);
      const { width, height } = jpegSize(bytes);
      assert.ok(Math.max(width, height) <= MAX_SCAN_EDGE_PX, `${sample.src} is ${width}x${height}`);
      assert.equal(scanImageProblem(bytes), null);
    }
  });
});

describe("formatUploadMb", () => {
  it("prints limits exactly and rounds totals up", () => {
    assert.equal(formatUploadMb(MAX_SCAN_PHOTOS_BYTES), "3.5 MB");
    assert.equal(formatUploadMb(MAX_UPLOAD_REQUEST_BYTES), "4 MB");
    assert.equal(formatUploadMb(MAX_SCAN_PHOTOS_BYTES + 1), "3.6 MB");
    assert.equal(formatUploadMb(4.53 * MiB), "4.6 MB");
    assert.equal(formatUploadMb(0), "0 MB");
    assert.equal(formatUploadMb(150 * 1024), "0.2 MB");
  });
});

describe("photo size messages", () => {
  it("names the real per-photo limit, not 5 MB", () => {
    assert.equal(PHOTO_TOO_LARGE_MESSAGE, "That photo is larger than 3.5 MB. Try a smaller photo.");
    assert.equal(scanImageProblem(jpegBytes(MAX_SCAN_IMAGE_BYTES + 1)), PHOTO_TOO_LARGE_MESSAGE);
    assert.equal(scanImageProblem(jpegBytes(MAX_SCAN_IMAGE_BYTES)), null);
  });

  it("explains a total that is too large with both numbers", () => {
    assert.equal(scanPhotosProblem([]), null);
    assert.equal(scanPhotosProblem([MAX_SCAN_PHOTOS_BYTES]), null);
    assert.equal(scanPhotosProblem([1.2 * MiB, 1.2 * MiB, 1.1 * MiB]), null);
    const message = scanPhotosProblem([1.2 * MiB, 1.2 * MiB, 1.2 * MiB]);
    assert.equal(
      message,
      "These photos add up to 3.6 MB, and one scan can send up to 3.5 MB. Remove a page or retake the photos, then try again."
    );
    assert.doesNotMatch(SCAN_PHOTOS_TOO_LARGE_MESSAGE, /each|5 MB or less/i);
    assert.match(SCAN_PHOTOS_TOO_LARGE_MESSAGE, /up to 3\.5 MB of photos/);
  });

  it("checks the scan form's photo total, answer key included", () => {
    const fits = readScanForm(scanForm([MiB, MiB, MiB], 0.5 * MiB));
    assert.ok(fits.ok);
    if (fits.ok) assert.equal(scanFormPhotosProblem(fits.value), null);

    const over = readScanForm(scanForm([MiB, MiB, MiB], 0.6 * MiB));
    assert.ok(over.ok);
    if (over.ok) assert.match(scanFormPhotosProblem(over.value) ?? "", /add up to 3\.6 MB, and one scan can send up to 3\.5 MB/);
  });

  it("names the photo when one is over the limit", async () => {
    const result = await readScanImage(jpegFile("big.jpg", MAX_SCAN_IMAGE_BYTES + 1), "Page 2");
    assert.deepEqual(result, { ok: false, error: `Page 2: ${PHOTO_TOO_LARGE_MESSAGE}` });
  });

  it("refuses a body over the request limit before buffering it", async () => {
    const big = new Request("http://localhost/api/grade", {
      method: "POST",
      body: scanForm([MiB, MiB, MiB, MiB], 0.5 * MiB),
    });
    assert.equal(await readFormDataWithLimit(big, MAX_SCAN_REQUEST_BYTES), null);
  });
});

describe("browser re-encode plan", () => {
  it("never upscales and keeps the aspect ratio", () => {
    assert.deepEqual(fitWithin(1300, 1700, MAX_SCAN_EDGE_PX), { width: 1300, height: 1700 });
    assert.deepEqual(fitWithin(4032, 3024, 2048), { width: 2048, height: 1536 });
    assert.deepEqual(fitWithin(3024, 4032, 1600), { width: 1200, height: 1600 });
    assert.deepEqual(fitWithin(0, 0, 2048), { width: 1, height: 1 });
  });

  it("steps quality down before size, and stays legible for GPT-4o", () => {
    const plan = scanEncodePlan(3024, 4032);
    assert.deepEqual(plan[0], { width: 1536, height: 2048, quality: 0.85 });
    assert.equal(plan.length, SCAN_ENCODE_STEPS.length);
    for (let i = 1; i < plan.length; i++) {
      assert.ok(plan[i].width <= plan[i - 1].width && plan[i].height <= plan[i - 1].height, "never grows");
      assert.ok(plan[i].quality < plan[i - 1].quality || plan[i].width < plan[i - 1].width, "always smaller");
    }
    // GPT-4o high detail reads 768 px on the short side: the last step keeps more than that.
    const last = plan[plan.length - 1];
    assert.ok(Math.min(last.width, last.height) >= 768);
    assert.ok(last.quality >= 0.6);
  });

  it("skips repeated attempts for a photo that is already small", () => {
    const plan = scanEncodePlan(1000, 800);
    assert.deepEqual(
      plan.map((attempt) => attempt.quality),
      [0.85, 0.72, 0.6]
    );
    assert.ok(plan.every((attempt) => attempt.width === 1000 && attempt.height === 800));
  });
});
