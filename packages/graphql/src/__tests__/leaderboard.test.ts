import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { questions, userResponses } from "@quiz/db";
import { createHarness, type TestHarness } from "./harness";

const LEADERBOARD = /* GraphQL */ `
  query GetLeaderboard($limit: Int, $period: LeaderboardPeriod) {
    getLeaderboard(limit: $limit, period: $period) {
      leaderboard {
        position
        user {
          id
          username
          score
        }
        score
      }
      currentUserEntry {
        position
        user {
          id
          username
          score
        }
        score
      }
    }
  }
`;

interface Entry {
  position: number;
  score: number;
  user: { id: string; username: string; score: number };
}
interface Result {
  getLeaderboard: { leaderboard: Entry[]; currentUserEntry: Entry | null };
}

describe("getLeaderboard", () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await createHarness();
    // Descending scores so positions are predictable.
    for (let i = 0; i < 12; i += 1) {
      await h.createUser({
        username: `player${String(i).padStart(2, "0")}`,
        email: `player${String(i).padStart(2, "0")}@example.com`,
        score: 100 - i,
      });
    }
  });
  afterAll(() => h.close());

  /**
   * /leaderboard has no route guard on the client. If this required a token,
   * the Apollo error link would bounce every anonymous visitor to /login.
   */
  it("serves anonymous callers with a null currentUserEntry", async () => {
    const res = await h.execute<Result>(LEADERBOARD, {
      variables: { limit: 10 },
    });

    expect(res.errors).toEqual([]);
    expect(res.data?.getLeaderboard.leaderboard).toHaveLength(10);
    expect(res.data?.getLeaderboard.currentUserEntry).toBeNull();
  });

  it("ranks by score descending and numbers positions from 1", async () => {
    const res = await h.execute<Result>(LEADERBOARD, {
      variables: { limit: 5 },
    });
    const board = res.data!.getLeaderboard.leaderboard;

    expect(board.map((e) => e.position)).toEqual([1, 2, 3, 4, 5]);
    expect(board[0]?.score).toBe(100);
    expect(board.map((e) => e.score)).toEqual(
      [...board.map((e) => e.score)].sort((a, b) => b - a),
    );
  });

  /**
   * getLeaderboard is public, so the guard belongs on the schema rather than
   * on one response: asserting the payload only proves something about the
   * fields this file happens to select. LeaderboardUser exists precisely so a
   * field added to User cannot reach an anonymous caller, and this is the
   * executable version of that.
   */
  it("exposes no address field on the public LeaderboardUser type", async () => {
    const res = await h.execute<{
      __type: { fields: { name: string }[] };
    }>(`{ __type(name: "LeaderboardUser") { fields { name } } }`);

    expect(res.errors).toEqual([]);
    expect(res.data!.__type.fields.map((f) => f.name)).toEqual([
      "id",
      "username",
      "score",
    ]);
  });

  it("returns no email address in any form", async () => {
    const res = await h.execute<Result>(LEADERBOARD, {
      variables: { limit: 10 },
    });

    expect(res.errors).toEqual([]);
    expect(JSON.stringify(res.data)).not.toContain("@");
  });

  /**
   * Google sign-ups arrive with a null username. Falling back to the email's
   * local part would publish it in the clear on a public endpoint — the one
   * group that never chose a display name would be the only group whose
   * address the board gives away.
   */
  it("never falls back to the email local part for a user with no username", async () => {
    const anonymous = await h.createUser({
      username: null,
      email: "distinctive-local-part@example.com",
      score: 500,
    });

    const res = await h.execute<Result>(LEADERBOARD, {
      token: h.tokenFor(anonymous),
      variables: { limit: 10 },
    });

    // By id, not by index: the fixture's rank depends on users other `it`
    // blocks seed into the shared harness, and an index lookup would start
    // passing vacuously the moment this file is reordered.
    const shown = res.data!.getLeaderboard.leaderboard.find(
      (entry) => entry.user.id === anonymous.id,
    );
    expect(shown).toBeDefined();
    expect(shown!.user.username).not.toContain("distinctive-local-part");
    expect(JSON.stringify(res.data)).not.toContain("distinctive-local-part");
  });

  /**
   * The stand-in is derived from the user's id rather than their position.
   * A rank-derived name would rename the same operator whenever anyone else
   * scored — and would differ between periods, so a viewer switching tabs
   * would see one person appear as two.
   */
  it("gives a user with no username a name that survives a rank change", async () => {
    // Scores deliberately at the bottom of the board: a later `it` asserts
    // that a user seeded with 1000 lands at position 1.
    const nameless = await h.createUser({
      username: null,
      email: "nameless@example.com",
      score: 3,
    });

    const before = await h.execute<Result>(LEADERBOARD, {
      token: h.tokenFor(nameless),
      variables: { limit: 10 },
    });
    const first = before.data!.getLeaderboard.currentUserEntry!;
    expect(first.user.username).toMatch(/^Operator [0-9A-F]{4}$/);

    await h.createUser({
      username: "usurper",
      email: "usurper@example.com",
      score: 4,
    });

    const after = await h.execute<Result>(LEADERBOARD, {
      token: h.tokenFor(nameless),
      variables: { limit: 10 },
    });
    const second = after.data!.getLeaderboard.currentUserEntry!;

    expect(second.position).not.toBe(first.position);
    expect(second.user.username).toBe(first.user.username);
  });

  /**
   * The viewer's position is their rank in the whole table. Numbering only the
   * returned page would report the wrong position for anyone outside the top N.
   */
  it("reports the viewer's true global position when they are outside the top N", async () => {
    const straggler = await h.createUser({
      username: "zzz-straggler",
      email: "straggler@example.com",
      score: 1,
    });

    const res = await h.execute<Result>(LEADERBOARD, {
      token: h.tokenFor(straggler),
      variables: { limit: 3 },
    });

    const entry = res.data!.getLeaderboard.currentUserEntry;
    expect(res.data!.getLeaderboard.leaderboard).toHaveLength(3);
    expect(entry).not.toBeNull();
    expect(entry!.position).toBeGreaterThan(3);
    expect(entry!.user.score).toBe(1);
  });

  it("includes the viewer in the page when they are inside the top N", async () => {
    const leader = await h.createUser({
      username: "aaa-leader",
      email: "leader@example.com",
      score: 1000,
    });

    const res = await h.execute<Result>(LEADERBOARD, {
      token: h.tokenFor(leader),
      variables: { limit: 5 },
    });

    expect(res.data!.getLeaderboard.currentUserEntry?.position).toBe(1);
    expect(res.data!.getLeaderboard.leaderboard[0]?.user.username).toBe(
      "aaa-leader",
    );
  });

  /**
   * Windowed boards are computed from answer history rather than the
   * daily/monthly/yearly columns, which nothing has ever written to. That
   * means they only know about answers recorded since the cutover — including
   * knowing about none at all, which is the honest answer for a fresh window.
   */
  describe("periods", () => {
    it("ranks a windowed board from answers inside the window", async () => {
      const editor = await h.createUser({ role: "EDITOR" });
      const grinder = await h.createUser({
        username: "grinder",
        email: "grinder@example.com",
      });

      const [question] = await h.db
        .insert(questions)
        .values({
          prompt: "p",
          questionText: "q",
          answers: ["a", "b"],
          correctAnswer: "a",
          points: 7,
          createdBy: editor.id,
        })
        .returning();

      await h.db.insert(userResponses).values({
        userId: grinder.id,
        questionId: question!.id,
        selectedAnswer: "a",
        isCorrect: true,
      });

      const res = await h.execute<Result>(LEADERBOARD, {
        variables: { limit: 10, period: "DAILY" },
      });

      expect(res.errors).toEqual([]);
      const entry = res.data!.getLeaderboard.leaderboard.find(
        (e) => e.user.username === "grinder",
      );
      expect(entry?.score).toBe(7);
    });

    it("leaves an old answer out of a daily board", async () => {
      const editor = await h.createUser({ role: "EDITOR" });
      const veteran = await h.createUser({
        username: "veteran",
        email: "veteran@example.com",
      });

      const [question] = await h.db
        .insert(questions)
        .values({
          prompt: "p",
          questionText: "q",
          answers: ["a", "b"],
          correctAnswer: "a",
          points: 99,
          createdBy: editor.id,
        })
        .returning();

      await h.db.insert(userResponses).values({
        userId: veteran.id,
        questionId: question!.id,
        selectedAnswer: "a",
        isCorrect: true,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      });

      const daily = await h.execute<Result>(LEADERBOARD, {
        variables: { limit: 100, period: "DAILY" },
      });
      const monthly = await h.execute<Result>(LEADERBOARD, {
        variables: { limit: 100, period: "MONTHLY" },
      });

      expect(
        daily.data!.getLeaderboard.leaderboard.some(
          (e) => e.user.username === "veteran",
        ),
      ).toBe(false);
      expect(
        monthly.data!.getLeaderboard.leaderboard.some(
          (e) => e.user.username === "veteran",
        ),
      ).toBe(true);
    });

    it("returns no email address on a windowed board either", async () => {
      const res = await h.execute<Result>(LEADERBOARD, {
        variables: { limit: 100, period: "MONTHLY" },
      });
      expect(res.errors).toEqual([]);
      expect(JSON.stringify(res.data)).not.toContain("@");
    });

    it("serves a windowed board to anonymous callers too", async () => {
      const res = await h.execute<Result>(LEADERBOARD, {
        variables: { limit: 5, period: "WEEKLY" },
      });
      expect(res.errors).toEqual([]);
      expect(res.data?.getLeaderboard.currentUserEntry).toBeNull();
    });
  });

  it("defaults to ten entries when no limit is given", async () => {
    const res = await h.execute<Result>(
      `{ getLeaderboard { leaderboard { position } } }`,
    );
    expect(res.data!.getLeaderboard.leaderboard).toHaveLength(10);
  });
});
