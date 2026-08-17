import { users, type UserRow } from "@quiz/db";
import type { GraphQLContext } from "../context";
import type { QuestionModel } from "../models";
import { displayName, toIso } from "../shared";
import { requireRole, QUESTION_EDITOR_ROLES } from "../auth/guards";
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

    /**
     * The answer key, refused in bulk to anyone who is not an editor.
     *
     * Flash cards fetch one question at a time and need the back of the card,
     * so a single fetch stays open to any signed-in user. Asking the list
     * query for it is a different thing — that is the entire bank's answers in
     * one response, which is what makes a score-ranked leaderboard farmable.
     * Editors keep it because /management edits it.
     */
    correctAnswer: (question: QuestionModel, _args, context) => {
      if (question.fromBulkList) {
        requireRole(context, QUESTION_EDITOR_ROLES);
      }
      return question.correctAnswer;
    },

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
