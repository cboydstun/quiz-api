import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import type { Database } from "./client";
import * as schema from "./schema";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../drizzle", import.meta.url));

/**
 * A throwaway in-memory Postgres with the real migrations applied. Same SQL as
 * production, so constraints and defaults are actually exercised by tests.
 */
export async function createTestDb(): Promise<{
  db: Database;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;

  await migrate(db as never, { migrationsFolder: MIGRATIONS_FOLDER });

  return {
    db,
    close: () => client.close(),
  };
}
