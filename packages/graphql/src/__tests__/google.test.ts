import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { eq } from "drizzle-orm";
import { users } from "@quiz/db";

// Stub the Google client so the OAuth code exchange is exercised without a
// network call. The mock must be declared before the modules under test load.
const getToken = vi.fn();
const verifyIdToken = vi.fn();
const generateAuthUrl = vi.fn(
  () => "https://accounts.google.com/o/oauth2/v2/auth?x=1",
);

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    getToken = getToken;
    verifyIdToken = verifyIdToken;
    generateAuthUrl = generateAuthUrl;
  },
}));

const { createHarness } = await import("./harness");
type Harness = Awaited<ReturnType<typeof createHarness>>;

function googleReturns(profile: { sub: string; email: string; name?: string }) {
  getToken.mockResolvedValue({ tokens: { id_token: "fake-id-token" } });
  verifyIdToken.mockResolvedValue({ getPayload: () => profile });
}

const AUTHENTICATE = /* GraphQL */ `
  mutation AuthenticateWithGoogle($code: String!) {
    authenticateWithGoogle(code: $code) {
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

describe("Google sign-in", () => {
  let h: Harness;

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/login";
    h = await createHarness();
  });
  afterAll(() => h.close());
  beforeEach(() => vi.clearAllMocks());

  it("hands out a consent URL without requiring a token", async () => {
    const res = await h.execute<{ getGoogleAuthUrl: { url: string } }>(
      "{ getGoogleAuthUrl { url } }",
    );
    expect(res.errors).toEqual([]);
    expect(res.data?.getGoogleAuthUrl.url).toContain("accounts.google.com");
  });

  it("creates a new account on first sign-in", async () => {
    googleReturns({
      sub: "google-1",
      email: "first@example.com",
      name: "First Person",
    });

    const res = await h.execute<{
      authenticateWithGoogle: {
        token: string;
        user: { email: string; role: string };
      };
    }>(AUTHENTICATE, { variables: { code: "auth-code" } });

    expect(res.errors).toEqual([]);
    expect(res.data?.authenticateWithGoogle.user.email).toBe(
      "first@example.com",
    );
    expect(res.data?.authenticateWithGoogle.user.role).toBe("USER");
  });

  /**
   * Google returns the account holder's real full name. Storing it as the
   * username publishes it — /leaderboard is public, and an editor's name is
   * shown to every signed-in user on a flash card. A name is something a user
   * chooses through updateUsername; until then they get the stand-in.
   */
  it("never stores the name Google supplies", async () => {
    googleReturns({
      sub: "google-2",
      email: "realname@example.com",
      name: "Ada Lovelace",
    });

    const res = await h.execute<{
      authenticateWithGoogle: { user: { id: string; username: string } };
    }>(AUTHENTICATE, { variables: { code: "code-a" } });

    expect(res.errors).toEqual([]);
    const user = res.data!.authenticateWithGoogle.user;
    expect(user.username).toMatch(/^Operator [0-9A-F]{4}$/);
    expect(JSON.stringify(res.data)).not.toContain("Ada");
    expect(JSON.stringify(res.data)).not.toContain("Lovelace");

    // Not merely absent from the response — absent from the row.
    const [row] = await h.db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, user.id));
    expect(row?.username).toBeNull();
  });

  it("gives two people with the same Google display name distinct names", async () => {
    googleReturns({
      sub: "google-3",
      email: "twin-a@example.com",
      name: "Same Name",
    });
    const first = await h.execute<{
      authenticateWithGoogle: { user: { username: string } };
    }>(AUTHENTICATE, { variables: { code: "code-b" } });

    googleReturns({
      sub: "google-4",
      email: "twin-b@example.com",
      name: "Same Name",
    });
    const second = await h.execute<{
      authenticateWithGoogle: { user: { username: string } };
    }>(AUTHENTICATE, { variables: { code: "code-c" } });

    expect(second.errors).toEqual([]);
    expect(second.data?.authenticateWithGoogle.user.username).not.toBe(
      first.data?.authenticateWithGoogle.user.username,
    );
  });

  it("links Google to an existing password account with the same email", async () => {
    const existing = await h.createUser({
      email: "linkme@example.com",
      username: "linkme",
    });

    googleReturns({
      sub: "google-5",
      email: "linkme@example.com",
      name: "Link Me",
    });
    const res = await h.execute<{
      authenticateWithGoogle: { user: { id: string } };
    }>(AUTHENTICATE, { variables: { code: "code-link" } });

    // Same account, not a duplicate.
    expect(res.data?.authenticateWithGoogle.user.id).toBe(existing.id);
  });

  it("surfaces a failed code exchange as an authentication error", async () => {
    getToken.mockRejectedValue(new Error("invalid_grant"));

    const res = await h.execute(AUTHENTICATE, {
      variables: { code: "stale-code" },
    });
    expect(res.errors[0]?.message).toMatch(/unauthenticated/i);
    // The client clears its token and restarts the flow rather than looping.
    expect(res.errors[0]?.message).toContain("invalid_grant");
  });
});
