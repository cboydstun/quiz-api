import { asc, eq, isNotNull, sql } from "drizzle-orm";
import { questions, users } from "@quiz/db";
import type { Resolvers } from "../generated/types";
import {
  requireAuth,
  requireRole,
  QUESTION_EDITOR_ROLES,
} from "../auth/guards";
import { badInput, notFound } from "../errors";
import type { QuestionModel } from "../models";

/** Matches the ten-item run the landing page offers. */
const DEFAULT_RUN_SIZE = 10;
/** The "All" option on the run configuration screen. */
const MAX_RUN_SIZE = 200;

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

    /**
     * The run feed. Public, so the ten-item run the landing page advertises
     * actually works without an account, and randomised, because the bank's
     * own `createdAt` order made every run identical: the same first ten rows
     * for every visitor, every time, drawn from only the two oldest domains.
     *
     * Selects columns explicitly rather than the whole row — `correctAnswer`
     * must not leave the server on this path, and `RunQuestion` has no field
     * for it either way.
     */
    sampleQuestions: async (_parent, { limit, domain }, context) => {
      const size = Math.min(
        Math.max(limit ?? DEFAULT_RUN_SIZE, 1),
        MAX_RUN_SIZE,
      );

      return context.db
        .select({
          id: questions.id,
          prompt: questions.prompt,
          questionText: questions.questionText,
          answers: questions.answers,
          hint: questions.hint,
          points: questions.points,
          domain: questions.domain,
        })
        .from(questions)
        .where(domain ? eq(questions.domain, domain) : undefined)
        .orderBy(sql`random()`)
        .limit(size);
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
