import { asc, eq, isNotNull } from "drizzle-orm";
import { questions, users } from "@quiz/db";
import type { Resolvers } from "../generated/types";
import {
  requireAuth,
  requireRole,
  QUESTION_EDITOR_ROLES,
} from "../auth/guards";
import { badInput, notFound } from "../errors";
import type { QuestionModel } from "../models";

/**
 * The answer list must actually contain the correct answer, or the question is
 * unanswerable and `submitAnswer` can never return isCorrect: true.
 */
function assertAnswerable(answers: string[], correctAnswer: string): void {
  if (answers.length < 2) {
    throw badInput("A question needs at least two answers");
  }
  if (!answers.includes(correctAnswer)) {
    throw badInput("The correct answer must be one of the answers");
  }
}

export const questionResolvers: Resolvers = {
  Query: {
    // Joined rather than resolved per row: `createdBy { id username }` on a
    // list of questions would otherwise be one query per question.
    questions: async (
      _parent,
      { domain },
      context,
    ): Promise<QuestionModel[]> => {
      requireAuth(context);

      const rows = await context.db
        .select({ question: questions, creator: users })
        .from(questions)
        .innerJoin(users, eq(questions.createdBy, users.id))
        .where(domain ? eq(questions.domain, domain) : undefined)
        .orderBy(asc(questions.createdAt));

      return rows.map((row) => ({ ...row.question, creator: row.creator }));
    },

    // Drives the flash-card domain filter. Unclassified questions have no
    // domain to offer, so they contribute nothing here.
    questionDomains: async (_parent, _args, context): Promise<string[]> => {
      requireAuth(context);

      const rows = await context.db
        .selectDistinct({ domain: questions.domain })
        .from(questions)
        .where(isNotNull(questions.domain))
        .orderBy(asc(questions.domain));

      return rows
        .map((row) => row.domain)
        .filter((domain): domain is string => domain !== null);
    },

    question: async (
      _parent,
      { id },
      context,
    ): Promise<QuestionModel | null> => {
      requireAuth(context);

      const [row] = await context.db
        .select({ question: questions, creator: users })
        .from(questions)
        .innerJoin(users, eq(questions.createdBy, users.id))
        .where(eq(questions.id, id))
        .limit(1);

      return row ? { ...row.question, creator: row.creator } : null;
    },
  },

  Mutation: {
    createQuestion: async (_parent, { input }, context) => {
      const viewer = requireRole(context, QUESTION_EDITOR_ROLES);
      assertAnswerable(input.answers, input.correctAnswer);

      const [created] = await context.db
        .insert(questions)
        .values({
          prompt: input.prompt,
          questionText: input.questionText,
          answers: input.answers,
          correctAnswer: input.correctAnswer,
          // The client sends "" for an empty hint; store that as absent.
          hint: input.hint?.trim() ? input.hint.trim() : null,
          points: input.points ?? 1,
          domain: input.domain?.trim() ? input.domain.trim() : null,
          createdBy: viewer._id,
        })
        .returning();

      if (!created) throw new Error("Failed to create question");
      return created;
    },

    updateQuestion: async (_parent, { id, input }, context) => {
      requireRole(context, QUESTION_EDITOR_ROLES);
      assertAnswerable(input.answers, input.correctAnswer);

      const [updated] = await context.db
        .update(questions)
        .set({
          prompt: input.prompt,
          questionText: input.questionText,
          answers: input.answers,
          correctAnswer: input.correctAnswer,
          hint: input.hint?.trim() ? input.hint.trim() : null,
          points: input.points ?? 1,
          domain: input.domain?.trim() ? input.domain.trim() : null,
          updatedAt: new Date(),
        })
        .where(eq(questions.id, id))
        .returning();

      if (!updated) throw notFound("Question not found");
      return updated;
    },

    deleteQuestion: async (_parent, { id }, context) => {
      requireRole(context, QUESTION_EDITOR_ROLES);

      const deleted = await context.db
        .delete(questions)
        .where(eq(questions.id, id))
        .returning({ id: questions.id });

      if (deleted.length === 0) throw notFound("Question not found");
      return true;
    },
  },
};
