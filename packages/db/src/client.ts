import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Driver-agnostic database handle. Production runs `neon-http`; the test suite
 * runs the identical queries against PGlite. Resolvers only ever see this type,
 * so nothing below the db package knows which driver it is talking to.
 */
export type Database = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

let cached: Database | null = null;

/**
 * Lazy singleton. `neon()` throws when DATABASE_URL is missing, and Next
 * evaluates module top-level code at build time, so the client must not be
 * constructed at import time. Deliberately a plain function rather than a
 * Proxy wrapper — Proxies break libraries that introspect the db object.
 */
export function getDb(): Database {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  cached = drizzle(neon(url), { schema }) as unknown as Database;
  return cached;
}

/** Test seam: lets a suite install a PGlite-backed handle. */
export function setDb(db: Database): void {
  cached = db;
}

export function resetDb(): void {
  cached = null;
}
