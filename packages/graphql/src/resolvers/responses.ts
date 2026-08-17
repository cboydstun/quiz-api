import { eq, inArray, sql } from "drizzle-orm";
import { questions } from "@quiz/db";
import type { Resolvers } from "../generated/types";
import { requireAuth, requireWithinRateLimit } from "../auth/guards";
import { PUBLIC_RULE, SUBMIT_RULE } from "../rate-limit";
import { badInput, notFound } from "../errors";

/** Matches the largest run the configuration screen offers. */
const MAX_GRADED_RUN = 200;

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
      await requireWithinRateLimit(context, "submit", SUBMIT_RULE);

      const [question] = await context.db
        .select()
        .from(questions)
        .where(eq(questions.id, questionId))
        .limit(1);

      if (!question) throw notFound("Question not found");

      // An answer that was never on offer cannot have been chosen by anyone
      // using the app. Without this the mutation is a free-text oracle: submit
      // guesses until one grades true, then submit the winner for points.
      if (!question.answers.includes(selectedAnswer)) {
        throw badInput("That answer is not one of the options");
      }

      const isCorrect = question.correctAnswer === selectedAnswer;

      /**
       * The streak moves here as well as in updateLoginStreak.
       *
       * It used to advance only when /profile was opened, so somebody who
       * answered questions every day and never visited their record had a
       * streak of zero. Expressed in SQL rather than read-modify-write because
       * a run fires these concurrently, and expressed as calendar-day
       * comparisons to match nextStreak(): same day is a no-op, yesterday
       * increments, anything older starts again at one.
       */
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
          consecutive_login_days = case
            when last_login_date is null then 1
            when last_login_date::date = now()::date then greatest(consecutive_login_days, 1)
            when last_login_date::date = (now() - interval '1 day')::date then consecutive_login_days + 1
            else 1
          end,
          last_login_date     = now(),
          updated_at          = now()
        where id = ${viewer._id}::uuid
          and exists (select 1 from response)
      `);

      return {
        success: true,
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      };
    },

    /**
     * A flash-card verdict, recorded but unscored.
     *
     * Before this, a whole deck worked through left no trace at all: the
     * verdicts lived in component state and a refresh erased them, so studying
     * never reached domain accuracy or the streak. It deliberately does not
     * touch `score` — points come from runs, and a card you flipped until you
     * knew it is not evidence of answering it cold.
     *
     * `selected_answer` carries the correct answer for a known card and an
     * empty string otherwise. Nothing reads that column for a review; the
     * verdict is `is_correct`.
     */
    recordReview: async (_parent, { questionId, known }, context) => {
      const viewer = requireAuth(context);
      await requireWithinRateLimit(context, "review", SUBMIT_RULE);

      const [question] = await context.db
        .select()
        .from(questions)
        .where(eq(questions.id, questionId))
        .limit(1);

      if (!question) throw notFound("Question not found");

      await context.db.execute(sql`
        with response as (
          insert into user_responses (user_id, question_id, selected_answer, is_correct)
          values (
            ${viewer._id}::uuid,
            ${question.id}::uuid,
            ${known ? question.correctAnswer : ""},
            ${known}
          )
          returning 1
        )
        update users set
          questions_answered  = questions_answered  + 1,
          questions_correct   = questions_correct   + ${known ? 1 : 0},
          questions_incorrect = questions_incorrect + ${known ? 0 : 1},
          consecutive_login_days = case
            when last_login_date is null then 1
            when last_login_date::date = now()::date then greatest(consecutive_login_days, 1)
            when last_login_date::date = (now() - interval '1 day')::date then consecutive_login_days + 1
            else 1
          end,
          last_login_date     = now(),
          updated_at          = now()
        where id = ${viewer._id}::uuid
          and exists (select 1 from response)
      `);

      return {
        success: true,
        isCorrect: known,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      };
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
      await requireWithinRateLimit(context, "grade", PUBLIC_RULE);

      if (answers.length > MAX_GRADED_RUN) {
        throw badInput(`A run cannot exceed ${MAX_GRADED_RUN} answers`);
      }

      const ids = [...new Set(answers.map((answer) => answer.questionId))];

      const rows = await context.db
        .select({
          id: questions.id,
          correctAnswer: questions.correctAnswer,
          explanation: questions.explanation,
        })
        .from(questions)
        .where(inArray(questions.id, ids));

      const byId = new Map(rows.map((row) => [row.id, row]));

      return answers.map((answer) => {
        const question = byId.get(answer.questionId);
        return {
          questionId: answer.questionId,
          // An id that is not in the bank grades as wrong rather than
          // throwing: one stale question must not fail the whole run.
          isCorrect: question?.correctAnswer === answer.selectedAnswer,
          correctAnswer: question?.correctAnswer ?? "",
          explanation: question?.explanation ?? null,
        };
      });
    },
  },
};
