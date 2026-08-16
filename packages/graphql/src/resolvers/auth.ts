import { eq, or } from "drizzle-orm";
import { users } from "@quiz/db";
import type { Resolvers } from "../generated/types";
import { buildAuthUrl, exchangeCode } from "../auth/google";
import { signToken } from "../auth/jwt";
import { hashPassword, verifyPassword } from "../auth/password";
import { badInput, unauthenticated } from "../errors";
import { uniqueUsername } from "../shared";

const MIN_PASSWORD_LENGTH = 8;
const MIN_USERNAME_LENGTH = 3;

export const authResolvers: Resolvers = {
  Query: {
    getGoogleAuthUrl: () => ({ url: buildAuthUrl() }),
  },

  Mutation: {
    register: async (_parent, { input }, context) => {
      const email = input.email.trim().toLowerCase();
      const username = input.username.trim();

      if (username.length < MIN_USERNAME_LENGTH) {
        throw badInput(
          `Username must be at least ${MIN_USERNAME_LENGTH} characters long`,
        );
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

      const [created] = await context.db
        .insert(users)
        .values({
          username,
          email,
          password: await hashPassword(input.password),
          role,
        })
        .returning();

      if (!created) throw new Error("Failed to create user");

      return { token: signToken(created), user: created };
    },

    login: async (_parent, { email, password }, context) => {
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

      const username = await uniqueUsername(
        context.db,
        profile.name ?? profile.email.split("@")[0] ?? "user",
      );

      const [created] = await context.db
        .insert(users)
        .values({
          googleId: profile.googleId,
          email: profile.email,
          username,
          role: "USER",
        })
        .returning();

      if (!created) throw new Error("Failed to create user");
      return { token: signToken(created), user: created };
    },
  },
};
