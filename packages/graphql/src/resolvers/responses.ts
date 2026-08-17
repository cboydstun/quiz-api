import { eq, inArray, sql } from "drizzle-orm";
import { questions } from "@quiz/db";
import type { Resolvers } from "../generated/types";
import { requireAuth } from "../auth/guards";
import { notFound } from "../errors";

export const responseResolvers: Resolvers = {
  Mutation: {
    /**
     * The quiz page submits every answered question at once through
     * Promise.all, so several of these run concurrently for the same user.
     *
     * The write is a single statement for two reasons: the counters are
     * relative increments rather than read-modify-write (so concurrent
     * submissions cannot clobber each other), and the neon-http driver has no
     * transactions — the response row and the counter bump have to land or
     * fail together within one statement or not at all.
     */
    submitAnswer: async (_parent, { questionId, selectedAnswer }, context) => {
      const viewer = requireAuth(context);

      const [question] = await context.db
        .select()
        .from(questions)
        .where(eq(questions.id, questionId))
        .limit(1);

      if (!question) throw notFound("Question not found");

      const isCorrect = question.correctAnswer === selectedAnswer;

      await context.db.execute(sql`
        with response as (
          insert into user_responses (user_id, question_id, selected_answer, is_correct)
          values (
            ${viewer._id}::uuid,
            ${question.id}::uuid,
            ${selectedAnswer},
            ${isCorrect}
          )
          returning 1
        )
        update users set
          questions_answered  = questions_answered  + 1,
          questions_correct   = questions_correct   + ${isCorrect ? 1 : 0},
          questions_incorrect = questions_incorrect + ${isCorrect ? 0 : 1},
          score               = score               + ${isCorrect ? question.points : 0},
          updated_at          = now()
        where id = ${viewer._id}::uuid
          and exists (select 1 from response)
      `);

      return { success: true, isCorrect };
    },

    /**
     * Grades a whole run in one round trip and writes nothing.
     *
     * Public: without it a signed-out visitor can play the run `sampleQuestions`
     * serves but never learn how they did, which is the moment the sign-up
     * prompt has to land on. Nothing here touches `user_responses` or any
     * counter — recording a run is what `submitAnswer` is for, and that still
     * requires a token.
     *
     * One query for the whole set rather than one per answer: this is the
     * anonymous path, so it is also the unauthenticated-traffic path, and it
     * should cost a single round trip no matter how long the run was.
     */
    gradeAnswers: async (_parent, { answers }, context) => {
      if (answers.length === 0) return [];

      const ids = [...new Set(answers.map((answer) => answer.questionId))];

      const rows = await context.db
        .select({
          id: questions.id,
          correctAnswer: questions.correctAnswer,
        })
        .from(questions)
        .where(inArray(questions.id, ids));

      const keyById = new Map(rows.map((row) => [row.id, row.correctAnswer]));

      return answers.map((answer) => ({
        questionId: answer.questionId,
        // An id that is not in the bank grades as wrong rather than throwing:
        // one stale question must not fail the whole run.
        isCorrect: keyById.get(answer.questionId) === answer.selectedAnswer,
      }));
    },
  },
};
