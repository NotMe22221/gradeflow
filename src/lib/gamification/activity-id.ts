// Primary keys for once-only XP awards. Server code only (node:crypto), but
// free of framework imports so unit tests can load it.

import { createHash } from "node:crypto";

/**
 * The StudyActivity id for an award with a once key (xpOnceKey() in
 * rules.ts): a hash of the key, so the same award always gets the same id
 * and a second insert of it hits the primary key instead of adding XP twice.
 * "xp_" + 32 hex characters: fixed length, never a cuid (cuids have no "_"),
 * and it passes the app's id rules (src/lib/validation/id.ts).
 */
export function activityIdFor(onceKey: string): string {
  return `xp_${createHash("sha256").update(onceKey).digest("hex").slice(0, 32)}`;
}
