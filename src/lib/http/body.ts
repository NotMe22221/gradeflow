// Reading request bodies with a hard byte limit. The limit holds even when
// the client sends no Content-Length (a chunked upload), so a large body can
// never be buffered into memory. Pure: no DB, no secrets.

/** The raw body, or null when it is larger than `limit` bytes. */
export async function readBodyWithLimit(request: Request, limit: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > limit) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = request.body?.getReader();
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** Multipart form data, or null when too large. Throws when it is not valid form data. */
export async function readFormDataWithLimit(request: Request, limit: number): Promise<FormData | null> {
  const body = await readBodyWithLimit(request, limit);
  if (!body) return null;
  return new Response(body as BodyInit, {
    headers: { "content-type": request.headers.get("content-type") ?? "" },
  }).formData();
}

export type JsonBody = { ok: true; value: unknown } | { ok: false; reason: "too_large" | "invalid" };

/** A JSON body, or a reason it could not be read. */
export async function readJsonWithLimit(request: Request, limit: number): Promise<JsonBody> {
  const body = await readBodyWithLimit(request, limit);
  if (!body) return { ok: false, reason: "too_large" };
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(body)) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
