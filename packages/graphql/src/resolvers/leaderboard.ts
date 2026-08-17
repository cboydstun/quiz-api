import { sql } from "drizzle-orm";
import type { Resolvers } from "../generated/types";

interface RankedRow extends Record<string, unknown> {
  id: string;
  username: string | null;
  email: string;
  score: number;
  position: number;
}

/**
 * `a***z@example.com`. Names of two characters or fewer keep only their first
 * character. Ported verbatim from the previous backend so leaderboard entries
 * look the same after the cutover.
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  const masked =
    local.length <= 2
      ? local.charAt(0) + "*".repeat(Math.max(local.length - 1, 0))
      : `${local.charAt(0)}***${local.charAt(local.length - 1)}`;

  return `${masked}@${domain}`;
}

export const leaderboardResolvers: Resolvers = {
  Query: {
    /**
     * Public on purpose: /leaderboard has no route guard on the client, so
     * requiring a token here would bounce every anonymous visitor to /login
     * via the Apollo error link.
     */
    getLeaderboard: async (_parent, { limit }, context) => {
      const size = Math.min(Math.max(limit ?? 10, 1), 100);
      const viewerId = context.viewer?._id ?? null;

      // One round trip. Positions come from a window function over the whole
      // table, so `currentUserEntry.position` is the viewer's true global rank
      // rather than their index within the returned page.
      const result = await context.db.execute<RankedRow>(sql`
        with ranked as (
          select
            id,
            username,
            email,
            score,
            row_number() over (order by score desc, username asc)::int as position
          from users
        )
        select id, username, email, score, position from ranked
        where position <= ${size}
           or id = ${viewerId}::uuid
        order by position asc
      `);

      const rows: RankedRow[] = Array.isArray(result)
        ? (result as RankedRow[])
        : ((result as { rows: RankedRow[] }).rows ?? []);

      const toEntry = (row: RankedRow) => ({
        position: row.position,
        score: row.score,
        user: {
          id: row.id,
          // Never fall back to the email's local part. `username` is null for
          // every Google sign-up, and this endpoint is public — publishing the
          // local part beside a masked `email` would undo the masking for the
          // one group that never chose a display name.
          username: row.username ?? `Operator ${row.position}`,
          email: maskEmail(row.email),
          score: row.score,
        },
      });

      return {
        leaderboard: rows.filter((row) => row.position <= size).map(toEntry),
        currentUserEntry:
          rows.filter((row) => row.id === viewerId).map(toEntry)[0] ?? null,
      };
    },
  },
};
