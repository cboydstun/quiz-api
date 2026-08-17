import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness, type TestHarness } from "./harness";

/**
 * The executable version of the frontend's string matching. These assertions
 * are not stylistic — apps/web branches on these exact messages:
 *
 *   ApolloWrapper.tsx  -> /unauthorized|unauthenticated/i clears the token and
 *                         hard-redirects to /login
 *   quiz/page.tsx      -> the literal "Authorization header must be provided"
 *
 * If one of these fails, the symptom in the browser is either a user who
 * cannot stay logged in or a user stuck with a dead token.
 */
describe("auth error contract", () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  it("returns HTTP 200 with a GraphQL error, not a 4xx", async () => {
    const res = await h.execute("{ me { id } }");

    // Apollo runs errorPolicy: "all" and expects to parse data + errors.
    expect(res.status).toBe(200);
    expect(res.errors).toHaveLength(1);
  });

  it("negotiates the content type Apollo Client 4 asks for", async () => {
    const res = await h.execute("{ me { id } }");
    expect(res.contentType).toContain("application/graphql-response+json");
  });

  it('says exactly "Authorization header must be provided" for an empty header', async () => {
    const res = await h.execute("{ me { id } }", { token: "" });
    expect(res.errors[0]?.message).toBe(
      "Authorization header must be provided",
    );
  });

  it("marks a garbage token as unauthenticated so the client clears it", async () => {
    const res = await h.execute("{ me { id } }", { token: "Bearer nonsense" });
    expect(res.errors[0]?.message).toMatch(/unauthenticated/i);
  });

  it("rejects a token that is not a Bearer token", async () => {
    const res = await h.execute("{ me { id } }", { token: "Basic abc123" });
    expect(res.errors[0]?.message).toContain("Bearer");
  });

  it("does NOT log out an authenticated user whose permissions fall short", async () => {
    const editor = await h.createUser({ role: "EDITOR" });
    const res = await h.execute("{ users { id } }", {
      token: h.tokenFor(editor),
    });

    expect(res.errors[0]?.message).toMatch(/forbidden/i);
    // The critical negative assertion: an EDITOR denied an ADMIN action is
    // still logged in. Saying "Unauthorized" here would delete their token.
    expect(res.errors[0]?.message).not.toMatch(/unauthorized|unauthenticated/i);
  });

  /**
   * The one authentication failure that is not a dead token. The message is
   * deliberately still "Unauthenticated: …" — it says nothing about whether
   * the address exists, which is the point — so the frontend cannot tell this
   * apart from an expired session by the string alone. ApolloWrapper.tsx
   * therefore exempts the Login operation by name rather than by message; this
   * test pins the wording that exemption is written against.
   */
  it("reports a wrong password as unauthenticated without naming the cause", async () => {
    const user = await h.createUser({ password: "correct-horse" });
    const res = await h.execute(
      `mutation Login($email: String!, $password: String!) {
         login(email: $email, password: $password) { token }
       }`,
      { variables: { email: user.email, password: "wrong-password" } },
    );

    expect(res.errors[0]?.message).toMatch(/unauthenticated/i);
    // Must not distinguish "no such account" from "wrong password".
    expect(res.errors[0]?.message).not.toMatch(/email|username|exist/i);
  });

  it("masks unexpected errors instead of leaking internals", async () => {
    // A syntactically valid query for a field that does not exist is a
    // validation error, which must still not leak a stack trace.
    const res = await h.execute("{ definitelyNotAField }");
    expect(JSON.stringify(res.errors)).not.toMatch(/postgres|neon|password/i);
  });
});
