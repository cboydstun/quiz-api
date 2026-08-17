import { sql } from "drizzle-orm";
import type { Resolvers } from "../generated/types";
import { requireSelfOrAdmin } from "../auth/guards";
import type { UserModel } from "../models";

interface DomainRow extends Record<string, unknown> {
  domain: string;
  answered: number;
  correct: number;
}

/**
 * Per-domain accuracy, derived from the answer history rather than stored.
 *
 * Two things worth knowing about the numbers this returns:
 *
 * - `answered` counts submissions, not distinct questions. `user_responses`
 *   has no unique constraint on (user_id, question_id) and `submitAnswer`
 *   always inserts, so answering the same question twice counts twice. That
 *   matches `users.questions_answered`, which counts attempts the same way.
 * - Questions with no domain are excluded entirely. The bank predates the
 *   column and nothing backfilled it, so a user whose history is all
 *   unclassified questions correctly gets an empty list rather than a
 *   fabricated bucket.
 */
export const statsResolvers: Resolvers = {
  User: {
    domainAccuracy: async (parent: UserModel, _args, context) => {
      // A user's answer history is theirs; an admin may read it too. This is a
      // permission failure, not an authentication one, so it must surface as
      // "Forbidden" — saying "Unauthorized" would log the caller out.
      requireSelfOrAdmin(context, parent.id);

      const result = await context.db.execute<DomainRow>(sql`
        select
          q.domain as domain,
          count(*)::int as answered,
          count(*) filter (where r.is_correct)::int as correct
        from user_responses r
        join questions q on q.id = r.question_id
        where r.user_id = ${parent.id}::uuid
          and q.domain is not null
        group by q.domain
        order by q.domain asc
      `);

      const rows: DomainRow[] = Array.isArray(result)
        ? (result as DomainRow[])
        : ((result as { rows: DomainRow[] }).rows ?? []);

      return rows.map((row) => ({
        domain: row.domain,
        answered: row.answered,
        correct: row.correct,
        accuracy:
          row.answered === 0
            ? 0
            : Math.round((row.correct / row.answered) * 1000) / 10,
      }));
    },
  },
};
