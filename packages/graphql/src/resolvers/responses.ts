import { eq, sql } from "drizzle-orm";
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
  },
};
