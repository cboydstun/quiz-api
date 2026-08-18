import { sql } from "drizzle-orm";
import type { Resolvers } from "../generated/types";
import { standInName } from "../shared";

interface RankedRow extends Record<string, unknown> {
  id: string;
  username: string | null;
  score: number;
  position: number;
}

/**
 * How far back each board looks. null means "no window": rank the stored
 * score, which is the only figure that carries pre-cutover history. The values
 * are interpolated into an interval literal, so they are fixed strings here and
 * never anything a caller supplies.
 */
const WINDOW_START: Record<string, string | null> = {
  ALL_TIME: null,
  DAILY: "1 day",
  WEEKLY: "7 days",
  MONTHLY: "30 days",
};

export const leaderboardResolvers: Resolvers = {
  Query: {
    /**
     * Public on purpose: /leaderboard has no route guard on the client, so
     * requiring a token here would bounce every anonymous visitor to /login
     * via the Apollo error link.
     */
    getLeaderboard: async (_parent, { limit, period }, context) => {
      const size = Math.min(Math.max(limit ?? 10, 1), 100);
      const viewerId = context.viewer?._id ?? null;
      const since = WINDOW_START[period ?? "ALL_TIME"];

      /**
       * Two shapes, one round trip either way. Positions come from a window
       * function over the whole table, so `currentUserEntry.position` is the
       * viewer's true global rank rather than their index within the page.
       *
       * ALL_TIME ranks `users.score`, which includes everything imported from
       * the old backend. A windowed board sums the points actually earned
       * inside the window from answer history — the daily/monthly/yearly
       * columns exist but nothing has ever written to them, and a counter that
       * only means something if a scheduled job resets it on time is a worse
       * source of truth than the rows it would have been derived from.
       *
       * A windowed board is an inner join, so it lists only people who
       * answered something in the window rather than padding the table with
       * everyone on nil.
       */
      const result = await context.db.execute<RankedRow>(
        since === null
          ? sql`
        with ranked as (
          select
            id,
            username,
            score,
            row_number() over (order by score desc, username asc)::int as position
          from users
        )
        select id, username, score, position from ranked
        where position <= ${size}
           or id = ${viewerId}::uuid
        order by position asc
      `
          : sql`
        with earned as (
          select
            u.id,
            u.username,
            coalesce(sum(case when r.is_correct then q.points else 0 end), 0)::int as score
          from users u
          join user_responses r on r.user_id = u.id
          join questions q on q.id = r.question_id
          where r.created_at >= now() - ${sql.raw(`interval '${since}'`)}
          group by u.id, u.username
        ),
        ranked as (
          select
            id,
            username,
            score,
            row_number() over (order by score desc, username asc)::int as position
          from earned
        )
        select id, username, score, position from ranked
        where position <= ${size}
           or id = ${viewerId}::uuid
        order by position asc
      `,
      );

      const rows: RankedRow[] = Array.isArray(result)
        ? (result as RankedRow[])
        : ((result as { rows: RankedRow[] }).rows ?? []);

      const toEntry = (row: RankedRow) => ({
        position: row.position,
        score: row.score,
        user: {
          id: row.id,
          // Same stand-in as displayName(), which is the point: a user who has
          // not chosen a name is called one thing everywhere. Anyone who signed
          // in with Google lands here until they use updateUsername, so on a
          // public endpoint this is the common case, not the edge one.
          username: row.username ?? standInName(row.id),
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
