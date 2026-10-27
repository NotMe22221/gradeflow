// Text cleanup for everything a person (or a model) types that the app stores.
// Pure: safe for client components, server code, and unit tests.
//
// Postgres `text` cannot hold U+0000 (NUL): a write that contains one fails
// with "invalid byte sequence for encoding UTF8: 0x00" (Prisma P2039), and
// the whole save or publish is lost. SQLite stored it without complaint, so
// this only matters since the move to Postgres. A NUL can arrive in text
// copied from some PDFs; it is invisible in inputs, so the person can't see
// or remove it. It carries no meaning, so every write path drops it instead
// of rejecting the text.

/** Remove every U+0000 from `value`. */
export function stripNul(value: string): string {
  return value.includes("\u0000") ? value.replaceAll("\u0000", "") : value;
}

/** stripNul() for optional columns: null and undefined pass through unchanged. */
export function stripNulOptional<T extends string | null | undefined>(value: T): T {
  return (typeof value === "string" ? stripNul(value) : value) as T;
}
