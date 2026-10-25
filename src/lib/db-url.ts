// The SQLite location, shared by the app (src/lib/db.ts), the Prisma CLI
// (prisma.config.ts), and the seed script. Pure: no server-only import.

export const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
