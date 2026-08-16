import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "@quiz/db";
import { createHarness, type TestHarness } from "./harness";
import { calendarDaysBetween, nextStreak } from "../resolvers/users";

const PROFILE = /* GraphQL */ `
  query GetUserProfile {
    me {
      id
      username
      email
      role
      score
      questionsAnswered
      questionsCorrect
      questionsIncorrect
      skills
      lifetimePoints
      yearlyPoints
      monthlyPoints
      dailyPoints
      consecutiveLoginDays
      lastLoginDate
      createdAt
      updatedAt
    }
  }
`;

describe("streak arithmetic", () => {
  it("counts whole calendar days, ignoring the time of day", () => {
    const late = new Date("2026-03-01T23:59:00Z");
    const early = new Date("2026-03-02T00:01:00Z");
    expect(calendarDaysBetween(late, early)).toBe(1);
  });

  it("leaves the streak alone on a second login the same day", () => {
    expect(nextStreak(5, 0)).toBe(5);
  });

  it("extends the streak on consecutive days", () => {
    expect(nextStreak(5, 1)).toBe(6);
  });

  it("resets to 1 after a missed day", () => {
    expect(nextStreak(5, 2)).toBe(1);
    expect(nextStreak(5, 30)).toBe(1);
  });
});

describe("user queries and mutations", () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  it("serves the full profile selection with ISO date strings", async () => {
    const user = await h.createUser();
    const res = await h.execute<{
      me: { skills: string[]; createdAt: string; lastLoginDate: string | null };
    }>(PROFILE, { token: h.tokenFor(user) });

    expect(res.errors).toEqual([]);
    expect(res.data?.me.skills).toEqual([]);
    // The frontend formats these with new Date(value).
    expect(new Date(res.data!.me.createdAt).toString()).not.toBe(
      "Invalid Date",
    );
    expect(res.data?.me.lastLoginDate).toBeNull();
  });

  it("falls back to the email local part when a user has no username", async () => {
    const [user] = await h.db
      .insert(users)
      .values({ email: "nameless@example.com", username: null })
      .returning();

    const res = await h.execute<{ me: { username: string } }>(
      "{ me { username } }",
      { token: h.tokenFor(user!) },
    );
    expect(res.data?.me.username).toBe("nameless");
  });

  it("lists users for an admin and refuses everyone else", async () => {
    const admin = await h.createUser({ role: "ADMIN" });
    const plain = await h.createUser({ role: "USER" });

    const allowed = await h.execute<{ users: unknown[] }>("{ users { id } }", {
      token: h.tokenFor(admin),
    });
    expect(allowed.errors).toEqual([]);
    expect((allowed.data?.users.length ?? 0) >= 2).toBe(true);

    const denied = await h.execute("{ users { id } }", {
      token: h.tokenFor(plain),
    });
    expect(denied.errors[0]?.message).toMatch(/forbidden/i);
  });

  it("changes a role but never promotes to SUPER_ADMIN", async () => {
    const admin = await h.createUser({ role: "ADMIN" });
    const target = await h.createUser({ role: "USER" });

    const promoted = await h.execute<{ changeUserRole: { role: string } }>(
      `mutation C($userId: ID!, $newRole: Role!) {
         changeUserRole(userId: $userId, newRole: $newRole) { id role }
       }`,
      {
        token: h.tokenFor(admin),
        variables: { userId: target.id, newRole: "EDITOR" },
      },
    );
    expect(promoted.data?.changeUserRole.role).toBe("EDITOR");

    const escalated = await h.execute(
      `mutation C($userId: ID!, $newRole: Role!) {
         changeUserRole(userId: $userId, newRole: $newRole) { id role }
       }`,
      {
        token: h.tokenFor(admin),
        variables: { userId: target.id, newRole: "SUPER_ADMIN" },
      },
    );
    expect(escalated.errors[0]?.message).toMatch(/SUPER_ADMIN/);
  });

  it("refuses to delete a SUPER_ADMIN", async () => {
    const admin = await h.createUser({ role: "ADMIN" });
    const superAdmin = await h.createUser({ role: "SUPER_ADMIN" });

    const res = await h.execute(
      `mutation D($userId: ID!) { deleteUser(userId: $userId) }`,
      { token: h.tokenFor(admin), variables: { userId: superAdmin.id } },
    );
    expect(res.errors[0]?.message).toMatch(/SUPER_ADMIN/);
  });

  it("deletes an ordinary user", async () => {
    const admin = await h.createUser({ role: "ADMIN" });
    const victim = await h.createUser();

    const res = await h.execute<{ deleteUser: boolean }>(
      `mutation D($userId: ID!) { deleteUser(userId: $userId) }`,
      { token: h.tokenFor(admin), variables: { userId: victim.id } },
    );

    expect(res.data?.deleteUser).toBe(true);
    const rows = await h.db.select().from(users).where(eq(users.id, victim.id));
    expect(rows).toHaveLength(0);
  });

  it("renames a user and rejects a duplicate or too-short name", async () => {
    const user = await h.createUser({ username: "original" });
    await h.createUser({ username: "occupied" });

    const ok = await h.execute<{ updateUsername: { username: string } }>(
      `mutation U($username: String!) { updateUsername(username: $username) { id username } }`,
      { token: h.tokenFor(user), variables: { username: "renamed" } },
    );
    expect(ok.data?.updateUsername.username).toBe("renamed");

    const dup = await h.execute(
      `mutation U($username: String!) { updateUsername(username: $username) { id username } }`,
      { token: h.tokenFor(user), variables: { username: "occupied" } },
    );
    expect(dup.errors[0]?.message).toMatch(/already taken/i);

    const short = await h.execute(
      `mutation U($username: String!) { updateUsername(username: $username) { id username } }`,
      { token: h.tokenFor(user), variables: { username: "ab" } },
    );
    expect(short.errors[0]?.message).toMatch(/at least 3/i);
  });

  it("changes a password only when the current one is right", async () => {
    const user = await h.createUser({ password: "old-password" });

    const wrong = await h.execute(
      `mutation P($c: String!, $n: String!) {
         updatePassword(currentPassword: $c, newPassword: $n) { success message }
       }`,
      {
        token: h.tokenFor(user),
        variables: { c: "not-it", n: "new-password" },
      },
    );
    expect(wrong.errors[0]?.message).toMatch(/incorrect/i);
    // Must not read as an auth failure, or the client logs the user out.
    expect(wrong.errors[0]?.message).not.toMatch(
      /unauthorized|unauthenticated/i,
    );

    const right = await h.execute<{
      updatePassword: { success: boolean; message: string };
    }>(
      `mutation P($c: String!, $n: String!) {
         updatePassword(currentPassword: $c, newPassword: $n) { success message }
       }`,
      {
        token: h.tokenFor(user),
        variables: { c: "old-password", n: "new-password" },
      },
    );
    expect(right.data?.updatePassword.success).toBe(true);

    const login = await h.execute<{ login: { token: string } }>(
      `mutation L($email: String!, $password: String!) {
         login(email: $email, password: $password) { token }
       }`,
      { variables: { email: user.email, password: "new-password" } },
    );
    expect(login.errors).toEqual([]);
  });

  it("starts a streak at 1 and does not double-count the same day", async () => {
    const user = await h.createUser();
    const mutation = `mutation S($userId: ID!) {
      updateLoginStreak(userId: $userId) { id consecutiveLoginDays lastLoginDate }
    }`;

    const first = await h.execute<{
      updateLoginStreak: {
        consecutiveLoginDays: number;
        lastLoginDate: string;
      };
    }>(mutation, { token: h.tokenFor(user), variables: { userId: user.id } });
    expect(first.data?.updateLoginStreak.consecutiveLoginDays).toBe(1);

    const second = await h.execute<{
      updateLoginStreak: { consecutiveLoginDays: number };
    }>(mutation, { token: h.tokenFor(user), variables: { userId: user.id } });
    expect(second.data?.updateLoginStreak.consecutiveLoginDays).toBe(1);
  });

  it("lets an admin update someone else's streak but not a plain user", async () => {
    const admin = await h.createUser({ role: "ADMIN" });
    const target = await h.createUser();
    const meddler = await h.createUser();
    const mutation = `mutation S($userId: ID!) {
      updateLoginStreak(userId: $userId) { id consecutiveLoginDays }
    }`;

    const byAdmin = await h.execute(mutation, {
      token: h.tokenFor(admin),
      variables: { userId: target.id },
    });
    expect(byAdmin.errors).toEqual([]);

    const byPeer = await h.execute(mutation, {
      token: h.tokenFor(meddler),
      variables: { userId: target.id },
    });
    expect(byPeer.errors[0]?.message).toMatch(/forbidden/i);
  });
});
