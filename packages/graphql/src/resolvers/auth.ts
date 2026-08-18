import { eq, or } from "drizzle-orm";
import { users } from "@quiz/db";
import type { Resolvers } from "../generated/types";
import { buildAuthUrl, exchangeCode } from "../auth/google";
import { signToken } from "../auth/jwt";
import { hashPassword, verifyPassword } from "../auth/password";
import { badInput, unauthenticated } from "../errors";
import { requireWithinRateLimit } from "../auth/guards";
import { AUTH_RULE } from "../rate-limit";

const MIN_PASSWORD_LENGTH = 8;
const MIN_USERNAME_LENGTH = 3;

/**
 * Deliberately permissive: something before an @, something after it, a dot in
 * the domain, no spaces. Anything stricter rejects addresses that genuinely
 * work. The client's type="email" is not a check — it is trivially bypassed by
 * anything that is not a browser — and without this "a" registered fine.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Postgres unique_violation. The check-then-insert above cannot be atomic —
 * neon-http has no transactions — so two simultaneous registrations for the
 * same address both pass the check and the loser hits the constraint. Yoga
 * masks anything that is not a GraphQLError, so without this the second caller
 * is told "Unexpected error." instead of what actually happened.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export const authResolvers: Resolvers = {
  Query: {
    getGoogleAuthUrl: () => ({ url: buildAuthUrl() }),
  },

  Mutation: {
    register: async (_parent, { input }, context) => {
      await requireWithinRateLimit(context, "register", AUTH_RULE);

      const email = input.email.trim().toLowerCase();
      const username = input.username.trim();

      if (username.length < MIN_USERNAME_LENGTH) {
        throw badInput(
          `Username must be at least ${MIN_USERNAME_LENGTH} characters long`,
        );
      }
      if (!EMAIL_PATTERN.test(email)) {
        throw badInput("Enter a valid email address");
      }
      if (input.password.length < MIN_PASSWORD_LENGTH) {
        throw badInput(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
        );
      }

      // The previous backend trusted `input.role` from anonymous callers,
      // which let anyone self-register as an ADMIN. A role is now honoured
      // only when an existing admin is the one creating the account (the
      // management page's use of this same mutation).
      let role: "USER" | "EDITOR" | "ADMIN" | "SUPER_ADMIN" = "USER";
      if (input.role && input.role !== "USER") {
        // Read the viewer directly rather than going through requireAuth: an
        // anonymous caller asking for a role should get "you may not do that",
        // not an authentication error that makes the client drop its token.
        const viewer = context.viewer;
        if (viewer?.role !== "ADMIN" && viewer?.role !== "SUPER_ADMIN") {
          throw badInput("Cannot assign a role during self-registration");
        }
        role = input.role;
      }

      const [existing] = await context.db
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.email, email), eq(users.username, username)))
        .limit(1);

      if (existing) {
        throw badInput("Username or email already exists");
      }

      let created;
      try {
        [created] = await context.db
          .insert(users)
          .values({
            username,
            email,
            password: await hashPassword(input.password),
            role,
          })
          .returning();
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw badInput("Username or email already exists");
        }
        throw error;
      }

      if (!created) throw new Error("Failed to create user");

      return { token: signToken(created), user: created };
    },

    login: async (_parent, { email, password }, context) => {
      await requireWithinRateLimit(context, "login", AUTH_RULE);

      const [user] = await context.db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1);

      // One message for both branches so the endpoint cannot be used to
      // enumerate which email addresses have accounts.
      const invalid = () =>
        unauthenticated("Unauthenticated: Invalid credentials");

      if (!user) throw invalid();
      if (!(await verifyPassword(password, user.password))) throw invalid();

      return { token: signToken(user), user };
    },

    authenticateWithGoogle: async (_parent, { code }, context) => {
      await requireWithinRateLimit(context, "google", AUTH_RULE);

      let profile;
      try {
        profile = await exchangeCode(code);
      } catch (error) {
        throw unauthenticated(
          `Unauthenticated: failed to authenticate with Google: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      const [existing] = await context.db
        .select()
        .from(users)
        .where(
          or(
            eq(users.googleId, profile.googleId),
            eq(users.email, profile.email),
          ),
        )
        .limit(1);

      if (existing) {
        // Linking an existing password account to Google on first Google login.
        if (existing.googleId) {
          return { token: signToken(existing), user: existing };
        }

        const [linked] = await context.db
          .update(users)
          .set({ googleId: profile.googleId, updatedAt: new Date() })
          .where(eq(users.id, existing.id))
          .returning();

        if (!linked) throw new Error("Failed to link Google account");
        return { token: signToken(linked), user: linked };
      }

      // No username. Google hands back the account holder's real full name,
      // and writing it here publishes it: /leaderboard is public, and an
      // editor's name is shown to every signed-in user on a flash card. A
      // name is something a user chooses, through updateUsername — until they
      // do, they are the id-derived stand-in from displayName().
      const [created] = await context.db
        .insert(users)
        .values({
          googleId: profile.googleId,
          email: profile.email,
          username: null,
          role: "USER",
        })
        .returning();

      if (!created) throw new Error("Failed to create user");
      return { token: signToken(created), user: created };
    },
  },
};
