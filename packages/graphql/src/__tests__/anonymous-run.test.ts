import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { questions, userResponses, users } from "@quiz/db";
import { createHarness, type TestHarness } from "./harness";

const SAMPLE = /* GraphQL */ `
  query SampleQuestions($limit: Int, $domain: String) {
    sampleQuestions(limit: $limit, domain: $domain) {
      id
      prompt
      questionText
      answers
      hint
      points
      domain
    }
  }
`;

const GRADE = /* GraphQL */ `
  mutation GradeAnswers($answers: [AnswerInput!]!) {
    gradeAnswers(answers: $answers) {
      questionId
      isCorrect
      correctAnswer
      explanation
    }
  }
`;

interface SampleResult {
  sampleQuestions: {
    id: string;
    questionText: string;
    answers: string[];
    domain: string | null;
  }[];
}
interface GradeResult {
  gradeAnswers: {
    questionId: string;
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string | null;
  }[];
}

/**
 * The landing page has always said "Start with a ten-item run. No account
 * required." Until these two operations existed it was not true: /quiz bounced
 * anonymous visitors to /login and the questions query required a token.
 */
describe("the anonymous run", () => {
  let h: TestHarness;
  let seeded: { id: string; domain: string | null }[] = [];

  beforeAll(async () => {
    h = await createHarness();
    const editor = await h.createUser({ role: "EDITOR" });

    const rows = await h.db
      .insert(questions)
      .values(
        Array.from({ length: 40 }, (_, i) => ({
          prompt: `prompt ${i}`,
          questionText: `question ${i}`,
          answers: ["right", "wrong"],
          correctAnswer: "right",
          hint: `hint ${i}`,
          explanation: `because ${i}`,
          points: 2,
          // Half classified, half not — the shape the real bank is in.
          domain: i % 2 === 0 ? "Regulations" : null,
          createdBy: editor.id,
        })),
      )
      .returning();

    seeded = rows.map((row) => ({ id: row.id, domain: row.domain }));
  });
  afterAll(() => h.close());

  describe("sampleQuestions", () => {
    it("serves a run with no Authorization header at all", async () => {
      const res = await h.execute<SampleResult>(SAMPLE, {
        variables: { limit: 10 },
      });

      expect(res.errors).toEqual([]);
      expect(res.data?.sampleQuestions).toHaveLength(10);
    });

    /**
     * The whole point of the type. `questions` returns the full row including
     * correctAnswer; this path must not, because anyone can reach it.
     */
    it("never exposes the answer key", async () => {
      const res = await h.execute(
        `{ sampleQuestions(limit: 5) { id correctAnswer } }`,
      );

      expect(res.data).toBeNull();
      expect(JSON.stringify(res.errors)).toMatch(/correctAnswer/);
    });

    /**
     * The bug this replaces: `questions` orders by createdAt and the page
     * sliced the first N client-side, so every run — every user, every repeat —
     * was the same ten items in the same order.
     */
    it("varies between runs instead of serving the same items every time", async () => {
      const runs = await Promise.all(
        Array.from({ length: 6 }, () =>
          h.execute<SampleResult>(SAMPLE, { variables: { limit: 10 } }),
        ),
      );

      const signatures = new Set(
        runs.map((run) =>
          (run.data?.sampleQuestions ?? []).map((q) => q.id).join(","),
        ),
      );

      expect(signatures.size).toBeGreaterThan(1);
    });

    it("clamps the limit to the size of a run rather than the whole bank", async () => {
      const tooMany = await h.execute<SampleResult>(SAMPLE, {
        variables: { limit: 10_000 },
      });
      const tooFew = await h.execute<SampleResult>(SAMPLE, {
        variables: { limit: 0 },
      });

      expect(tooMany.data?.sampleQuestions.length).toBeLessThanOrEqual(200);
      expect(tooFew.data?.sampleQuestions).toHaveLength(1);
    });

    it("defaults to a ten-item run", async () => {
      const res = await h.execute<SampleResult>(`
        { sampleQuestions { id } }
      `);
      expect(res.data?.sampleQuestions).toHaveLength(10);
    });

    it("narrows to a single domain when asked", async () => {
      const res = await h.execute<SampleResult>(SAMPLE, {
        variables: { limit: 20, domain: "Regulations" },
      });

      const returned = res.data?.sampleQuestions ?? [];
      expect(returned.length).toBeGreaterThan(0);
      expect(returned.every((q) => q.domain === "Regulations")).toBe(true);
    });
  });

  /**
   * The study pages. These are the only place the bank is published as
   * readable content, and the only reason anything in it can rank for a
   * search — so they are public, ordered, and complete with answers.
   */
  describe("publishedQuestions", () => {
    const PUBLISHED = /* GraphQL */ `
      query PublishedQuestions($domain: String!, $limit: Int) {
        publishedQuestions(domain: $domain, limit: $limit) {
          id
          questionText
          answers
          correctAnswer
          explanation
          domain
        }
      }
    `;

    it("publishes a domain's questions with answers, without a token", async () => {
      const res = await h.execute<{
        publishedQuestions: { correctAnswer: string; domain: string }[];
      }>(PUBLISHED, { variables: { domain: "Regulations" } });

      expect(res.errors).toEqual([]);
      expect(res.data!.publishedQuestions.length).toBeGreaterThan(0);
      expect(res.data!.publishedQuestions[0]?.correctAnswer).toBe("right");
      expect(
        res.data!.publishedQuestions.every((q) => q.domain === "Regulations"),
      ).toBe(true);
    });

    /**
     * A crawler that sees a different page every visit cannot decide the page
     * is about anything. The run feed is random; this deliberately is not.
     */
    it("returns the same page in the same order on every request", async () => {
      const [first, second] = await Promise.all([
        h.execute<{ publishedQuestions: { id: string }[] }>(PUBLISHED, {
          variables: { domain: "Regulations", limit: 10 },
        }),
        h.execute<{ publishedQuestions: { id: string }[] }>(PUBLISHED, {
          variables: { domain: "Regulations", limit: 10 },
        }),
      ]);

      expect(first.data!.publishedQuestions.map((q) => q.id)).toEqual(
        second.data!.publishedQuestions.map((q) => q.id),
      );
    });

    it("returns nothing for a domain that does not exist", async () => {
      const res = await h.execute<{ publishedQuestions: unknown[] }>(
        PUBLISHED,
        { variables: { domain: "Underwater Basket Weaving" } },
      );
      expect(res.data?.publishedQuestions).toEqual([]);
    });
  });

  describe("public counts", () => {
    it("counts the bank without a token", async () => {
      const res = await h.execute<{ questionCount: number }>(
        `{ questionCount }`,
      );
      expect(res.errors).toEqual([]);
      expect(res.data?.questionCount).toBe(40);
    });

    it("counts one domain", async () => {
      const res = await h.execute<{ questionCount: number }>(
        `query C($d: String) { questionCount(domain: $d) }`,
        { variables: { d: "Regulations" } },
      );
      expect(res.data?.questionCount).toBe(20);
    });

    it("counts operators without a token", async () => {
      const res = await h.execute<{ userCount: number }>(`{ userCount }`);
      expect(res.errors).toEqual([]);
      expect(res.data?.userCount).toBeGreaterThan(0);
    });
  });

  describe("gradeAnswers", () => {
    it("grades a run for a caller with no token", async () => {
      const answers = seeded.slice(0, 3).map((q, i) => ({
        questionId: q.id,
        selectedAnswer: i === 0 ? "right" : "wrong",
      }));

      const res = await h.execute<GradeResult>(GRADE, {
        variables: { answers },
      });

      expect(res.errors).toEqual([]);
      expect(res.data?.gradeAnswers.map((g) => g.isCorrect)).toEqual([
        true,
        false,
        false,
      ]);
    });

    it("answers in the order it was asked", async () => {
      const answers = seeded.slice(0, 4).map((q) => ({
        questionId: q.id,
        selectedAnswer: "right",
      }));

      const res = await h.execute<GradeResult>(GRADE, {
        variables: { answers },
      });

      expect(res.data?.gradeAnswers.map((g) => g.questionId)).toEqual(
        answers.map((a) => a.questionId),
      );
    });

    /**
     * A grade is not a score. Anything that counts towards stats or the
     * leaderboard has to go through submitAnswer, which requires a token.
     */
    it("records nothing", async () => {
      const before = await h.db.select().from(userResponses);

      await h.execute(GRADE, {
        variables: {
          answers: seeded
            .slice(0, 5)
            .map((q) => ({ questionId: q.id, selectedAnswer: "right" })),
        },
      });

      const after = await h.db.select().from(userResponses);
      expect(after).toHaveLength(before.length);
    });

    it("does not move a signed-in user's score either", async () => {
      const player = await h.createUser();

      await h.execute(GRADE, {
        token: h.tokenFor(player),
        variables: {
          answers: seeded
            .slice(0, 5)
            .map((q) => ({ questionId: q.id, selectedAnswer: "right" })),
        },
      });

      const [row] = await h.db
        .select()
        .from(users)
        .where(eq(users.id, player.id));
      expect(row?.score).toBe(0);
      expect(row?.questionsAnswered).toBe(0);
    });

    it("marks an unknown question wrong rather than failing the whole run", async () => {
      const res = await h.execute<GradeResult>(GRADE, {
        variables: {
          answers: [
            { questionId: seeded[0]!.id, selectedAnswer: "right" },
            {
              questionId: "00000000-0000-0000-0000-000000000000",
              selectedAnswer: "right",
            },
          ],
        },
      });

      expect(res.errors).toEqual([]);
      expect(res.data?.gradeAnswers.map((g) => g.isCorrect)).toEqual([
        true,
        false,
      ]);
    });

    /**
     * A signed-out run has to teach as much as a signed-in one, or the wall at
     * the end is asking people to sign up for something they have not seen.
     */
    it("reveals the answer and the reason to a signed-out visitor", async () => {
      const res = await h.execute<GradeResult>(GRADE, {
        variables: {
          answers: [{ questionId: seeded[0]!.id, selectedAnswer: "wrong" }],
        },
      });

      const graded = res.data!.gradeAnswers[0]!;
      expect(graded.isCorrect).toBe(false);
      expect(graded.correctAnswer).toBe("right");
      expect(graded.explanation).toMatch(/^because /);
    });

    it("handles an empty run", async () => {
      const res = await h.execute<GradeResult>(GRADE, {
        variables: { answers: [] },
      });
      expect(res.data?.gradeAnswers).toEqual([]);
    });
  });
});
