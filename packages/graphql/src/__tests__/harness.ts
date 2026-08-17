import { createTestDb } from "@quiz/db/testing";
import { users, type Database, type Role, type UserRow } from "@quiz/db";
import { createGraphQLServer } from "../server";
import { hashPassword } from "../auth/password";
import { signToken } from "../auth/jwt";

const ENDPOINT = "/v1/graphql";
const ORIGIN = "http://test.local";

// Byte-identical to what Apollo Client 4 sends, so the tests exercise the same
// content negotiation the browser will.
const APOLLO_ACCEPT =
  "application/graphql-response+json,application/json;q=0.9";

export interface GraphQLResponse<T = Record<string, unknown>> {
  status: number;
  contentType: string | null;
  data: T | null;
  errors: { message: string; extensions?: Record<string, unknown> }[];
}

export interface TestHarness {
  db: Database;
  /**
   * `token` is passed through verbatim, including "" — the client really does
   * send an empty Authorization header when logged out.
   */
  execute: <T = Record<string, unknown>>(
    query: string,
    options?: { variables?: Record<string, unknown>; token?: string },
  ) => Promise<GraphQLResponse<T>>;
  createUser: (overrides?: Partial<SeedUser>) => Promise<UserRow>;
  tokenFor: (user: UserRow) => string;
  close: () => Promise<void>;
}

export interface SeedUser {
  /** Nullable like the column: a Google sign-up never chose one. */
  username: string | null;
  email: string;
  password: string | null;
  role: Role;
  score: number;
}

let seq = 0;

export async function createHarness(): Promise<TestHarness> {
  process.env.JWT_SECRET ??= "test-secret";

  const { db, close } = await createTestDb();
  const yoga = createGraphQLServer({ db, graphqlEndpoint: ENDPOINT });

  async function execute<T>(
    query: string,
    options: { variables?: Record<string, unknown>; token?: string } = {},
  ): Promise<GraphQLResponse<T>> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: APOLLO_ACCEPT,
      authorization: options.token ?? "",
    };

    const response = await yoga.fetch(`${ORIGIN}${ENDPOINT}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables: options.variables ?? {} }),
    });

    const body = (await response.json()) as {
      data?: T;
      errors?: { message: string; extensions?: Record<string, unknown> }[];
    };

    return {
      status: response.status,
      contentType: response.headers.get("content-type"),
      data: body.data ?? null,
      errors: body.errors ?? [],
    };
  }

  async function createUser(
    overrides: Partial<SeedUser> = {},
  ): Promise<UserRow> {
    seq += 1;
    const seed: SeedUser = {
      username: `user${seq}`,
      email: `user${seq}@example.com`,
      password: "password123",
      role: "USER",
      score: 0,
      ...overrides,
    };

    const [created] = await db
      .insert(users)
      .values({
        username: seed.username,
        email: seed.email,
        password: seed.password ? await hashPassword(seed.password) : null,
        role: seed.role,
        score: seed.score,
      })
      .returning();

    if (!created) throw new Error("Failed to seed user");
    return created;
  }

  return {
    db,
    execute,
    createUser,
    tokenFor: (user) => `Bearer ${signToken(user)}`,
    close,
  };
}
