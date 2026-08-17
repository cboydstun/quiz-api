import "server-only";
import { sql } from "drizzle-orm";
import { getDb, users } from "@quiz/db";
import { cached, withTimeout } from "./cache";

/**
 * How many accounts exist. The landing page advertised "10,000+ Operators",
 * which nothing measured — this is the real figure, bounded by the same
 * timeout as the rest of the server-side reads so an unreachable database
 * degrades the number to 0 instead of stalling the page.
 */
export function countUsers(): Promise<number> {
  return cached("userCount", 60_000, () =>
    withTimeout(
      async () => {
        const [row] = await getDb()
          .select({ total: sql<number>`count(*)::int` })
          .from(users);
        return row?.total ?? 0;
      },
      0,
      "countUsers",
    ),
  );
}
