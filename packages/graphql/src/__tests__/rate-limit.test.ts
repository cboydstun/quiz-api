import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createHarness, type TestHarness } from "./harness";
import { resetRateLimits } from "../rate-limit";

const REGISTER = /* GraphQL */ `
  mutation RegisterUser($input: CreateUserInput!) {
    register(input: $input) {
      token
    }
  }
`;

const LOGIN = /* GraphQL */ `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
    }
  }
`;

/**
 * register and login each run a bcrypt cost-10 hash and neither needs a token,
 * so an unthrottled loop is a compute bill as much as an abuse problem.
 */
describe("rate limiting", () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  beforeEach(() => resetRateLimits());

  it("stops a login loop and says when to come back", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 15 }, () =>
        h.execute(LOGIN, {
          variables: { email: "nobody@example.com", password: "wrong" },
        }),
      ),
    );

    const throttled = attempts.filter((res) =>
      /too many requests/i.test(res.errors[0]?.message ?? ""),
    );

    expect(throttled.length).toBeGreaterThan(0);
    expect(throttled[0]?.errors[0]?.message).toMatch(
      /try again in \d+ second/i,
    );
  });

  /**
   * The message must not trip the client's logout matcher. Throttling someone
   * and signing them out at the same time is two problems where there was one.
   */
  it("does not phrase the refusal as an auth failure", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        h.execute(REGISTER, {
          variables: {
            input: {
              username: `flood${i}`,
              email: `flood${i}@example.com`,
              password: "password123",
            },
          },
        }),
      ),
    );

    const throttled = attempts
      .map((res) => res.errors[0]?.message ?? "")
      .filter((message) => /too many requests/i.test(message));

    expect(throttled.length).toBeGreaterThan(0);
    for (const message of throttled) {
      expect(message).not.toMatch(/unauthorized|unauthenticated/i);
    }
  });

  it("lets a normal number of attempts through untouched", async () => {
    const res = await h.execute(REGISTER, {
      variables: {
        input: {
          username: "normaluser",
          email: "normal@example.com",
          password: "password123",
        },
      },
    });

    expect(res.errors).toEqual([]);
  });
});
