import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness, type TestHarness } from "./harness";
import { maskEmail } from "../resolvers/leaderboard";

const LEADERBOARD = /* GraphQL */ `
  query GetLeaderboard($limit: Int) {
    getLeaderboard(limit: $limit) {
      leaderboard {
        position
        user {
          username
          email
          score
        }
        score
      }
      currentUserEntry {
        position
        user {
          username
          email
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
  user: { username: string; email: string; score: number };
}
interface Result {
  getLeaderboard: { leaderboard: Entry[]; currentUserEntry: Entry | null };
}

describe("maskEmail", () => {
  it("keeps the first and last character of a long local part", () => {
    expect(maskEmail("chrisboydstun@example.com")).toBe("c***n@example.com");
  });

  it("hides all but the first character of a short local part", () => {
    expect(maskEmail("ab@example.com")).toBe("a*@example.com");
    expect(maskEmail("a@example.com")).toBe("a@example.com");
  });
});

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

  it("masks every email it returns", async () => {
    const res = await h.execute<Result>(LEADERBOARD, {
      variables: { limit: 3 },
    });
    for (const entry of res.data!.getLeaderboard.leaderboard) {
      expect(entry.user.email).toContain("*");
    }
  });

  /**
   * Google sign-ups arrive with a null username. Falling back to the email's
   * local part would publish it in the clear, on a public endpoint, right next
   * to the masked address — masking nothing at all for that group.
   */
  it("never falls back to the email local part for a user with no username", async () => {
    const anonymous = await h.createUser({
      username: null,
      email: "distinctive-local-part@example.com",
      // Top of the board as it stands here, but below the leader seeded later.
      score: 500,
    });

    const res = await h.execute<Result>(LEADERBOARD, {
      token: h.tokenFor(anonymous),
      variables: { limit: 3 },
    });

    const shown = res.data!.getLeaderboard.leaderboard[0]!.user;
    expect(shown.username).not.toContain("distinctive-local-part");
    expect(JSON.stringify(res.data)).not.toContain("distinctive-local-part");
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

  it("defaults to ten entries when no limit is given", async () => {
    const res = await h.execute<Result>(
      `{ getLeaderboard { leaderboard { position } } }`,
    );
    expect(res.data!.getLeaderboard.leaderboard).toHaveLength(10);
  });
});
