import { users, type UserRow } from "@quiz/db";
import type { GraphQLContext } from "../context";
import type { QuestionModel } from "../models";
import { displayName, toIso } from "../shared";
import { eq } from "drizzle-orm";
import type { Resolvers } from "../generated/types";

/**
 * Field resolvers shared by every query that returns a User or a Question.
 * Rows go out of the resolvers untouched; the shape conversions (nullable
 * username, Date -> ISO string) all happen here, in one place.
 */
export const typeResolvers: Resolvers = {
  User: {
    username: (user) => displayName(user),
    lastLoginDate: (user) => toIso(user.lastLoginDate),
    createdAt: (user) => user.createdAt.toISOString(),
    updatedAt: (user) => user.updatedAt.toISOString(),
  },

  Question: {
    createdAt: (question) => question.createdAt.toISOString(),
    updatedAt: (question) => question.updatedAt.toISOString(),

    createdBy: async (
      question: QuestionModel,
      _args,
      context: GraphQLContext,
    ): Promise<UserRow> => {
      // Populated by the joins in questions.ts for list and single fetches.
      if (question.creator) return question.creator;

      const [creator] = await context.db
        .select()
        .from(users)
        .where(eq(users.id, question.createdBy))
        .limit(1);

      if (!creator) {
        // The FK is ON DELETE RESTRICT, so this is unreachable short of
        // manual surgery on the database.
        throw new Error(`Question ${question.id} has no author`);
      }
      return creator;
    },
  },
};
