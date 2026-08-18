import { and, asc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { questions, trailRuns } from "@quiz/db";
import type { Resolvers } from "../generated/types";
import { requireAuth, requireWithinRateLimit } from "../auth/guards";
import { PUBLIC_RULE, SUBMIT_RULE } from "../rate-limit";
import { badInput } from "../errors";
import {
  buildRoute,
  trailDateFor,
  QUESTIONS_PER_LEG,
  TRAIL_LEGS,
} from "../trail/route";

const FULL_RESOURCE = 100;
const MS_PER_DAY = 86_400_000;

/**
 * A run that crossed midnight UTC still belongs to the day it started, so the
 * previous day is accepted. Anything older is a client with a stale tab or a
 * caller making things up; either way it must not burn a slot.
 */
function assertRecordableDate(trailDate: string, now: Date): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trailDate)) {
    throw badInput("trailDate must be a YYYY-MM-DD date");
  }

  const today = trailDateFor(now);
  const yesterday = trailDateFor(new Date(now.getTime() - MS_PER_DAY));

  if (trailDate !== today && trailDate !== yesterday) {
    throw badInput("That trail is no longer open");
  }
}

function assertPlausibleRun(input: {
  legsReached: number;
  batteryLeft: number;
  airframeLeft: number;
  correct: number;
  total: number;
}): void {
  // Not anti-cheat — the figures are the client's word, and what actually
  // counts (points, score, domain accuracy) is written by submitAnswer on the
  // server. This only keeps a malformed payload from being stored as fact.
  const inRange = (value: number, min: number, max: number) =>
    Number.isInteger(value) && value >= min && value <= max;

  if (!inRange(input.legsReached, 1, TRAIL_LEGS)) {
    throw badInput(`legsReached must be between 1 and ${TRAIL_LEGS}`);
  }
  if (
    !inRange(input.batteryLeft, 0, FULL_RESOURCE) ||
    !inRange(input.airframeLeft, 0, FULL_RESOURCE)
  ) {
    throw badInput(`Resources must be between 0 and ${FULL_RESOURCE}`);
  }
  if (!inRange(input.total, 0, TRAIL_LEGS * QUESTIONS_PER_LEG)) {
    throw badInput("total is not a possible number of questions");
  }
  if (!inRange(input.correct, 0, input.total)) {
    throw badInput("correct cannot exceed total");
  }
}

export const trailResolvers: Resolvers = {
  Query: {
    /**
     * Today's route, dealt to everyone identically.
     *
     * Public, and rate-limited like its public neighbours. Two round trips
     * total — one for the domains in play, one for every question on the
     * route — because over neon-http each query is its own HTTPS request and a
     * per-leg fetch would be eight of them.
     */
    dailyTrail: async (_parent, _args, context) => {
      await requireWithinRateLimit(context, "trail", PUBLIC_RULE);

      const date = trailDateFor(new Date());

      // Same shape as questionDomains: unclassified questions have no domain
      // to dress as terrain, so they sit the trail out exactly as they sit out
      // /practice and domainAccuracy.
      const domainRows = await context.db
        .selectDistinct({ domain: questions.domain })
        .from(questions)
        .where(isNotNull(questions.domain))
        .orderBy(asc(questions.domain));

      const route = buildRoute(
        date,
        domainRows
          .map((row) => row.domain)
          .filter((domain): domain is string => domain !== null),
      );

      if (route.length === 0) return { date, legs: [] };

      /**
       * Which questions a leg gets is decided in SQL and seeded by the date:
       * `md5(id || date)` is a stable pseudo-random order per day, so the draw
       * survives a restart, a second server, and a page refresh. `random()` —
       * what sampleQuestions uses, correctly, for a study run — would deal a
       * different hand to every visitor and make the daily trail meaningless.
       *
       * A window function cannot appear in WHERE, hence the subquery.
       */
      const ranked = context.db
        .select({
          id: questions.id,
          prompt: questions.prompt,
          questionText: questions.questionText,
          answers: questions.answers,
          hint: questions.hint,
          points: questions.points,
          domain: questions.domain,
          seat: sql<number>`row_number() over (
            partition by ${questions.domain}
            order by md5(${questions.id}::text || ${date})
          )`.as("seat"),
        })
        .from(questions)
        .where(
          inArray(
            questions.domain,
            route.map((leg) => leg.domain),
          ),
        )
        .as("ranked");

      const rows = await context.db
        .select({
          id: ranked.id,
          prompt: ranked.prompt,
          questionText: ranked.questionText,
          answers: ranked.answers,
          hint: ranked.hint,
          points: ranked.points,
          domain: ranked.domain,
          seat: ranked.seat,
        })
        .from(ranked)
        .where(lte(ranked.seat, QUESTIONS_PER_LEG))
        .orderBy(asc(ranked.domain), asc(ranked.seat));

      const byDomain = new Map<string, typeof rows>();
      for (const row of rows) {
        if (!row.domain) continue;
        const bucket = byDomain.get(row.domain) ?? [];
        bucket.push(row);
        byDomain.set(row.domain, bucket);
      }

      return {
        date,
        // A leg whose domain came back empty is dropped rather than served as
        // a leg you fly through with nothing to answer. Renumbered afterwards
        // so "LEG 3 OF 7" still counts up without a gap.
        legs: route
          .map((leg) => ({ ...leg, questions: byDomain.get(leg.domain) ?? [] }))
          .filter((leg) => leg.questions.length > 0)
          .map((leg, i) => ({ ...leg, index: i + 1 })),
      };
    },

    myTrailRun: async (_parent, _args, context) => {
      const viewer = requireAuth(context);

      const [run] = await context.db
        .select()
        .from(trailRuns)
        .where(
          and(
            eq(trailRuns.userId, viewer._id),
            eq(trailRuns.trailDate, trailDateFor(new Date())),
          ),
        )
        .limit(1);

      return run ?? null;
    },
  },

  Mutation: {
    recordTrailRun: async (_parent, { input }, context) => {
      const viewer = requireAuth(context);
      await requireWithinRateLimit(context, "trail-run", SUBMIT_RULE);

      assertRecordableDate(input.trailDate, new Date());
      assertPlausibleRun(input);

      // onConflictDoNothing rather than an upsert: the first attempt of the
      // day is the one that happened. A refresh, a retry, or a second tab must
      // not be able to rewrite it — and the unique index, not this resolver,
      // is what actually enforces that.
      const [inserted] = await context.db
        .insert(trailRuns)
        .values({
          userId: viewer._id,
          trailDate: input.trailDate,
          legsReached: input.legsReached,
          completed: input.completed,
          batteryLeft: input.batteryLeft,
          airframeLeft: input.airframeLeft,
          correct: input.correct,
          total: input.total,
        })
        .onConflictDoNothing({
          target: [trailRuns.userId, trailRuns.trailDate],
        })
        .returning();

      if (inserted) return inserted;

      // Conflicted: the day was already flown. Return what is stored, so the
      // client shows the real run rather than the one it just tried to file.
      const [existing] = await context.db
        .select()
        .from(trailRuns)
        .where(
          and(
            eq(trailRuns.userId, viewer._id),
            eq(trailRuns.trailDate, input.trailDate),
          ),
        )
        .limit(1);

      if (!existing) throw new Error("Failed to record trail run");
      return existing;
    },
  },
};
