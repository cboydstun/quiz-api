import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "@quiz/db";
import { createHarness, type TestHarness } from "./harness";

const REGISTER = /* GraphQL */ `
  mutation RegisterUser($input: CreateUserInput!) {
    register(input: $input) {
      token
      user {
        id
        username
        email
        role
      }
    }
  }
`;

// The register page selects only `token`; the management page selects the
// whole user. Both must work against the same field.
const REGISTER_TOKEN_ONLY = /* GraphQL */ `
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
      user {
        id
        username
        email
        role
      }
    }
  }
`;

describe("authentication", () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  it("registers a user and returns a usable token", async () => {
    const res = await h.execute<{
      register: { token: string; user: { email: string; role: string } };
    }>(REGISTER, {
      variables: {
        input: {
          username: "newcomer",
          email: "newcomer@example.com",
          password: "password123",
          role: "USER",
        },
      },
    });

    expect(res.errors).toEqual([]);
    expect(res.data?.register.user.email).toBe("newcomer@example.com");
    expect(res.data?.register.user.role).toBe("USER");

    const me = await h.execute<{ me: { email: string } }>("{ me { email } }", {
      token: `Bearer ${res.data?.register.token}`,
    });
    expect(me.data?.me.email).toBe("newcomer@example.com");
  });

  it("supports the token-only selection the register page uses", async () => {
    const res = await h.execute<{ register: { token: string } }>(
      REGISTER_TOKEN_ONLY,
      {
        variables: {
          input: {
            username: "tokenonly",
            email: "tokenonly@example.com",
            password: "password123",
            role: "USER",
          },
        },
      },
    );

    expect(res.errors).toEqual([]);
    expect(res.data?.register.token).toBeTypeOf("string");
  });

  it("refuses to let an anonymous caller register themselves as an admin", async () => {
    const res = await h.execute(REGISTER, {
      variables: {
        input: {
          username: "sneaky",
          email: "sneaky@example.com",
          password: "password123",
          role: "ADMIN",
        },
      },
    });

    expect(res.errors[0]?.message).toMatch(/cannot assign a role/i);

    const [row] = await h.db
      .select()
      .from(users)
      .where(eq(users.email, "sneaky@example.com"));
    expect(row).toBeUndefined();
  });

  it("lets an admin create a user with an elevated role", async () => {
    const admin = await h.createUser({ role: "ADMIN" });

    const res = await h.execute<{ register: { user: { role: string } } }>(
      REGISTER,
      {
        token: h.tokenFor(admin),
        variables: {
          input: {
            username: "neweditor",
            email: "neweditor@example.com",
            password: "password123",
            role: "EDITOR",
          },
        },
      },
    );

    expect(res.errors).toEqual([]);
    expect(res.data?.register.user.role).toBe("EDITOR");
  });

  it("rejects a duplicate email", async () => {
    await h.createUser({ email: "taken@example.com", username: "takenname" });

    const res = await h.execute(REGISTER, {
      variables: {
        input: {
          username: "different",
          email: "taken@example.com",
          password: "password123",
          role: "USER",
        },
      },
    });

    expect(res.errors[0]?.message).toMatch(/already exists/i);
  });

  it("logs in with the right password", async () => {
    const user = await h.createUser({
      email: "login@example.com",
      username: "loginuser",
      password: "correct-horse",
    });

    const res = await h.execute<{ login: { user: { id: string } } }>(LOGIN, {
      variables: { email: "login@example.com", password: "correct-horse" },
    });

    expect(res.errors).toEqual([]);
    expect(res.data?.login.user.id).toBe(user.id);
  });

  it("gives the same message for a bad password and an unknown email", async () => {
    await h.createUser({ email: "real@example.com", username: "realuser" });

    const wrongPassword = await h.execute(LOGIN, {
      variables: { email: "real@example.com", password: "nope" },
    });
    const unknownEmail = await h.execute(LOGIN, {
      variables: { email: "ghost@example.com", password: "nope" },
    });

    // Identical wording, so login cannot be used to enumerate accounts.
    expect(wrongPassword.errors[0]?.message).toBe(
      unknownEmail.errors[0]?.message,
    );
    expect(wrongPassword.errors[0]?.message).toMatch(/invalid credentials/i);
  });

  it("never lets a Google-only account log in with a password", async () => {
    await h.createUser({
      email: "google@example.com",
      username: "googleuser",
      password: null,
    });

    const res = await h.execute(LOGIN, {
      variables: { email: "google@example.com", password: "" },
    });
    expect(res.errors[0]?.message).toMatch(/invalid credentials/i);
  });
});
