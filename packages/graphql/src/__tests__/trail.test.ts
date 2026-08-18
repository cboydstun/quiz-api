import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { questions, trailRuns } from "@quiz/db";
import { TERRAIN, trailDateFor } from "../trail/route";
import { createHarness, type TestHarness } from "./harness";

const DAILY_TRAIL = /* GraphQL */ `
  query DailyTrail {
    dailyTrail {
      date
      legs {
        index
        domain
        terrain
        hazard
        questions {
          id
          questionText
          answers
          points
        }
      }
    }
  }
`;

const MY_TRAIL_RUN = /* GraphQL */ `
  query MyTrailRun {
    myTrailRun {
      trailDate
      legsReached
      completed
      batteryLeft
      airframeLeft
      correct
      total
    }
  }
`;

const RECORD_TRAIL_RUN = /* GraphQL */ `
  mutation RecordTrailRun($input: RecordTrailRunInput!) {
    recordTrailRun(input: $input) {
      trailDate
      legsReached
      completed
      batteryLeft
      airframeLeft
      correct
      total
    }
  }
`;

interface TrailLeg {
  index: number;
  domain: string;
  terrain: string;
  hazard: boolean;
  questions: {
    id: string;
    questionText: string;
    answers: string[];
    points: number;
  }[];
}
interface DailyTrailResult {
  dailyTrail: { date: string; legs: TrailLeg[] };
}
interface TrailRunShape {
  trailDate: string;
  legsReached: number;
  completed: boolean;
  batteryLeft: number;
  airframeLeft: number;
  correct: number;
  total: number;
}
interface MyTrailRunResult {
  myTrailRun: TrailRunShape | null;
}
interface RecordResult {
  recordTrailRun: TrailRunShape;
}

const DOMAINS = Object.keys(TERRAIN);

function validRun(overrides: Partial<TrailRunShape> = {}): TrailRunShape {
  return {
    trailDate: trailDateFor(new Date()),
    legsReached: 5,
    completed: false,
    batteryLeft: 0,
    airframeLeft: 60,
    correct: 9,
    total: 15,
    ...overrides,
  };
}

describe("the daily trail", () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await createHarness();
    const editor = await h.createUser({ role: "EDITOR" });

    await h.db.insert(questions).values(
      DOMAINS.flatMap((domain, d) =>
        // Six per domain, so a three-per-leg draw is a genuine selection
        // rather than "everything there is".
        Array.from({ length: 6 }, (_, i) => ({
          prompt: `prompt ${d}-${i}`,
          questionText: `question ${d}-${i}`,
          answers: ["right", "wrong"],
          correctAnswer: "right",
          explanation: `because ${d}-${i}`,
          points: 2,
          domain,
          createdBy: editor.id,
        })),
      ),
    );

    // The unclassified rows the real bank carries. They must sit the trail out.
    await h.db.insert(questions).values(
      Array.from({ length: 5 }, (_, i) => ({
        prompt: `intro ${i}`,
        questionText: `unclassified ${i}`,
        answers: ["right", "wrong"],
        correctAnswer: "right",
        domain: null,
        createdBy: editor.id,
      })),
    );
  });

  afterAll(async () => {
    await h.close();
  });

  describe("dailyTrail", () => {
    // The client sends authorization: "" when logged out, not an absent
    // header. If this ever required a token, /trail would bounce every
    // anonymous visitor to /login through the error link.
    it("is reachable with the empty header a logged-out client sends", async () => {
      const response = await h.execute<DailyTrailResult>(DAILY_TRAIL, {
        token: "",
      });

      expect(response.errors).toEqual([]);
      expect(response.status).toBe(200);
      expect(response.data?.dailyTrail.legs).toHaveLength(8);
    });

    it("dates the route by the UTC day", async () => {
      const response = await h.execute<DailyTrailResult>(DAILY_TRAIL);
      expect(response.data?.dailyTrail.date).toBe(trailDateFor(new Date()));
    });

    it("deals three questions a leg, over eight distinct domains", async () => {
      const legs =
        (await h.execute<DailyTrailResult>(DAILY_TRAIL)).data?.dailyTrail
          .legs ?? [];

      expect(legs.map((leg) => leg.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      for (const leg of legs) expect(leg.questions).toHaveLength(3);
      expect(new Set(legs.map((leg) => leg.domain)).size).toBe(8);
    });

    // The whole point of a daily trail: two people who fly it today flew the
    // same one. A `random()` draw would quietly break this and nothing else.
    it("deals the same hand on every call", async () => {
      const first = await h.execute<DailyTrailResult>(DAILY_TRAIL);
      const second = await h.execute<DailyTrailResult>(DAILY_TRAIL, {
        token: "",
      });

      expect(second.data).toEqual(first.data);
    });

    it("never repeats a question within a run", async () => {
      const legs =
        (await h.execute<DailyTrailResult>(DAILY_TRAIL)).data?.dailyTrail
          .legs ?? [];
      const ids = legs.flatMap((leg) => leg.questions.map((q) => q.id));

      expect(new Set(ids).size).toBe(ids.length);
    });

    it("leaves unclassified questions out of the route", async () => {
      const legs =
        (await h.execute<DailyTrailResult>(DAILY_TRAIL)).data?.dailyTrail
          .legs ?? [];
      const texts = legs.flatMap((leg) =>
        leg.questions.map((q) => q.questionText),
      );

      expect(texts.some((text) => text.startsWith("unclassified"))).toBe(false);
    });

    it("dresses each leg in its terrain", async () => {
      const legs =
        (await h.execute<DailyTrailResult>(DAILY_TRAIL)).data?.dailyTrail
          .legs ?? [];

      for (const leg of legs) {
        expect(leg.terrain).toBe(TERRAIN[leg.domain]?.terrain);
        expect(leg.hazard).toBe(TERRAIN[leg.domain]?.hazard);
      }
    });

    // RunQuestion carries no answer key by construction. Asserted here too,
    // because this is the one query an anonymous caller can reach the trail
    // through.
    it("does not serve the answer key", async () => {
      const response = await h.execute(
        /* GraphQL */ `
          query Peek {
            dailyTrail {
              legs {
                questions {
                  correctAnswer
                }
              }
            }
          }
        `,
        { token: "" },
      );

      expect(response.errors[0]?.message).toMatch(/correctAnswer/);
    });
  });

  describe("myTrailRun", () => {
    it("refuses a logged-out caller with a message that clears the token", async () => {
      const response = await h.execute<MyTrailRunResult>(MY_TRAIL_RUN, {
        token: "",
      });

      // ApolloWrapper matches "unauthorized"/"unauthenticated" to log the user
      // out; the quiz page matches the missing-header string literally. One of
      // those markers has to be present or a dead token strands the user.
      expect(response.errors[0]?.message).toMatch(
        /unauthorized|unauthenticated|Authorization header must be provided/i,
      );
    });

    it("is null before the day is flown", async () => {
      const user = await h.createUser();
      const response = await h.execute<MyTrailRunResult>(MY_TRAIL_RUN, {
        token: h.tokenFor(user),
      });

      expect(response.errors).toEqual([]);
      expect(response.data?.myTrailRun).toBeNull();
    });
  });

  describe("recordTrailRun", () => {
    it("stores the run and makes the day spent", async () => {
      const user = await h.createUser();
      const token = h.tokenFor(user);
      const input = validRun();

      const recorded = await h.execute<RecordResult>(RECORD_TRAIL_RUN, {
        variables: { input },
        token,
      });

      expect(recorded.errors).toEqual([]);
      expect(recorded.data?.recordTrailRun).toMatchObject(input);

      const mine = await h.execute<MyTrailRunResult>(MY_TRAIL_RUN, { token });
      expect(mine.data?.myTrailRun).toMatchObject(input);
    });

    /**
     * The unique index is the one-attempt-per-day rule. PGlite replays the real
     * migrations, so this exercises the constraint itself rather than a check
     * in the resolver — and the first attempt has to win, or a refresh after a
     * bad run would let you file a better one.
     */
    it("keeps the first attempt when a second is filed for the same day", async () => {
      const user = await h.createUser();
      const token = h.tokenFor(user);

      const first = validRun({ legsReached: 3, correct: 4, total: 9 });
      await h.execute<RecordResult>(RECORD_TRAIL_RUN, {
        variables: { input: first },
        token,
      });

      const second = await h.execute<RecordResult>(RECORD_TRAIL_RUN, {
        variables: {
          input: validRun({ legsReached: 8, completed: true, correct: 24, total: 24 }),
        },
        token,
      });

      expect(second.errors).toEqual([]);
      expect(second.data?.recordTrailRun).toMatchObject(first);

      const stored = await h.db.select().from(trailRuns);
      expect(
        stored.filter((row) => row.userId === user.id),
      ).toHaveLength(1);
    });

    it("refuses a logged-out caller", async () => {
      const response = await h.execute<RecordResult>(RECORD_TRAIL_RUN, {
        variables: { input: validRun() },
        token: "",
      });

      expect(response.errors[0]?.message).toMatch(
        /unauthorized|unauthenticated|Authorization header must be provided/i,
      );
    });

    it("refuses a trail that is no longer open", async () => {
      const user = await h.createUser();
      const response = await h.execute<RecordResult>(RECORD_TRAIL_RUN, {
        variables: { input: validRun({ trailDate: "2020-01-01" }) },
        token: h.tokenFor(user),
      });

      expect(response.errors[0]?.message).toMatch(/no longer open/);
    });

    it("accepts a run that crossed midnight", async () => {
      const user = await h.createUser();
      const yesterday = trailDateFor(new Date(Date.now() - 86_400_000));

      const response = await h.execute<RecordResult>(RECORD_TRAIL_RUN, {
        variables: { input: validRun({ trailDate: yesterday }) },
        token: h.tokenFor(user),
      });

      expect(response.errors).toEqual([]);
      expect(response.data?.recordTrailRun.trailDate).toBe(yesterday);
    });

    it.each([
      ["legsReached below one", { legsReached: 0 }],
      ["legsReached past the end of the trail", { legsReached: 9 }],
      ["a resource above full", { batteryLeft: 140 }],
      ["more correct than asked", { correct: 20, total: 15 }],
      ["more questions than the trail holds", { total: 99 }],
    ])("rejects %s", async (_label, overrides) => {
      const user = await h.createUser();
      const response = await h.execute<RecordResult>(RECORD_TRAIL_RUN, {
        variables: { input: validRun(overrides) },
        token: h.tokenFor(user),
      });

      expect(response.errors.length).toBeGreaterThan(0);
    });
  });
});
