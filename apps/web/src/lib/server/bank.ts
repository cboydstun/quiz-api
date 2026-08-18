import "server-only";
import { asc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb, questions } from "@quiz/db";
import { cached, withTimeout } from "./cache";

/**
 * Server-side reads for the pages that have to be rendered as HTML rather than
 * fetched by Apollo in the browser.
 *
 * These talk to the database directly instead of posting to our own /v1/graphql
 * route. A server component calling its own HTTP API means a second round trip
 * and a second cold start to produce the same rows, and it needs an absolute
 * URL to itself — which is exactly the sort of thing that works locally and
 * fails on a preview deployment.
 *
 * Every function is bounded by `withTimeout` and returns an empty result on
 * failure. These back the landing page and the study pages: a database blink
 * should degrade a page to "nothing published yet" rather than 500 it, and an
 * unreachable database must not hang a render — `neon()` retries rather than
 * throwing, which is how an unreachable host becomes a 60-second stall.
 */

export interface PublishedQuestion {
  id: string;
  questionText: string;
  answers: string[];
  correctAnswer: string;
  explanation: string | null;
  hint: string | null;
}

export function listDomains(): Promise<string[]> {
  return cached("domains", 60_000, () =>
    withTimeout(
      async () => {
        const rows = await getDb()
          .selectDistinct({ domain: questions.domain })
          .from(questions)
          .where(isNotNull(questions.domain))
          .orderBy(asc(questions.domain));

        return rows
          .map((row) => row.domain)
          .filter((domain): domain is string => domain !== null);
      },
      [],
      "listDomains",
    ),
  );
}

export function listPublishedQuestions(
  domain: string,
  limit = 25,
): Promise<PublishedQuestion[]> {
  return cached(`questions:${domain}:${limit}`, 60_000, () =>
    withTimeout(
      () =>
        getDb()
          .select({
            id: questions.id,
            questionText: questions.questionText,
            answers: questions.answers,
            correctAnswer: questions.correctAnswer,
            explanation: questions.explanation,
            hint: questions.hint,
          })
          .from(questions)
          .where(eq(questions.domain, domain))
          // Stable order: a crawler that sees a different page every visit
          // cannot decide the page is about anything.
          .orderBy(asc(questions.createdAt))
          .limit(limit),
      [] as PublishedQuestion[],
      `listPublishedQuestions(${domain})`,
    ),
  );
}

/**
 * Every domain's count in one query.
 *
 * The practice index needs a count per domain and was calling countQuestions()
 * once per domain — twelve round trips to produce what one GROUP BY returns,
 * every time a cold instance rendered the page.
 */
export function countByDomain(): Promise<Record<string, number>> {
  return cached("countByDomain", 60_000, () =>
    withTimeout(
      async () => {
        const rows = await getDb()
          .select({
            domain: questions.domain,
            total: sql<number>`count(*)::int`,
          })
          .from(questions)
          .where(isNotNull(questions.domain))
          .groupBy(questions.domain);

        return Object.fromEntries(
          rows.map((row) => [row.domain as string, row.total]),
        );
      },
      {} as Record<string, number>,
      "countByDomain",
    ),
  );
}

export function countQuestions(domain?: string): Promise<number> {
  return cached(`count:${domain ?? "all"}`, 60_000, () =>
    withTimeout(
      async () => {
        const [row] = await getDb()
          .select({ total: sql<number>`count(*)::int` })
          .from(questions)
          .where(domain ? eq(questions.domain, domain) : undefined);
        return row?.total ?? 0;
      },
      0,
      "countQuestions",
    ),
  );
}
