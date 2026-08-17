import { asc, eq, sql } from "drizzle-orm";
import { questions, users } from "@quiz/db";
import type { Resolvers } from "../generated/types";
import {
  requireAuth,
  requireRole,
  requireSelfOrAdmin,
  USER_ADMIN_ROLES,
} from "../auth/guards";
import { hashPassword, verifyPassword } from "../auth/password";
import { badInput, forbidden, invalidToken, notFound } from "../errors";
import { findUserById } from "../shared";

const MIN_USERNAME_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 8;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
/** One page of the user list. The management table asks for far fewer. */
const MAX_USER_PAGE = 200;

/** Whole calendar days between two instants, ignoring the time of day. */
export function calendarDaysBetween(from: Date, to: Date): number {
  const startOfDay = (date: Date) =>
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return (startOfDay(to) - startOfDay(from)) / MS_PER_DAY;
}

/** Same day: unchanged. Yesterday: extend. Anything else: back to 1. */
export function nextStreak(
  current: number,
  daysSinceLastLogin: number,
): number {
  if (daysSinceLastLogin === 0) return current;
  if (daysSinceLastLogin === 1) return current + 1;
  return 1;
}

export const userResolvers: Resolvers = {
  Query: {
    me: async (_parent, _args, context) => {
      const viewer = requireAuth(context);
      const user = await findUserById(context.db, viewer._id);
      // A valid token for a deleted account: tell the client to drop it.
      if (!user) throw invalidToken("User not found");
      return user;
    },

    // The one query whose result set grows with signups, so it is the one that
    // has to be paged rather than left to return every column of every row.
    users: async (_parent, { limit, offset }, context) => {
      requireRole(context, USER_ADMIN_ROLES);
      return context.db
        .select()
        .from(users)
        .orderBy(asc(users.createdAt))
        .limit(Math.min(Math.max(limit ?? MAX_USER_PAGE, 1), MAX_USER_PAGE))
        .offset(Math.max(offset ?? 0, 0));
    },

    /**
     * Public, and only a count. The landing page advertises how many operators
     * there are and had the figure hardcoded; a number is not something worth
     * requiring a token for, and a token is not something the landing page has.
     */
    userCount: async (_parent, _args, context): Promise<number> => {
      const [row] = await context.db
        .select({ total: sql<number>`count(*)::int` })
        .from(users);
      return row?.total ?? 0;
    },

    user: async (_parent, { id }, context) => {
      requireSelfOrAdmin(context, id);
      return findUserById(context.db, id);
    },
  },

  Mutation: {
    changeUserRole: async (_parent, { userId, newRole }, context) => {
      requireRole(context, USER_ADMIN_ROLES);

      // Inherited rule: SUPER_ADMIN is only ever granted out of band.
      if (newRole === "SUPER_ADMIN") {
        throw forbidden("cannot change a role to SUPER_ADMIN");
      }

      const target = await findUserById(context.db, userId);
      if (!target) throw notFound("User not found");
      if (target.role === "SUPER_ADMIN") {
        throw forbidden("cannot change the role of a SUPER_ADMIN");
      }

      const [updated] = await context.db
        .update(users)
        .set({ role: newRole, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (!updated) throw notFound("User not found");
      return updated;
    },

    deleteUser: async (_parent, { userId }, context) => {
      requireRole(context, USER_ADMIN_ROLES);

      const target = await findUserById(context.db, userId);
      if (!target) throw notFound("User not found");
      if (target.role === "SUPER_ADMIN") {
        throw forbidden("cannot delete a SUPER_ADMIN");
      }

      // questions.created_by is ON DELETE RESTRICT, so authors cannot be
      // removed while their questions exist. Say so, rather than letting the
      // constraint surface as a masked "Unexpected error."
      const [authored] = await context.db
        .select({ id: questions.id })
        .from(questions)
        .where(eq(questions.createdBy, userId))
        .limit(1);

      if (authored) {
        throw forbidden(
          "cannot delete a user who still has questions; reassign or delete their questions first",
        );
      }

      await context.db.delete(users).where(eq(users.id, userId));
      return true;
    },

    updateUsername: async (_parent, { username }, context) => {
      const viewer = requireAuth(context);
      const trimmed = username.trim();

      if (trimmed.length < MIN_USERNAME_LENGTH) {
        throw badInput(
          `Username must be at least ${MIN_USERNAME_LENGTH} characters long`,
        );
      }

      const [taken] = await context.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, trimmed))
        .limit(1);

      if (taken && taken.id !== viewer._id) {
        throw badInput("Username is already taken");
      }

      const [updated] = await context.db
        .update(users)
        .set({ username: trimmed, updatedAt: new Date() })
        .where(eq(users.id, viewer._id))
        .returning();

      if (!updated) throw notFound("User not found");
      return updated;
    },

    updatePassword: async (
      _parent,
      { currentPassword, newPassword },
      context,
    ) => {
      const viewer = requireAuth(context);

      const user = await findUserById(context.db, viewer._id);
      if (!user) throw invalidToken("User not found");

      if (!(await verifyPassword(currentPassword, user.password))) {
        // Not an auth-token problem — the session is fine, the input is wrong.
        // Phrased so it cannot trip the client's logout matcher.
        throw badInput("Current password is incorrect");
      }
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        throw badInput(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
        );
      }

      await context.db
        .update(users)
        .set({
          password: await hashPassword(newPassword),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return { success: true, message: "Password updated successfully" };
    },

    updateLoginStreak: async (_parent, { userId }, context) => {
      requireSelfOrAdmin(context, userId);

      const user = await findUserById(context.db, userId);
      if (!user) throw notFound("User not found");

      const now = new Date();
      const days = user.lastLoginDate
        ? calendarDaysBetween(user.lastLoginDate, now)
        : Number.POSITIVE_INFINITY;

      const [updated] = await context.db
        .update(users)
        .set({
          consecutiveLoginDays: nextStreak(user.consecutiveLoginDays, days),
          lastLoginDate: now,
          updatedAt: now,
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updated) throw notFound("User not found");
      return updated;
    },
  },
};
